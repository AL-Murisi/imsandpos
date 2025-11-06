// app/actions/cashier.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { logActivity } from "./activitylogs";
import { Prisma } from "@prisma/client";

type CartItem = {
  id: string;
  sku: string;
  name: string;
  selectedQty: number;
  sellingUnit: "unit" | "packet" | "carton";
  unitsPerPacket: number;
  packetsPerCarton: number;
  pricePerUnit?: number;
  pricePerPacket?: number;
  pricePerCarton?: number;
  warehouseId: string;
};

type SaleData = {
  cart: CartItem[];
  totalBeforeDiscount: number;
  totalDiscount: number;
  totalAfterDiscount: number;
  cashierId: string;
  customerId?: string;
  saleNumber: string;
  receivedAmount: number;
};
export async function processSale(data: any, companyId: string) {
  const {
    cart,
    totalBeforeDiscount,
    totalDiscount,
    totalAfterDiscount,
    cashierId,
    customerId,
    saleNumber,
    receivedAmount,
  } = data;

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Create the main Sale record
      const sale = await tx.sale.create({
        data: {
          companyId,
          saleNumber,
          customerId,
          cashierId,
          taxAmount: 0,
          sale_type: "sale",
          status: "completed",
          subtotal: totalBeforeDiscount,
          discountAmount: totalDiscount,
          totalAmount: totalAfterDiscount,
          amountPaid: receivedAmount,
          amountDue: Math.max(0, totalAfterDiscount - receivedAmount),
          paymentStatus:
            receivedAmount >= totalAfterDiscount ? "paid" : "partial",
        },
      });

      // ✅ Helper function to convert selling unit to base units
      function convertToBaseUnits(
        qty: number,
        sellingUnit: string,
        unitsPerPacket: number,
        packetsPerCarton: number,
      ): number {
        if (sellingUnit === "unit") return qty;
        if (sellingUnit === "packet") return qty * unitsPerPacket;
        if (sellingUnit === "carton")
          return qty * unitsPerPacket * packetsPerCarton;
        return qty;
      }

      // 🚀 OPTIMIZATION 1: Batch fetch all inventories at once
      const productIds = cart.map((item: any) => item.id);
      const warehouseIds = cart.map((item: any) => item.warehouseId);

      const inventories = await tx.inventory.findMany({
        where: {
          companyId,
          productId: { in: productIds },
          warehouseId: { in: warehouseIds },
        },
      });

      // Create a map for quick lookup
      const inventoryMap = new Map(
        inventories.map((inv) => [`${inv.productId}-${inv.warehouseId}`, inv]),
      );

      // 🚀 OPTIMIZATION 2: Prepare all operations in parallel arrays
      const saleItemsData = [];
      const stockMovementsData = [];
      const inventoryUpdates = [];

      // Process all items and prepare batch operations
      for (const item of cart) {
        const quantityInUnits = convertToBaseUnits(
          item.selectedQty,
          item.sellingUnit,
          item.unitsPerPacket || 1,
          item.packetsPerCarton || 1,
        );

        const inventoryKey = `${item.id}-${item.warehouseId}`;
        const inventory = inventoryMap.get(inventoryKey);

        if (!inventory || inventory.availableQuantity < quantityInUnits) {
          throw new Error(
            `Insufficient stock for ${item.name}. Available: ${inventory?.availableQuantity || 0}, Requested: ${quantityInUnits}.`,
          );
        }

        const newStock = inventory.stockQuantity - quantityInUnits;
        const newAvailable = inventory.availableQuantity - quantityInUnits;

        // Get the correct unit price
        let unitPrice = 0;
        if (item.sellingUnit === "unit") {
          unitPrice = item.pricePerUnit || 0;
        } else if (item.sellingUnit === "packet") {
          unitPrice = item.pricePerPacket || 0;
        } else if (item.sellingUnit === "carton") {
          unitPrice = item.pricePerCarton || 0;
        }

        const totalPrice = unitPrice * item.selectedQty;

        // Prepare data for batch operations
        saleItemsData.push({
          companyId,
          saleId: sale.id,
          productId: item.id,
          quantity: item.selectedQty,
          sellingUnit: item.sellingUnit,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
        });

        stockMovementsData.push({
          companyId,
          productId: item.id,
          warehouseId: item.warehouseId,
          userId: cashierId,
          movementType: "صادر",
          quantity: quantityInUnits,
          reason: "بيع",
          quantityBefore: inventory.stockQuantity,
          quantityAfter: newStock,
          referenceType: "بيع",
          referenceId: sale.id,
        });

        inventoryUpdates.push({
          where: {
            companyId_productId_warehouseId: {
              companyId,
              productId: item.id,
              warehouseId: item.warehouseId,
            },
          },
          data: {
            stockQuantity: newStock,
            availableQuantity: newAvailable,
            status:
              newAvailable <= inventory.reorderLevel
                ? "low"
                : newAvailable === 0
                  ? "out_of_stock"
                  : "available",
          },
        });
      }

      // 🚀 OPTIMIZATION 3: Execute all operations in parallel
      await Promise.all([
        // Batch create sale items
        tx.saleItem.createMany({ data: saleItemsData }),

        // Batch create stock movements
        tx.stockMovement.createMany({ data: stockMovementsData }),

        // Batch update inventories
        ...inventoryUpdates.map((update) => tx.inventory.update(update)),
      ]);

      // 7. Update Customer Balance (if applicable)
      const customerUpdates = [];

      if (customerId && totalAfterDiscount > receivedAmount) {
        const amountDue = totalAfterDiscount - receivedAmount;
        customerUpdates.push(
          tx.customer.update({
            where: { id: customerId, companyId },
            data: {
              outstandingBalance: { increment: amountDue },
            },
          }),
        );
      }

      if (customerId && receivedAmount > totalAfterDiscount) {
        const change = receivedAmount - totalAfterDiscount;
        customerUpdates.push(
          tx.customer.update({
            where: { id: customerId, companyId },
            data: { balance: { increment: change } },
          }),
        );
      }

      // 8. Create Payment record (if amount received)
      if (receivedAmount > 0) {
        customerUpdates.push(
          tx.payment.create({
            data: {
              companyId,
              saleId: sale.id,
              cashierId,
              customerId,
              paymentMethod: "cash",
              payment_type: "sale_payment",
              amount: receivedAmount,
              status: "completed",
            },
          }),
        );
      }

      // Execute customer updates and payment in parallel
      if (customerUpdates.length > 0) {
        await Promise.all(customerUpdates);
      }

      // 9. Log Activity (don't await - fire and forget for speed)
      logActivity(
        cashierId,
        companyId,
        "أمين الصندوق", // cashier
        "قام ببيع منتج", // sells a product
        "889", // (keep as is, transaction or code)
        "وكيل المستخدم",
      ).catch(console.error); // Handle errors silently

      // 10. Prepare response
      const saleForClient = {
        ...sale,
        taxAmount: sale.taxAmount.toString(),
        subtotal: sale.subtotal.toString(),
        discountAmount: sale.discountAmount.toString(),
        totalAmount: sale.totalAmount.toString(),
        amountPaid: sale.amountPaid.toString(),
        amountDue: sale.amountDue.toString(),
      };

      return { message: "Sale processed successfully", sale: saleForClient };
    },
    {
      timeout: 20000,
      maxWait: 5000, // Add maxWait to prevent long queue times
    },
  );

  revalidatePath("/cashiercontrol");

  return result;
}

