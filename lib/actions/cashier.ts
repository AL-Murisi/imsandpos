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
import { getLatestExchangeRate } from "./currency";
import { SellingUnit } from "../zod";
import { console } from "inspector";

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
function toBaseQty(
  qty: number,
  sellingUnitId: string,
  sellingUnits: {
    id: string;
    unitsPerParent: number;
    isBase: boolean;
  }[],
) {
  const unit = sellingUnits.find((u) => u.id === sellingUnitId);
  if (!unit) {
    throw new Error("Selling unit not found");
  }

  return qty * unit.unitsPerParent;
}
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

  return await prisma.$transaction(
    async (tx) => {
      // ==========================================
      // 1️⃣ Create Sale
      // ==========================================
      const sale = await tx.sale.create({
        data: {
          companyId,
          saleNumber,
          customerId,
          cashierId,
          sale_type: "sale",
          status: "completed",
          subtotal: totalBeforeDiscount,
          discountAmount: totalDiscount,
          totalAmount: totalAfterDiscount,
          amountPaid: receivedAmount,
          amountDue: Math.max(0, totalAfterDiscount - receivedAmount),
          paymentStatus:
            receivedAmount >= totalAfterDiscount ? "paid" : "partial",
          exchange_rate: 1,
          taxAmount: 0,
        },
      });

      // ==========================================
      // 2️⃣ Fetch inventory per PRODUCT + UNIT
      // ==========================================
      const inventoryUnits = await tx.inventory.findMany({
        where: {
          companyId,
          OR: cart.map((item: any) => ({
            productId: item.id,
            warehouseId: item.warehouseId,
          })),
        },
        include: { product: true },
      });

      const invMap = new Map(
        inventoryUnits.map((i) => [`${i.productId}-${i.warehouseId}`, i]),
      );
      // const calculateCostPerUnit = (
      //   product: any,
      //   selectedUnitId: string,
      // ): number => {
      //   // 1. جلب قائمة الوحدات وتكلفة الحبة الواحدة (الوحدة الأساسية)
      //   const sellingUnits = (product.sellingUnits as any[]) || [];
      //   const costPerBaseUnit = product.costPrice.toNumber();

      //   // 2. البحث عن الوحدة التي اختارها المستخدم في السلة
      //   const unit = sellingUnits.find((u) => u.id === selectedUnitId);

      //   // 3. إذا لم نجد الوحدة، نعتبر التكلفة هي تكلفة الحبة الواحدة
      //   if (!unit) return costPerBaseUnit;

      //   // 4. الحسبة: (تكلفة الحبة) × (عدد الحبات داخل هذه الوحدة)
      //   // مثال: طبق البيض (400 تكلفة الحبة × 22 معامل الطبق) = 8,800
      //   return costPerBaseUnit * unit.unitsPerParent;
      // };
      const saleItems: any[] = [];
      const stockMovements: any[] = [];
      const inventoryUpdates: any[] = [];
      let returnTotalCOGS = 0;
      // ==========================================
      // 3️⃣ Process each cart line
      // ==========================================
      for (const item of cart) {
        const inventoryKey = `${item.id}-${item.warehouseId}`;
        const inventory = invMap.get(inventoryKey);

        if (!inventory) {
          throw new Error(`لا يوجد مخزون للمنتج ${item.name}`);
        }

        const baseQty = toBaseQty(
          item.selectedQty,
          item.selectedUnitId,
          item.sellingUnits,
        );
        const costPerBaseUnit = inventory.product.costPrice.toNumber();
        // 3. حساب إجمالي التكلفة لهذا السطر باستخدام baseQty
        // (مثلاً: 880 حبة * 1 حبة تكلفة)
        const lineCOGS = baseQty * costPerBaseUnit;

        // 4. إضافة الناتج للإجمالي الكلي للمبيعات
        returnTotalCOGS += lineCOGS;
        console.log("lineCOGS", lineCOGS);
        // 🟢 Sale Item (بالوحدة المختارة)
        saleItems.push({
          companyId,
          saleId: sale.id,
          productId: item.id,
          sellingUnit: item.selectedUnitName,
          quantity: item.selectedQty,
          unitPrice: item.selectedUnitPrice,
          totalPrice: item.selectedQty * item.selectedUnitPrice,
        });

        // 🟢 Stock Movement (بالوحدة الأساسية)
        stockMovements.push({
          companyId,
          productId: item.id,
          warehouseId: item.warehouseId,
          movementType: "صادر بيع",
          quantity: baseQty,
          quantityBefore: inventory.stockQuantity,
          quantityAfter: inventory.stockQuantity - baseQty,
          referenceType: "sale",
          referenceId: sale.id,
          userId: cashierId,
        });

        inventoryUpdates.push({
          id: inventory.id,
          stockQuantity: inventory.stockQuantity - baseQty,
          availableQuantity: inventory.availableQuantity - baseQty,
        });
      }

      // ==========================================
      // 4️⃣ Execute DB Operations
      // ==========================================
      await Promise.all([
        tx.saleItem.createMany({ data: saleItems }),
        tx.stockMovement.createMany({ data: stockMovements }),
      ]);

      await Promise.all(
        inventoryUpdates.map((u) =>
          tx.inventory.update({
            where: { id: u.id },
            data: {
              stockQuantity: u.stockQuantity,
              availableQuantity: u.availableQuantity,
            },
          }),
        ),
      );

      // ==========================================
      // 5️⃣ Customer balance update
      // ==========================================
      if (customerId) {
        const delta = totalAfterDiscount - receivedAmount;

        if (delta !== 0) {
          await tx.customer.update({
            where: { id: customerId, companyId },
            data:
              delta > 0
                ? { outstandingBalance: { increment: delta } }
                : { balance: { increment: Math.abs(delta) } },
          });
        }
      }

      // ==========================================
      // 6️⃣ Payment
      // ==========================================
      if (receivedAmount > 0) {
        await tx.financialTransaction.create({
          data: {
            companyId,
            saleId: sale.id,
            userId: cashierId,
            customerId,
            paymentMethod: "cash",
            type: "PAYMENT",
            amount: receivedAmount,
            status: "completed",
          },
        });
      }
      revalidatePath("/cashiercontrol");
      // ==========================================
      // 7️⃣ Journal Event (async later)
      // ==========================================
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
            returnTotalCOGS,
            saleItems: cart,
            cashierId,
          },
          processed: false,
        },
      });

      return {
        message: "Sale processed successfully",
        saleId: sale.id,
      };
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );
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
        sellingUnits: true,
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

  // function convertFromBaseUnit(product: any, availableUnits: number) {
  //   const unitsPerPacket = product.unitsPerPacket || 1;
  //   const packetsPerCarton = product.packetsPerCarton || 1;

  //   const availablePackets = Number(
  //     (availableUnits / unitsPerPacket).toFixed(2),
  //   );
  //   const availableCartons = Number(
  //     (availablePackets / packetsPerCarton).toFixed(2),
  //   );

  //   return { availablePackets, availableCartons };
  // }

  return activeProducts.map((product) => {
    const sellingUnits = (product.sellingUnits as SellingUnit[]) || [];
    const availableUnits = product.inventory[0]?.availableQuantity ?? 0;

    const baseStock = product.inventory[0]?.availableQuantity || 0;
    const availableStock: Record<string, number> = {};

    sellingUnits.forEach((unit) => {
      // بما أن unitsPerParent تمثل عدد الوحدات الأساسية داخل هذه الوحدة
      // نقسم الإجمالي (baseStock) على المعامل الخاص بالوحدة مباشرة
      if (unit.unitsPerParent > 0) {
        availableStock[unit.id] = Math.floor(baseStock / unit.unitsPerParent);
      } else {
        // لتجنب القسمة على صفر في حال وجود خطأ في البيانات
        availableStock[unit.id] = unit.isbase ? baseStock : 0;
      }
    });
    // ✅ Only return quantities that are actually sold
    // let finalAvailableUnits = 0;
    // let finalAvailablePackets = 0;
    // let finalAvailableCartons = 0;

    // if (product.type === "full") {
    //   // Sell all three levels
    //   finalAvailableUnits = availableUnits;
    //   finalAvailablePackets = availablePackets;
    //   finalAvailableCartons = availableCartons;
    // } else if (product.type === "cartonUnit") {
    //   // Only sell units and cartons, hide packets
    //   finalAvailableUnits = availableUnits;
    //   finalAvailableCartons = availableCartons;
    //   finalAvailablePackets = 0; // ✅ Don't show packets
    // } else if (product.type === "cartonOnly") {
    //   // Only sell cartons, hide units and packets
    //   finalAvailableCartons = availableCartons;
    //   finalAvailableUnits = 0; // ✅ Don't show units
    //   finalAvailablePackets = 0; // ✅ Don't show packets
    // }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      sellingUnits,
      availableStock,
      warehouseId: product.warehouseId,
      warehousename: warehouseMap.get(product.warehouseId) ?? "",
      // pricePerUnit: Number(product.pricePerUnit) || 0,
      // pricePerPacket: Number(product.pricePerPacket) || 0,
      // pricePerCarton: Number(product.pricePerCarton) || 0,
      // unitsPerPacket: product.unitsPerPacket,
      // packetsPerCarton: product.packetsPerCarton,
      // availableUnits: finalAvailableUnits,
      // availablePackets: finalAvailablePackets,
      // availableCartons: finalAvailableCartons,
      sellingMode: product.type ?? "", // ✅ Optional: helpful for debugging
    };
  });
}

