// app/actions/cashier.ts
"use server";

import prisma from "@/lib/prisma";
import {
  revalidatePath,
  revalidateTag,
  unstable_cache,
  unstable_noStore,
} from "next/cache";
import { logActivity } from "./activitylogs";
import { Prisma } from "@prisma/client";
import { getActiveFiscalYears } from "./fiscalYear";
import { serialize } from "v8";

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

export async function generateSaleNumber(companyId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `-${currentYear}-بيع`;

  // Get the last sale number for this company and year
  const lastSale = await prisma.sale.findFirst({
    where: {
      companyId,
      saleNumber: {
        contains: prefix,
      },
    },
    orderBy: {
      saleNumber: "desc",
    },
    select: {
      saleNumber: true,
    },
  });

  let nextNumber = 1;
  if (lastSale?.saleNumber) {
    const parts = lastSale.saleNumber.split("-");
    const lastSeq = parseInt(parts[0], 10); // ✅ "000001"
    nextNumber = lastSeq + 1;
  }

  // Format with leading zeros (6 digits)
  const formattedNumber = nextNumber.toString().padStart(6, "0");
  return `${formattedNumber}${prefix}`;
}

/**
 * Alternative: Simpler format without year
 * Format: SALE-000001
 */
export async function generateSimpleSaleNumber(
  companyId: string,
): Promise<string> {
  const prefix = "SALE-";

  const lastSale = await prisma.sale.findFirst({
    where: {
      companyId,
      saleNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      saleNumber: "desc",
    },
    select: {
      saleNumber: true,
    },
  });

  let nextNumber = 1;

  if (lastSale) {
    const lastNumberStr = lastSale.saleNumber.split("-").pop();
    const lastNumber = parseInt(lastNumberStr || "0", 10);
    nextNumber = lastNumber + 1;
  }

  const formattedNumber = nextNumber.toString().padStart(6, "0");
  return `${prefix}${formattedNumber}`;
}

/**
 * Transaction-safe version: Uses database sequence to prevent duplicates
 * This is the RECOMMENDED approach for high-concurrency scenarios
 */
export async function generateSaleNumberSafe(
  companyId: string,
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `${currentYear}`;

  // Use a raw query to get the next number atomically
  const result = await prisma.$queryRawUnsafe<{ next_number: bigint }[]>(`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(sale_number FROM ${prefix.length + 1}) AS INTEGER)),
      0
    ) + 1 AS next_number
    FROM sales
    WHERE company_id = '${companyId}'
      AND sale_number LIKE '${prefix}%'
      AND sale_number ~ '^${prefix}[0-9]+$'
  `);

  const nextNumber = Number(result[0]?.next_number || 1);
  const formattedNumber = nextNumber.toString().padStart(6, "0");

  return `${formattedNumber}-${prefix}-بيع`;
}

/**
 * Get the next sale number for preview (doesn't reserve it)
 */
