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
import { Prisma, TransactionType } from "@prisma/client";
import { getActiveFiscalYears } from "./fiscalYear";
import { serialize } from "v8";
import { getLatestExchangeRate } from "./currency";
import { SellingUnit } from "../zod";
import { console } from "inspector";
import { stat } from "fs";
import { io } from "socket.io-client";

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

  // 1. نجلب كل أرقام الفواتير التي تنتهي بنفس الصيغة لهذه الشركة
  const allInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      invoiceNumber: {
        endsWith: prefix,
      },
    },
    select: {
      invoiceNumber: true,
    },
  });

  let nextNumber = 1;

  if (allInvoices.length > 0) {
    // 2. نستخرج الجزء الرقمي (الأول) ونحوله إلى أرقام صحيحة
    const sequenceNumbers = allInvoices
      .map((inv) => {
        const parts = inv.invoiceNumber.split("-");
        return parseInt(parts[0], 10);
      })
      .filter((num) => !isNaN(num));

    // 3. نأخذ أكبر رقم موجود ونضيف عليه 1
    if (sequenceNumbers.length > 0) {
      nextNumber = Math.max(...sequenceNumbers) + 1;
    }
  }

  // 4. التنسيق بـ 6 خانات
  const formattedNumber = nextNumber.toString().padStart(6, "0");
  return `${formattedNumber}${prefix}`;
}

/**
 * Alternative: Simpler format without year
 * Format: SALE-000001
 */
// export async function generateSimpleSaleNumber(
//   companyId: string,
// ): Promise<string> {
//   const prefix = "SALE-";

//   const lastSale = await prisma.sale.findFirst({
//     where: {
//       companyId,
//       saleNumber: {
//         startsWith: prefix,
//       },
//     },
//     orderBy: {
//       saleNumber: "desc",
//     },
//     select: {
//       saleNumber: true,
//     },
//   });

//   let nextNumber = 1;

//   if (lastSale) {
//     const lastNumberStr = lastSale.saleNumber.split("-").pop();
//     const lastNumber = parseInt(lastNumberStr || "0", 10);
//     nextNumber = lastNumber + 1;
//   }

//   const formattedNumber = nextNumber.toString().padStart(6, "0");
//   return `${prefix}${formattedNumber}`;
// }

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
      MAX(CAST(SUBSTRING(invoice_number FROM ${prefix.length + 1}) AS INTEGER)),
      0
    ) + 1 AS next_number
    FROM invoices
    WHERE company_id = '${companyId}'
      AND invoice_number LIKE '${prefix}%'
      AND invoice_number ~ '^${prefix}[0-9]+$'
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
async function getNextVoucherNumber(
  companyId: string,
  type: "RECEIPT" | "PAYMENT",
  tx: any,
): Promise<number> {
  // Generate a unique lock ID based on companyId and type
  const lockId = hashToInt(companyId + type);

  // Acquire advisory lock (automatically released at end of transaction)
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

  // Now safely get the max voucher number
  const result = await tx.$queryRaw<Array<{ max_voucher: number | null }>>`
    SELECT COALESCE(MAX(voucher_number), 0) as max_voucher
    FROM financial_transactions
    WHERE company_id = ${companyId}
      AND type = ${type}::"TransactionType"
  `;

  const maxVoucher = result[0]?.max_voucher ?? 0;
  return maxVoucher + 1;
}