// ============================================
// export async function processReturn(data: any, companyId: string) {
//   const {
//     saleId,
//     cashierId,
//     customerId,
//     returnNumber,
//     reason,
//     items,
//     returnToCustomer,
//     paymentMethod,
//   } = data;

//   // Filter only items with quantity > 0
//   const returnItems = items.filter((item: any) => item.quantity > 0);
//   if (returnItems.length === 0) {
//     return { success: false, message: "لا توجد منتجات للإرجاع" };
//   }

//   const result = await prisma.$transaction(
//     async (tx) => {
//       // 1. Get original sale with all needed data
//       const originalSale = await tx.sale.findUnique({
//         where: { id: saleId },
//         select: {
//           amountDue: true,
//           customerId: true,
//           paymentStatus: true,
//           saleItems: {
//             select: {
//               productId: true,
//               quantity: true,
//               unitPrice: true,
//               product: {
//                 select: {
//                   id: true,
//                   name: true,
//                   costPrice: true,
//                   unitsPerPacket: true,
//                   packetsPerCarton: true,
//                 },
//               },
//             },
//           },
//         },
//       });

//       if (!originalSale) {
//         throw new Error("عملية البيع غير موجودة");
//       }
//       const originalNumber = returnNumber; // 000001-2025-بيع
//       const returnNumberWithArabic = originalNumber.replace("بيع", "مرتجع");
//       const originalSaleAmountDue = originalSale.amountDue?.toNumber() || 0;