export async function getNextSaleNumber(companyId: string): Promise<string> {
  return generateSaleNumberSafe(companyId);
}
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
      // 1️⃣ Create main Sale record
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

      // ===== Helper functions =====
      const convertToBaseUnits = (
        qty: number,
        sellingUnit: string,
        unitsPerPacket: number = 1,
        packetsPerCarton: number = 1,
      ) => {
        if (sellingUnit === "unit") return qty;
        if (sellingUnit === "packet") return qty * unitsPerPacket;
        if (sellingUnit === "carton")
          return qty * unitsPerPacket * packetsPerCarton;
        return qty;
      };

      const getUnitPrice = (item: any) =>
        item.sellingUnit === "unit"
          ? item.pricePerUnit || 0
          : item.sellingUnit === "packet"
            ? item.pricePerPacket || 0
            : item.sellingUnit === "carton"
              ? item.pricePerCarton || 0
              : 0;

      const getInventoryStatus = (available: number, reorderLevel: number) => {
        if (available === 0) return "out_of_stock";
        if (available <= reorderLevel) return "low";
        return "available";
      };

      // ===== Fetch all inventories once =====
      const productIds = cart.map((item: any) => item.id);
      const warehouseIds = cart.map((item: any) => item.warehouseId);

      const inventories = await tx.inventory.findMany({
        where: {
          companyId,
          productId: { in: productIds },
          warehouseId: { in: warehouseIds },
        },
        select: {
          id: true,
          productId: true,
          warehouseId: true,
          stockQuantity: true,
          reservedQuantity: true,
          availableQuantity: true,
          reorderLevel: true,
        },
      });

      const inventoryMap = new Map(
        inventories.map((inv) => [`${inv.productId}-${inv.warehouseId}`, inv]),
      );

      // ===== Prepare batch operations =====
      const saleItemsData: any[] = [];
      const stockMovementsData: any[] = [];
      const inventoryUpdates: any[] = [];

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
        const unitPrice = getUnitPrice(item);
        const totalPrice = unitPrice * item.selectedQty;

        saleItemsData.push({
          companyId,
          saleId: sale.id,
          productId: item.id,
          quantity: item.selectedQty,
          sellingUnit: item.sellingUnit,
          unitPrice,
          totalPrice,
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
          companyId,
          productId: item.id,
          warehouseId: item.warehouseId,
          stockQuantity: newStock,
          availableQuantity: newAvailable,
          status: getInventoryStatus(newAvailable, inventory.reorderLevel),
        });
      }

      // ===== Execute sale items and stock movements in parallel =====
      await Promise.all([
        tx.saleItem.createMany({ data: saleItemsData }),
        tx.stockMovement.createMany({ data: stockMovementsData }),
      ]);

      // ===== Optimized batch inventory update using updateMany =====
      if (inventoryUpdates.length > 0) {
        await Promise.all(
          inventoryUpdates.map((inv) =>
            tx.inventory.updateMany({
              where: {
                companyId: inv.companyId,
                productId: inv.productId,
                warehouseId: inv.warehouseId,
              },
              data: {
                stockQuantity: inv.stockQuantity,
                availableQuantity: inv.availableQuantity,
                status: inv.status,
              },
            }),
          ),
        );
      }

      // ===== Customer updates & payment =====
      const customerUpdatePromises: Promise<any>[] = [];

      if (customerId) {
        const customerData: any = {};
        if (totalAfterDiscount > receivedAmount)
          customerData.outstandingBalance = {
            increment: totalAfterDiscount - receivedAmount,
          };
        if (receivedAmount > totalAfterDiscount)
          customerData.balance = {
            increment: receivedAmount - totalAfterDiscount,
          };
        if (Object.keys(customerData).length)
          customerUpdatePromises.push(
            tx.customer.update({
              where: { id: customerId, companyId },
              data: customerData,
            }),
          );
      }

      if (receivedAmount > 0) {
        customerUpdatePromises.push(
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

      // Execute customer updates in parallel
      if (customerUpdatePromises.length > 0) {
        await Promise.all(customerUpdatePromises);
      }

      // 🆕 CREATE JOURNAL EVENT (instead of direct creation)
      await tx.journalEvent.create({
        data: {
          companyId: companyId,
          eventType: "sale",
          status: "pending",
          entityType: "sale",
          payload: {
            companyId,
            sale: {
              id: sale.id,
              saleNumber: sale.saleNumber,
              sale_type: sale.sale_type,
              status: sale.status,
              totalAmount: sale.totalAmount.toString(),
              amountPaid: sale.amountPaid.toString(),
              paymentStatus: sale.paymentStatus,
            },
            customerId,
            saleItems: cart,
            cashierId,
          },
          processed: false,
        },
      });

      // ===== Prepare response =====
      const saleForClient = {
        ...sale,
        taxAmount: sale.taxAmount.toString(),
        subtotal: sale.subtotal.toString(),
        discountAmount: sale.discountAmount.toString(),
        totalAmount: sale.totalAmount.toString(),
        amountPaid: sale.amountPaid.toString(),
        amountDue: sale.amountDue.toString(),
        refunded: sale.refunded.toString(),
      };
      revalidatePath("/cashiercontrol");
      return { message: "Sale processed successfully", sale: saleForClient };
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );

  // ===== Fire non-blocking operations =====
  Promise.all([
    logActivity(
      cashierId,
      companyId,
      "أمين الصندوق",
      "قام ببيع منتج",
      "889",
      "وكيل المستخدم",
    ).catch(console.error),
  ]).catch(console.error);

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
// ============================================
// Updated processReturn Function
// ============================================
export async function processReturn(data: any, companyId: string) {
  const {
    saleId,
    cashierId,
    customerId,
    returnNumber,
    reason,
    items,
    returnToCustomer,
    paymentMethod,
  } = data;

  // Filter only items with quantity > 0
  const returnItems = items.filter((item: any) => item.quantity > 0);
  if (returnItems.length === 0) {
    return { success: false, message: "لا توجد منتجات للإرجاع" };
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Get original sale with all needed data
      const originalSale = await tx.sale.findUnique({
        where: { id: saleId },
        select: {
          amountDue: true,
          customerId: true,
          paymentStatus: true,
          saleItems: {
            select: {
              productId: true,
              quantity: true,
              unitPrice: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  costPrice: true,
                  unitsPerPacket: true,
                  packetsPerCarton: true,
                },
              },
            },
          },
        },
      });

      if (!originalSale) {
        throw new Error("عملية البيع غير موجودة");
      }
      const originalNumber = returnNumber; // 000001-2025-بيع
      const returnNumberWithArabic = originalNumber.replace("بيع", "مرتجع");
      const originalSaleAmountDue = originalSale.amountDue?.toNumber() || 0;

      // 2. Create maps and helper functions
      const saleItemsMap = new Map(
        originalSale.saleItems.map((item) => [item.productId, item]),
      );

      const convertToBaseUnits = (
        qty: number,
        sellingUnit: string,
        unitsPerPacket: number,
        packetsPerCarton: number,
      ): number => {
        if (sellingUnit === "unit") return qty;
        if (sellingUnit === "packet") return qty * (unitsPerPacket || 1);
        if (sellingUnit === "carton")
          return qty * (unitsPerPacket || 1) * (packetsPerCarton || 1);
        return qty;
      };

      const calculateCostPerUnit = (
        product: any,
        sellingUnit: string,
      ): number => {
        const totalUnitsPerCarton =
          Math.max(product.unitsPerPacket || 1, 1) *
          Math.max(product.packetsPerCarton || 1, 1);

        const costPrice = product.costPrice.toNumber();

        if (sellingUnit === "carton") return costPrice;
        if (sellingUnit === "packet")
          return costPrice / Math.max(product.packetsPerCarton, 1);
        if (sellingUnit === "unit") return costPrice / totalUnitsPerCarton;
        return costPrice;
      };

      // 3. Validate and calculate totals
      let returnSubtotal = 0;
      let returnTotalCOGS = 0;

      for (const returnItem of returnItems) {
        const saleItem = saleItemsMap.get(returnItem.productId);
        if (!saleItem) {
          throw new Error(
            `المنتج ${returnItem.name} غير موجود في البيع الأصلي`,
          );
        }

        if (returnItem.quantity > saleItem.quantity) {
          throw new Error(
            `كمية الإرجاع للمنتج ${returnItem.name} أكبر من الكمية المباعة`,
          );
        }

        // Calculate return value
        const itemReturnValue =
          saleItem.unitPrice.toNumber() * returnItem.quantity;
        returnSubtotal += itemReturnValue;

        // Calculate COGS
        const costPerUnit = calculateCostPerUnit(
          saleItem.product,
          returnItem.sellingUnit,
        );
        returnTotalCOGS += returnItem.quantity * costPerUnit;
      }

      // 4. Fetch all inventories in one query
      const warehouseIds = returnItems.map((item: any) => item.warehouseId);
      const productIds = returnItems.map((item: any) => item.productId);

      const inventories = await tx.inventory.findMany({
        where: {
          companyId,
          productId: { in: productIds },
          warehouseId: { in: warehouseIds },
        },
      });

      const inventoryMap = new Map(
        inventories.map((inv) => [`${inv.productId}-${inv.warehouseId}`, inv]),
      );

      // 5. Create return sale record
      const returnSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          companyId,
          saleNumber: returnNumberWithArabic,
          customerId: originalSale.customerId,
          cashierId,
          sale_type: "return",
          status: "completed",
          subtotal: returnSubtotal,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: returnSubtotal,
          amountPaid: returnToCustomer,
          amountDue: 0,
          paymentStatus: "paid",
          refunded: { increment: returnSubtotal },
        },
      });

      // 6. Prepare batch operations
      const returnSaleItemsData = [];
      const stockMovementsData = [];
      const inventoryUpdatesPromises = [];

      for (const returnItem of returnItems) {
        const saleItem = saleItemsMap.get(returnItem.productId)!;
        const product = saleItem.product;

        const quantityInUnits = convertToBaseUnits(
          returnItem.quantity,
          returnItem.sellingUnit,
          product.unitsPerPacket || 1,
          product.packetsPerCarton || 1,
        );

        const inventoryKey = `${returnItem.productId}-${returnItem.warehouseId}`;
        const inventory = inventoryMap.get(inventoryKey);

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
          unitPrice: saleItem.unitPrice,
          totalPrice: saleItem.unitPrice.toNumber() * returnItem.quantity,
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
        inventoryUpdatesPromises.push(
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
                newAvailable === 0
                  ? "out_of_stock"
                  : newAvailable <= inventory.reorderLevel
                    ? "low"
                    : "available",
            },
          }),
        );
      }

      await Promise.all([
        tx.saleItem.createMany({ data: returnSaleItemsData }),
        tx.stockMovement.createMany({ data: stockMovementsData }),
        ...inventoryUpdatesPromises,
      ]);

      // 7. Handle customer balance updates
      const customerUpdatePromises = [];

      if (customerId) {
        if (
          originalSale.paymentStatus === "unpaid" ||
          originalSale.paymentStatus === "partial"
        ) {
          // Reduce outstanding balance
          const amountToDeduct = Math.min(
            returnSubtotal,
            originalSale.amountDue?.toNumber() || 0,
          );

          if (amountToDeduct > 0) {
            customerUpdatePromises.push(
              tx.customer.update({
                where: { id: customerId, companyId },
                data: {
                  outstandingBalance: { decrement: amountToDeduct },
                },
              }),
            );
          }
        }
      }

      // 8. Create payment record
      if (returnToCustomer > 0) {
        customerUpdatePromises.push(
          tx.payment.create({
            data: {
              companyId,
              saleId: returnSale.id,
              cashierId,
              customerId: originalSale.customerId,
              paymentMethod: paymentMethod || "cash",
              payment_type: "return_refund",
              amount: returnToCustomer,
              status: "completed",
              notes: reason || "إرجاع بيع",
            },
          }),
        );
      }

      // Execute customer updates in parallel
      if (customerUpdatePromises.length > 0) {
        await Promise.all(customerUpdatePromises);
      }

      // 9. Update original sale refunded amount

      // 🆕 CREATE JOURNAL EVENT FOR RETURN
      const refundFromAR = Math.min(returnSubtotal, originalSaleAmountDue || 0);
      const refundFromCashBank = returnSubtotal - refundFromAR;

      await tx.journalEvent.create({
        data: {
          companyId: companyId,
          eventType: "return",
          status: "pending",
          entityType: "sale_return",
          payload: {
            companyId,
            customerId,
            cashierId,
            returnNumber,
            returnSubtotal,
            returnTotalCOGS,
            refundFromAR,
            refundFromCashBank,
            returnSaleId: returnSale.id,
            paymentMethod: paymentMethod || "cash",
            reason,
          },
          processed: false,
        },
      });

      const cleanReturnSale = JSON.parse(JSON.stringify(returnSale));
      return {
        success: true,
        message: "تم إرجاع البيع بنجاح",
        cleanReturnSale,
        returnSubtotal,
        returnTotalCOGS,
        originalSaleAmountDue,
      };
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );

  return result;
}