export async function getAllActiveProductsForSale(
  where: Prisma.ProductWhereInput,
  companyId: string,
  searchQuery?: string,
) {
  const combinedWhere: Prisma.ProductWhereInput = {
    ...where,
    companyId,
    isActive: true,
    inventory: {
      some: { availableQuantity: { gt: 0 } },
    },
  };

  if (searchQuery) {
    combinedWhere.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { sku: { contains: searchQuery, mode: "insensitive" } },
      { barcode: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const [activeProducts, warehouses] = await Promise.all([
    prisma.product.findMany({
      where: combinedWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        type: true,
        pricePerUnit: true,
        pricePerPacket: true,
        pricePerCarton: true,
        packetsPerCarton: true,
        unitsPerPacket: true,
        warehouseId: true,
        inventory: { select: { availableQuantity: true } },
      },
      take: 100,
    }),
    prisma.warehouse.findMany({ select: { id: true, name: true } }),
  ]);

  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

  function convertFromBaseUnit(product: any, availableUnits: number) {
    const unitsPerPacket = product.unitsPerPacket || 1;
    const packetsPerCarton = product.packetsPerCarton || 1;

    const availablePackets = Number(
      (availableUnits / unitsPerPacket).toFixed(2),
    );
    const availableCartons = Number(
      (availablePackets / packetsPerCarton).toFixed(2),
    );

    return { availablePackets, availableCartons };
  }

  return activeProducts.map((product) => {
    const availableUnits = product.inventory[0]?.availableQuantity ?? 0;
    const { availablePackets, availableCartons } = convertFromBaseUnit(
      product,
      availableUnits,
    );

    // ✅ Only return quantities that are actually sold
    let finalAvailableUnits = 0;
    let finalAvailablePackets = 0;
    let finalAvailableCartons = 0;

    if (product.type === "full") {
      // Sell all three levels
      finalAvailableUnits = availableUnits;
      finalAvailablePackets = availablePackets;
      finalAvailableCartons = availableCartons;
    } else if (product.type === "cartonUnit") {
      // Only sell units and cartons, hide packets
      finalAvailableUnits = availableUnits;
      finalAvailableCartons = availableCartons;
      finalAvailablePackets = 0; // ✅ Don't show packets
    } else if (product.type === "cartonOnly") {
      // Only sell cartons, hide units and packets
      finalAvailableCartons = availableCartons;
      finalAvailableUnits = 0; // ✅ Don't show units
      finalAvailablePackets = 0; // ✅ Don't show packets
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      warehouseId: product.warehouseId,
      warehousename: warehouseMap.get(product.warehouseId) ?? "",
      pricePerUnit: Number(product.pricePerUnit) || 0,
      pricePerPacket: Number(product.pricePerPacket) || 0,
      pricePerCarton: Number(product.pricePerCarton) || 0,
      unitsPerPacket: product.unitsPerPacket,
      packetsPerCarton: product.packetsPerCarton,
      availableUnits: finalAvailableUnits,
      availablePackets: finalAvailablePackets,
      availableCartons: finalAvailableCartons,
      sellingMode: product.type ?? "", // ✅ Optional: helpful for debugging
    };
  });
}
export async function processReturn(data: any, companyId: string) {
  const { saleId, cashierId, customerId, returnNumber, reason, items } = data;

  // Filter only items with quantity > 0
  const returnItems = items.filter((item: any) => item.quantity > 0);

  if (returnItems.length === 0) {
    return { success: false, message: "لا توجد منتجات للإرجاع" };
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Get original sale
      const originalSale = await tx.sale.findUnique({
        where: { id: saleId },
        include: {
          saleItems: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!originalSale) {
        throw new Error("عملية البيع غير موجودة");
      }

      // 2. Calculate return totals
      let returnSubtotal = 0;
      let returnTotalCOGS = 0;

      const saleItemsMap = new Map(
        originalSale.saleItems.map((item) => [item.productId, item]),
      );

      // Helper function to convert to base units
      function convertToBaseUnits(
        qty: number,
        sellingUnit: string,
        unitsPerPacket: number,
        packetsPerCarton: number,
      ): number {
        if (sellingUnit === "unit") return qty;
        if (sellingUnit === "packet") return qty * (unitsPerPacket || 1);
        if (sellingUnit === "carton")
          return qty * (unitsPerPacket || 1) * (packetsPerCarton || 1);
        return qty;
      }

      // Calculate return amount and COGS
      for (const returnItem of returnItems) {
        const saleItem = saleItemsMap.get(returnItem.productId);
        if (!saleItem) {
          throw new Error(
            `المنتج ${returnItem.name} غير موجود في البيع الأصلي`,
          );
        }

        // Validate return quantity
        if (returnItem.quantity > saleItem.quantity) {
          throw new Error(
            `كمية الإرجاع للمنتج ${returnItem.name} أكبر من الكمية المباعة`,
          );
        }

        // Calculate return value (based on unit price from original sale)
        const itemReturnValue =
          saleItem.unitPrice.toNumber() * returnItem.quantity;
        returnSubtotal += itemReturnValue;

        // Calculate COGS for this return
        const product = saleItem.product;
        const totalUnitsPerCarton =
          product.unitsPerPacket === 0 && product.packetsPerCarton === 0
            ? 1
            : product.packetsPerCarton === 0
              ? Math.max(product.unitsPerPacket, 1)
              : Math.max(product.unitsPerPacket, 1) *
                Math.max(product.packetsPerCarton, 1);

        let costPerSellingUnit = 0;
        if (returnItem.sellingUnit === "carton") {
          costPerSellingUnit = product.costPrice.toNumber();
        } else if (returnItem.sellingUnit === "packet") {
          costPerSellingUnit =
            product.costPrice.toNumber() /
            Math.max(product.packetsPerCarton, 1);
        } else if (returnItem.sellingUnit === "unit") {
          costPerSellingUnit =
            product.costPrice.toNumber() / totalUnitsPerCarton;
        }

        const itemCOGS = returnItem.quantity * costPerSellingUnit;
        returnTotalCOGS += itemCOGS;
      }

      // 3. Create return sale record
      const returnSale = await tx.sale.create({
        data: {
          companyId,
          saleNumber: returnNumber,
          customerId: originalSale.customerId,
          cashierId,
          sale_type: "return",
          status: "completed",
          subtotal: -returnSubtotal, // Negative for return
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: -returnSubtotal,
          amountPaid: -returnSubtotal, // Will be refunded
          amountDue: 0,
          paymentStatus: "paid",
          originalSaleId: saleId,
        },
      });

      // 4. Create return sale items and restock inventory
      const returnSaleItemsData = [];
      const stockMovementsData = [];
      const inventoryUpdates = [];

      for (const returnItem of returnItems) {
        const saleItem = saleItemsMap.get(returnItem.productId);
        const product = saleItem!.product;

        // Convert to base units for inventory
        const quantityInUnits = convertToBaseUnits(
          returnItem.quantity,
          returnItem.sellingUnit,
          product.unitsPerPacket || 1,
          product.packetsPerCarton || 1,
        );

        // Get inventory
        const inventory = await tx.inventory.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId,
              productId: returnItem.productId,
              warehouseId: returnItem.warehouseId,
            },
          },
        });

        if (!inventory) {
          throw new Error(`المخزون غير موجود للمنتج ${returnItem.name}`);
        }

        const newStock = inventory.stockQuantity + quantityInUnits;
        const newAvailable = inventory.availableQuantity + quantityInUnits;

        // Prepare return sale item
        returnSaleItemsData.push({
          companyId,
          saleId: returnSale.id,
          productId: returnItem.productId,
          quantity: returnItem.quantity,
          sellingUnit: returnItem.sellingUnit,
          unitPrice: saleItem!.unitPrice,
          totalPrice: saleItem!.unitPrice.toNumber() * returnItem.quantity,
        });

        // Prepare stock movement
        stockMovementsData.push({
          companyId,
          productId: returnItem.productId,
          warehouseId: returnItem.warehouseId,
          userId: cashierId,
          movementType: "وارد",
          quantity: quantityInUnits,
          reason: reason ?? "إرجاع بيع",
          quantityBefore: inventory.stockQuantity,
          quantityAfter: newStock,
          referenceType: "إرجاع",
          referenceId: returnSale.id,
          notes: reason || undefined,
        });

        // Prepare inventory update
        inventoryUpdates.push(
          tx.inventory.update({
            where: {
              companyId_productId_warehouseId: {
                companyId,
                productId: returnItem.productId,
                warehouseId: returnItem.warehouseId,
              },
            },
            data: {
              stockQuantity: newStock,
              availableQuantity: newAvailable,
              status:
                newAvailable <= inventory.reorderLevel
                  ? "low"
                  : newAvailable === 0
                    ? "out_of_stock"
                    : "available",
            },
          }),
        );
      }

      // Execute all operations in parallel
      await Promise.all([
        tx.saleItem.createMany({ data: returnSaleItemsData }),
        tx.stockMovement.createMany({ data: stockMovementsData }),
        ...inventoryUpdates,
      ]);

      // 5. Handle customer balance and refund
      const customerUpdates = [];

      if (customerId) {
        // Check original sale payment status
        if (
          originalSale.paymentStatus === "unpaid" ||
          originalSale.paymentStatus === "partial"
        ) {
          // If original sale was unpaid/partial, reduce outstanding balance
          const amountToDeduct = Math.min(
            returnSubtotal,
            originalSale.amountPaid?.toNumber() || 0,
          );

          if (amountToDeduct > 0) {
            customerUpdates.push(
              tx.customer.update({
                where: { id: customerId, companyId },
                data: {
                  outstandingBalance: { decrement: amountToDeduct },
                },
              }),
            );
          }

          // Remaining amount goes to customer balance (credit)
          const remainingCredit = returnSubtotal - amountToDeduct;
          if (remainingCredit > 0) {
            customerUpdates.push(
              tx.customer.update({
                where: { id: customerId, companyId },
                data: {
                  balance: { increment: remainingCredit },
                },
              }),
            );
          }
        } else {
          // If original sale was paid, add full amount to customer balance
          customerUpdates.push(
            tx.customer.update({
              where: { id: customerId, companyId },
              data: {
                balance: { increment: returnSubtotal },
              },
            }),
          );
        }
      }

      // 6. Create payment record for return
      customerUpdates.push(
        tx.payment.create({
          data: {
            companyId,
            saleId: returnSale.id,
            cashierId,
            customerId: originalSale.customerId,
            paymentMethod: "cash",
            payment_type: "return_refund",
            amount: -returnSubtotal, // Negative for refund
            status: "completed",
            notes: reason || "إرجاع بيع",
          },
        }),
      );

      if (customerUpdates.length > 0) {
        await Promise.all(customerUpdates);
      }

      // The trigger function will handle the accounting entries automatically

      return {
        success: true,
        message: "تم إرجاع البيع بنجاح",
        returnSale,
        returnSubtotal,
        returnCOGS: returnTotalCOGS,
      };
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );

  revalidatePath("/sells");
  return result;
}