//       // 2. Create maps and helper functions
//       const saleItemsMap = new Map(
//         originalSale.saleItems.map((item) => [item.productId, item]),
//       );

//       const convertToBaseUnits = (
//         qty: number,
//         sellingUnit: string,
//         unitsPerPacket: number,
//         packetsPerCarton: number,
//       ): number => {
//         if (sellingUnit === "unit") return qty;
//         if (sellingUnit === "packet") return qty * (unitsPerPacket || 1);
//         if (sellingUnit === "carton")
//           return qty * (unitsPerPacket || 1) * (packetsPerCarton || 1);
//         return qty;
//       };

//       const calculateCostPerUnit = (
//         product: any,
//         sellingUnit: string,
//       ): number => {
//         const totalUnitsPerCarton =
//           Math.max(product.unitsPerPacket || 1, 1) *
//           Math.max(product.packetsPerCarton || 1, 1);

//         const costPrice = product.costPrice.toNumber();

//         if (sellingUnit === "carton") return costPrice;
//         if (sellingUnit === "packet")
//           return costPrice / Math.max(product.packetsPerCarton, 1);
//         if (sellingUnit === "unit") return costPrice / totalUnitsPerCarton;
//         return costPrice;
//       };

//       // 3. Validate and calculate totals
//       let returnSubtotal = 0;
//       let returnTotalCOGS = 0;