export async function createReturnJournalEntries({
  companyId,
  customerId,
  cashierId,
  returnNumber,
  returnSubtotal,
  returnTotalCOGS,
  refundFromAR,
  refundFromCashBank,
  returnSaleId,
  paymentMethod = "cash",
  reason,
}: {
  companyId: string;
  customerId: string;
  cashierId: string;
  returnNumber: string;
  returnSubtotal: number;
  returnTotalCOGS: number;
  refundFromAR: number;
  refundFromCashBank: number;
  returnSaleId: string;
  paymentMethod?: "cash" | "bank";
  reason?: string;
}) {
  // 1️⃣ Fetch mappings and fiscal year in parallel
  const [mappings, fy] = await Promise.all([
    prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
      select: { mapping_type: true, account_id: true },
    }),
    getActiveFiscalYears(),
  ]);

  if (!fy) throw new Error("No active fiscal year");

  // 2️⃣ Create account map
  const accountMap = new Map(
    mappings.map((m) => [m.mapping_type, m.account_id]),
  );

  const getAccountId = (type: string) => {
    const id = accountMap.get(type);
    if (!id && ["sales_revenue", "cogs", "inventory"].includes(type)) {
      throw new Error(`Missing essential GL account mapping: ${type}`);
    }
    return id;
  };

  const revenueAccount = getAccountId("sales_revenue")!;
  const cogsAccount = getAccountId("cogs")!;
  const inventoryAccount = getAccountId("inventory")!;
  const cashAccount = getAccountId("cash");
  const bankAccount = getAccountId("bank");
  const arAccount = getAccountId("accounts_receivable");

  // 3️⃣ Generate entry numbers
  // const year = new Date().getFullYear();
  // const timestamp = Date.now();
  // const entryBase = `JE-${year}-${returnNumber}-${timestamp}-RET`;
  const v_year = new Date().getFullYear();
  let entryCounter = 0;
  const entryBase = () => {
    entryCounter++;
    const ts = Date.now();
    return `JE-${v_year}-${returnNumber}-${ts}-${entryCounter}-RET`;
  };
  // 4️⃣ Build journal entries with base template
  const baseEntry = {
    company_id: companyId,
    entry_date: new Date(),
    is_automated: true,
    fiscal_period: fy.period_name,
    reference_type: "sale_return",
    reference_id: returnSaleId,
    created_by: cashierId,
  };

  const entries: any[] = [
    // Reverse Revenue (Debit)
    {
      ...baseEntry,
      entry_number: entryBase(),
      account_id: revenueAccount,
      description: `إرجاع بيع ${returnNumber}`,
      debit: 0,
      credit: returnSubtotal,
    },
    // Reverse COGS (Credit)
    {
      ...baseEntry,
      entry_number: entryBase(),
      account_id: cogsAccount,
      description: `عكس تكلفة البضاعة المباعة (إرجاع) ${returnNumber}`,
      debit: 0,
      credit: returnTotalCOGS,
    },
    // Increase Inventory (Debit)
    {
      ...baseEntry,
      entry_number: entryBase(),
      account_id: inventoryAccount,
      description: `زيادة مخزون (إرجاع) ${returnNumber}`,
      debit: returnTotalCOGS,
      credit: 0,
    },
  ];

  // 5️⃣ Add refund entries
  if (refundFromAR > 0 && arAccount) {
    entries.push({
      ...baseEntry,
      entry_number: entryBase(),
      account_id: arAccount,
      description: `تخفيض مديونية العميل بسبب إرجاع ${returnNumber}`,
      debit: 0,
      credit: refundFromAR,
      reference_id: customerId || returnSaleId,
      reference_type: "إرجاع",
    });
  }

  if (refundFromCashBank > 0) {
    const refundAccountId =
      paymentMethod === "bank" ? bankAccount : cashAccount;

    if (!refundAccountId) {
      throw new Error(
        `Missing GL account mapping for refund method: ${paymentMethod}`,
      );
    }

    entries.push({
      ...baseEntry,
      entry_number: entryBase(),
      account_id: refundAccountId,
      description: `صرف مبلغ مسترجع للعميل (إرجاع) ${returnNumber}`,
      debit: 0,
      credit: refundFromCashBank,
    });
  }

  // 6️⃣ Insert entries and update balances in transaction
  await prisma.$transaction(async (tx) => {
    // Insert all journal entries
    await tx.journal_entries.createMany({ data: entries });

    // Calculate account balance deltas
    const accountDeltas = new Map<string, number>();
    for (const entry of entries) {
      const delta = (entry.debit || 0) - (entry.credit || 0);
      accountDeltas.set(
        entry.account_id,
        (accountDeltas.get(entry.account_id) || 0) + delta,
      );
    }

    // Update all account balances in parallel
    await Promise.all(
      Array.from(accountDeltas.entries()).map(([accountId, delta]) =>
        tx.accounts.update({
          where: { id: accountId },
          data: { balance: { increment: delta } },
        }),
      ),
    );
  });

  return {
    success: true,
    message: "تم إنشاء قيود اليومية للإرجاع بنجاح",
    entry_number: entries[0]?.entry_number,
  };
}