// Helper function to convert string to integer for advisory lock
function hashToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export async function processSale(data: any, companyId: string) {
  const {
    cart,
    totalBeforeDiscount,
    totalDiscount,
    currency,
    totalAfterDiscount,
    cashierId,
    baseCurrency,
    branchId,
    customer,
    saleNumber,
    exchangeRate,
    baseAmount,
    receivedAmount,
  } = data;
  console.log(customer);
  return await prisma.$transaction(
    async (tx) => {
      let status: string;
      if (baseAmount >= totalAfterDiscount) {
        status = "paid"; // تم التعديل من === إلى =
      } else if (baseAmount > 0 && baseAmount < totalAfterDiscount) {
        status = "partial";
      } else {
        status = "unpaid";
      }
      const baseAmountDue = Math.max(0, totalAfterDiscount - baseAmount);
      const sale = await tx.invoice.create({
        data: {
          companyId,
          invoiceNumber: saleNumber,
          customerId: customer?.id,
          cashierId,
          branchId: branchId,
          sale_type: "SALE",
          status,
          totalAmount: totalAfterDiscount,
          amountPaid: baseAmount,
          warehouseId: cart[0]?.warehouseId || cart.warehouseId,
          amountDue: baseAmountDue,
        },
      });
      console.log(customer);
      // ==========================================
      // 2️⃣ Fetch inventory per PRODUCT + UNIT

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
        // io.emit("refresh");

        // 4. إضافة الناتج للإجمالي الكلي للمبيعات
        returnTotalCOGS += lineCOGS;
        console.log("lineCOGS", lineCOGS);
        // 🟢 Sale Item (بالوحدة المختارة)
        saleItems.push({
          companyId,
          invoiceId: sale.id,
          productId: item.id,

          unit: item.selectedUnitName,
          quantity: item.selectedQty,
          price: item.selectedUnitPrice,
          discountAmount: totalDiscount,

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
        tx.invoiceItem.createMany({ data: saleItems }),
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
      if (customer?.id) {
        const delta = totalAfterDiscount - receivedAmount;

        if (delta !== 0) {
          await tx.customer.update({
            where: { id: customer?.id, companyId },
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
      if (baseAmount > 0) {
        const voucherNumber = await getNextVoucherNumber(
          companyId,
          "RECEIPT",
          tx,
        );
        let status: string;
        if (baseAmount >= totalAfterDiscount) {
          status = "paid"; // تم التعديل من === إلى =
        } else if (baseAmount > 0 && baseAmount < totalAfterDiscount) {
          status = "partial";
        } else {
          status = "unpaid";
        }
        await tx.financialTransaction.create({
          data: {
            companyId,
            //     invoiceId: sale.id,
            userId: cashierId,
            branchId,
            customerId: customer?.id,
            voucherNumber,
            currencyCode: currency,
            exchangeRate: exchangeRate,
            paymentMethod: "cash",
            type: "RECEIPT",
            amount: receivedAmount,
            status: "paid",
            notes: ` فاتوره شراء:${sale.invoiceNumber}`,
          },
        });
        // await tx.financialTransaction.create({
        //   data: {
        //     companyId,
        //     invoiceId: sale.id,
        //     userId: cashierId,
        //     branchId,
        //     customerId: customer?.id,
        //     voucherNumber: nextNumber,
        //     currencyCode: currency,
        //     exchangeRate: exchangeRate,
        //     paymentMethod: "cash",
        //     type: "RECEIPT",
        //     amount: receivedAmount,
        //     status: status,
        //     notes: ` فاتوره شراء:${sale.invoiceNumber}`,
        //   },
        // });
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
              saleNumber: sale.invoiceNumber,
              sale_type: sale.sale_type,
              status: sale.status,
              totalAmount: totalAfterDiscount,
              amountPaid: baseAmount,
              ...(currency !== baseCurrency && {
                foreignAmount: receivedAmount, // المبلغ بالدولار مثلاً
                exchangeRate: exchangeRate,
                foreignCurrency: currency,
              }),
              baseAmount: baseAmount,
              branchId: branchId,
              baseCurrency,
              currency,
              // paymentStatus: sale.paymentStatus,
            },
            customer,
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

export async function processReturn(data: any, companyId: string) {
  const {
    saleId,
    cashierId,
    customerId,
    branchId,
    returnNumber,
    reason,

    items,
    returnToCustomer,
    baseCurrency,
    exchangeRate,
    currency,
    foreignAmount,
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
      const originalSale = await tx.invoice.findUnique({
        where: { id: saleId },
        select: {
          invoiceNumber: true,
          amountDue: true,
          customerId: true,
          transactions: { select: { status: true } },
          items: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              price: true,
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

      // const nextNumber = String(formattedNumber).padStart(5, "0");
      const originalNumber = returnNumber;
      const randomNumber = Math.floor(Math.random() * 90 + 10); // يولد رقماً بين 10 و 99
      const returnNumberWithArabic =
        originalNumber.replace("بيع", "مرتجع") + randomNumber;
      const originalSaleAmountDue = originalSale.amountDue?.toNumber() || 0;

      // 2. Create maps and helper functions
      const saleItemsMap = new Map(
        originalSale.items.map((item) => [item.productId, item]),
      );

      let returnSubtotal = 0;
      let returnTotalCOGS = 0;

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
      const returnSale = await tx.invoice.update({
        where: {
          id: saleId,
          companyId,
        },
        data: {
          companyId,

          invoiceNumber: returnNumberWithArabic,
          customerId: originalSale.customerId,
          cashierId,
          sale_type: "RETURN_SALE",
          status: "completed",

          totalAmount: returnToCustomer,
          amountPaid: returnToCustomer,
          amountDue: 0,
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
          tx.invoiceItem.update({
            where: {
              id: originalSale.items.find(
                (si) => si.productId === returnItem.productId,
              )!.id,
            },
            data: {
              companyId,

              invoiceId: returnSale.id,
              productId: returnItem.productId,
              quantity: returnItem.quantity,
              unit: returnItem.selectedUnitName, // 🆕 Unit name instead of type
              price: saleItem.price,
              totalPrice: saleItem.price.toNumber() * returnItem.quantity,
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
          originalSale.transactions[0].status === "unpaid" ||
          originalSale.transactions[0].status === "partial"
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
        const voucherNumber = await getNextVoucherNumber(
          companyId,
          "PAYMENT",
          tx,
        );

        customerUpdatePromises.push(
          tx.financialTransaction.create({
            data: {
              companyId,
              branchId,
              currencyCode: currency,
              invoiceId: returnSale.id,
              userId: cashierId,
              voucherNumber,
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
            branchId,
            ...(currency !== baseCurrency && {
              foreignAmount: foreignAmount, // المبلغ بالدولار مثلاً
              exchangeRate: exchangeRate,
              foreignCurrency: currency,
            }),
            baseCurrency,
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