//       for (const returnItem of returnItems) {
//         const saleItem = saleItemsMap.get(returnItem.productId);
//         if (!saleItem) {
//           throw new Error(
//             `المنتج ${returnItem.name} غير موجود في البيع الأصلي`,
//           );
//         }

//         if (returnItem.quantity > saleItem.quantity) {
//           throw new Error(
//             `كمية الإرجاع للمنتج ${returnItem.name} أكبر من الكمية المباعة`,
//           );
//         }

//         // Calculate return value
//         const itemReturnValue =
//           saleItem.unitPrice.toNumber() * returnItem.quantity;
//         returnSubtotal += itemReturnValue;

//         // Calculate COGS
//         const costPerUnit = calculateCostPerUnit(
//           saleItem.product,
//           returnItem.sellingUnit,
//         );
//         returnTotalCOGS += returnItem.quantity * costPerUnit;
//       }

//       // 4. Fetch all inventories in one query
//       const warehouseIds = returnItems.map((item: any) => item.warehouseId);
//       const productIds = returnItems.map((item: any) => item.productId);

//       const inventories = await tx.inventory.findMany({
//         where: {
//           companyId,
//           productId: { in: productIds },
//           warehouseId: { in: warehouseIds },
//         },
//       });

//       const inventoryMap = new Map(
//         inventories.map((inv) => [`${inv.productId}-${inv.warehouseId}`, inv]),
//       );

//       // 5. Create return sale record
//       const returnSale = await tx.sale.update({
//         where: { id: saleId },
//         data: {
//           companyId,
//           saleNumber: returnNumberWithArabic,
//           customerId: originalSale.customerId,
//           cashierId,
//           sale_type: "return",
//           status: "completed",
//           subtotal: returnSubtotal,
//           taxAmount: 0,
//           discountAmount: 0,
//           totalAmount: returnSubtotal,
//           amountPaid: returnToCustomer,
//           amountDue: 0,
//           paymentStatus: "paid",
//           refunded: { increment: returnSubtotal },
//         },
//       });

//       // 6. Prepare batch operations
//       const returnSaleItemsData = [];
//       const stockMovementsData = [];
//       const inventoryUpdatesPromises = [];

//       for (const returnItem of returnItems) {
//         const saleItem = saleItemsMap.get(returnItem.productId)!;
//         const product = saleItem.product;

//         const quantityInUnits = convertToBaseUnits(
//           returnItem.quantity,
//           returnItem.sellingUnit,
//           product.unitsPerPacket || 1,
//           product.packetsPerCarton || 1,
//         );

//         const inventoryKey = `${returnItem.productId}-${returnItem.warehouseId}`;
//         const inventory = inventoryMap.get(inventoryKey);

//         if (!inventory) {
//           throw new Error(`المخزون غير موجود للمنتج ${returnItem.name}`);
//         }

//         const newStock = inventory.stockQuantity + quantityInUnits;
//         const newAvailable = inventory.availableQuantity + quantityInUnits;

//         // Prepare return sale item
//         returnSaleItemsData.push({
//           companyId,
//           saleId: returnSale.id,
//           productId: returnItem.productId,
//           quantity: returnItem.quantity,
//           sellingUnit: returnItem.sellingUnit,
//           unitPrice: saleItem.unitPrice,
//           totalPrice: saleItem.unitPrice.toNumber() * returnItem.quantity,
//         });

//         // Prepare stock movement
//         stockMovementsData.push({
//           companyId,
//           productId: returnItem.productId,
//           warehouseId: returnItem.warehouseId,
//           userId: cashierId,
//           movementType: "وارد",
//           quantity: quantityInUnits,
//           reason: reason ?? "إرجاع بيع",
//           quantityBefore: inventory.stockQuantity,
//           quantityAfter: newStock,
//           referenceType: "إرجاع",

//           referenceId: returnSale.id,
//           notes: reason || undefined,
//         });

//         // Prepare inventory update
//         inventoryUpdatesPromises.push(
//           tx.inventory.update({
//             where: {
//               companyId_productId_warehouseId: {
//                 companyId,
//                 productId: returnItem.productId,
//                 warehouseId: returnItem.warehouseId,
//               },
//             },
//             data: {
//               stockQuantity: newStock,
//               availableQuantity: newAvailable,
//               status:
//                 newAvailable === 0
//                   ? "out_of_stock"
//                   : newAvailable <= inventory.reorderLevel
//                     ? "low"
//                     : "available",
//             },
//           }),
//         );
//       }

//       await Promise.all([
//         tx.saleItem.createMany({ data: returnSaleItemsData }),
//         tx.stockMovement.createMany({ data: stockMovementsData }),
//         ...inventoryUpdatesPromises,
//       ]);

//       // 7. Handle customer balance updates
//       const customerUpdatePromises = [];

//       if (customerId) {
//         if (
//           originalSale.paymentStatus === "unpaid" ||
//           originalSale.paymentStatus === "partial"
//         ) {
//           // Reduce outstanding balance
//           const amountToDeduct = Math.min(
//             returnSubtotal,
//             originalSale.amountDue?.toNumber() || 0,
//           );

//           if (amountToDeduct > 0) {
//             customerUpdatePromises.push(
//               tx.customer.update({
//                 where: { id: customerId, companyId },
//                 data: {
//                   outstandingBalance: { decrement: amountToDeduct },
//                 },
//               }),
//             );
//           }
//         }
//       }

//       // 8. Create payment record
//       if (returnToCustomer > 0) {
//         customerUpdatePromises.push(
//           tx.payment.create({
//             data: {
//               companyId,
//               saleId: returnSale.id,
//               cashierId,
//               customerId: originalSale.customerId,
//               paymentMethod: paymentMethod || "cash",
//               payment_type: "return_refund",
//               amount: returnToCustomer,
//               status: "completed",
//               notes: reason || "إرجاع بيع",
//             },
//           }),
//         );
//       }

//       // Execute customer updates in parallel
//       if (customerUpdatePromises.length > 0) {
//         await Promise.all(customerUpdatePromises);
//       }

//       // 9. Update original sale refunded amount

//       // 🆕 CREATE JOURNAL EVENT FOR RETURN
//       const refundFromAR = Math.min(returnSubtotal, originalSaleAmountDue || 0);
//       const refundFromCashBank = returnSubtotal - refundFromAR;

//       await tx.journalEvent.create({
//         data: {
//           companyId: companyId,
//           eventType: "return",
//           status: "pending",
//           entityType: "sale_return",
//           payload: {
//             companyId,
//             customerId,
//             cashierId,
//             returnNumber,
//             returnSubtotal,
//             returnTotalCOGS,
//             refundFromAR,
//             refundFromCashBank,
//             returnSaleId: returnSale.id,
//             paymentMethod: paymentMethod || "cash",
//             reason,
//           },
//           processed: false,
//         },
//       });

//       const cleanReturnSale = JSON.parse(JSON.stringify(returnSale));
//       return {
//         success: true,
//         message: "تم إرجاع البيع بنجاح",
//         cleanReturnSale,
//         returnSubtotal,
//         returnTotalCOGS,
//         originalSaleAmountDue,
//       };
//     },
//     {
//       timeout: 20000,
//       maxWait: 5000,
//     },
//   );

//   return result;
// }
// lib/actions/cashier.ts - processReturn with Selling Units

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
              id: true,
              productId: true,
              quantity: true,
              unitPrice: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  costPrice: true,
                  sellingUnits: true, // 🆕
                },
              },
            },
          },
        },
      });

      if (!originalSale) {
        throw new Error("عملية البيع غير موجودة");
      }

      const originalNumber = returnNumber;
      const randomNumber = Math.floor(Math.random() * 90 + 10); // يولد رقماً بين 10 و 99
      const returnNumberWithArabic =
        originalNumber.replace("بيع", "مرتجع") + randomNumber;
      const originalSaleAmountDue = originalSale.amountDue?.toNumber() || 0;

      // 2. Create maps and helper functions
      const saleItemsMap = new Map(
        originalSale.saleItems.map((item) => [item.productId, item]),
      );

      // 🆕 Helper: Convert to base units using selling units structure
      // const convertToBaseUnits = (
      //   qty: number,
      //   selectedUnitId: string,
      //   sellingUnits: any[],
      // ): number => {
      //   const unitIndex = sellingUnits.findIndex(
      //     (u) => u.id === selectedUnitId,
      //   );

      //   if (unitIndex === 0) {
      //     return qty; // Already in base units
      //   }

      //   let multiplier = 1;
      //   for (let i = 1; i <= unitIndex; i++) {
      //     multiplier *= sellingUnits[i].unitsPerParent;
      //   }

      //   return qty * multiplier;
      // };

      // 🆕 Calculate cost per unit using selling units
      const calculateCostPerUnit = (
        product: any,
        selectedUnitId: string,
      ): number => {
        const sellingUnits = (product.sellingUnits as any[]) || [];
        const costPrice = product.costPrice.toNumber();

        const unitIndex = sellingUnits.findIndex(
          (u) => u.id === selectedUnitId,
        );

        if (unitIndex === 0) {
          return costPrice; // Base unit cost
        }

        let divisor = 1;
        for (let i = 1; i <= unitIndex; i++) {
          divisor *= sellingUnits[i].unitsPerParent;
        }

        return costPrice / divisor;
      };

      // 3. Validate and calculate totals
      let returnSubtotal = 0;
      let returnTotalCOGS = 0;

      // for (const returnItem of returnItems) {
      //   const saleItem = saleItemsMap.get(returnItem.productId);
      //   if (!saleItem) {
      //     throw new Error(
      //       `المنتج ${returnItem.name} غير موجود في البيع الأصلي`,
      //     );
      //   }

      //   if (returnItem.quantity > saleItem.quantity) {
      //     throw new Error(
      //       `كمية الإرجاع للمنتج ${returnItem.name} أكبر من الكمية المباعة`,
      //     );
      //   }

      //   // Calculate return value
      //   const itemReturnValue =
      //     saleItem.unitPrice.toNumber() * returnItem.quantity;
      //   returnSubtotal += itemReturnValue;

      //   // 🆕 Calculate COGS using selling units
      //   const sellingUnits = (saleItem.product.sellingUnits as any[]) || [];
      //   const costPerUnit = calculateCostPerUnit(
      //     saleItem.product,
      //     returnItem.selectedUnitId,
      //   );
      //   returnTotalCOGS += returnItem.quantity * costPerUnit;
      // }

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
          id: saleId,
          companyId,
          saleNumber: returnNumberWithArabic,
          customerId: originalSale.customerId,
          cashierId,
          sale_type: "return",
          status: "completed",
          subtotal: 0,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: 0,
          amountPaid: returnToCustomer,
          amountDue: 0,
          paymentStatus: "paid",
          refunded: { increment: returnToCustomer },
        },
      });

      // 6. Prepare batch operations
      const returnSaleItemsData = [];
      const stockMovementsData = [];
      const inventoryUpdatesPromises = [];

      for (const returnItem of returnItems) {
        const saleItem = saleItemsMap.get(returnItem.productId)!;
        const product = saleItem.product;
        const sellingUnits = (product.sellingUnits as any[]) || [];

        // 🆕 Convert to base units using selling units structure
        const quantityInUnits = toBaseQty(
          returnItem.quantity,
          returnItem.selectedUnitId,
          sellingUnits,
        );
        const costPerBaseUnit = product.costPrice.toNumber();

        // 3. حساب إجمالي التكلفة لهذا السطر باستخدام baseQty
        // (مثلاً: 880 حبة * 1 حبة تكلفة)
        const lineCOGS = quantityInUnits * costPerBaseUnit;

        // 4. إضافة الناتج للإجمالي الكلي للمبيعات
        returnTotalCOGS += lineCOGS;
        const inventoryKey = `${returnItem.productId}-${returnItem.warehouseId}`;
        const inventory = inventoryMap.get(inventoryKey);

        if (!inventory) {
          throw new Error(`المخزون غير موجود للمنتج ${returnItem.name}`);
        }

        const newStock = inventory.stockQuantity + quantityInUnits;
        const newAvailable = inventory.availableQuantity + quantityInUnits;

        // 🆕 Get selected unit info
        const selectedUnit = sellingUnits.find(
          (u: any) => u.id === returnItem.selectedUnitId,
        );

        // Prepare return sale item
        returnSaleItemsData.push(
          tx.saleItem.update({
            where: {
              id: originalSale.saleItems.find(
                (si) => si.productId === returnItem.productId,
              )!.id,
            },
            data: {
              companyId,
              saleId: returnSale.id,
              productId: returnItem.productId,
              quantity: returnItem.quantity,
              sellingUnit: returnItem.selectedUnitName, // 🆕 Unit name instead of type
              unitPrice: saleItem.unitPrice,
              totalPrice: saleItem.unitPrice.toNumber() * returnItem.quantity,
            },
          }),
          // 🆕 Store unit information
        );
        // Prepare stock movement
        stockMovementsData.push({
          companyId,
          productId: returnItem.productId,
          warehouseId: returnItem.warehouseId,
          userId: cashierId,
          movementType: "مرتجع",
          quantity: quantityInUnits,
          reason: reason ?? "إرجاع بيع",
          quantityBefore: inventory.stockQuantity,
          quantityAfter: newStock,
          referenceType: "إرجاع",
          referenceId: returnSale.id,
          notes: reason || undefined,
          // 🆕 Store unit information
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
        tx.stockMovement.createMany({ data: stockMovementsData }),
        ...returnSaleItemsData,
        ...inventoryUpdatesPromises,
      ]);

      // 7. Handle customer balance updates
      const customerUpdatePromises = [];

      if (customerId) {
        if (
          originalSale.paymentStatus === "unpaid" ||
          originalSale.paymentStatus === "partial"
        ) {
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
          tx.financialTransaction.create({
            data: {
              companyId,
              saleId: returnSale.id,
              userId: cashierId,
              customerId: originalSale.customerId,
              paymentMethod: paymentMethod || "cash",
              type: "PAYMENT",
              amount: returnToCustomer,
              status: "completed",
              notes: reason || "إرجاع بيع",
            },
          }),
        );
      }

      if (customerUpdatePromises.length > 0) {
        await Promise.all(customerUpdatePromises);
      }

      // 9. Create journal event for return
      const refundFromAR = Math.min(
        returnToCustomer,
        originalSaleAmountDue || 0,
      );
      const refundFromCashBank = returnToCustomer - refundFromAR;

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
            returnToCustomer,
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

  revalidatePath("/sells");
  return result;
}
