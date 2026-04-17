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
import { getActiveFiscalYears, validateFiscalYear } from "./fiscalYear";
import { serialize } from "v8";
import { getLatestExchangeRate } from "./currency";
import { SellingUnit } from "../zod";
import { console } from "inspector";
import { stat } from "fs";
import { sendRoleBasedNotification } from "../push-notifications";
import { shouldSendNotificationDigest } from "./notificationDigest";

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
    // 2. نستخرج الجزء الرقمي الأول ونحوله إلى أرقام صحيحة
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

  // 4. التنسيق إلى 6 خانات
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
export async function getNextVoucherNumber(
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
    guestCustomerName,
    saleNumber,
    exchangeRate,
    baseAmount,
    receivedAmount,
  } = data;
  await validateFiscalYear(companyId);
  let currentSaleNumber =
    typeof saleNumber === "string" ? saleNumber.trim() : "";

  for (let txAttempt = 0; txAttempt < 5; txAttempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          let status: string;
          if (baseAmount >= totalAfterDiscount) {
            status = "paid";
          } else if (baseAmount > 0 && baseAmount < totalAfterDiscount) {
            status = "partial";
          } else {
            status = "unpaid";
          }
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
          for (const item of cart) {
            const inventory = inventoryUnits.find(
              (i) =>
                i.productId === item.id && i.warehouseId === item.warehouseId,
            );

            if (!inventory) {
              throw new Error(`المنتج ${item.name} غير متوفر في هذا المستودع`);
            }

            // Convert requested qty to base unit (e.g., 1 Box -> 12 Pieces)
            const requestedBaseQty = toBaseQty(
              item.selectedQty,
              item.selectedUnitId,
              item.sellingUnits,
            );

            // Check if requested quantity exceeds available quantity
            if (requestedBaseQty > inventory.availableQuantity) {
              throw new Error(
                `كمية غير كافية للمنتج: ${item.name}. المتوفر: ${inventory.availableQuantity}، المطلوب بالوحدة الأساسية: ${requestedBaseQty}`,
              );
            }
          }
          const invoiceItemsData = cart.map((item: any) => ({
            companyId,
            productId: item.id,
            unit: item.selectedUnitName,
            quantity: item.selectedQty,
            price: item.selectedUnitPrice,
            discountAmount: totalDiscount || 0,
            totalPrice: item.selectedQty * item.selectedUnitPrice,
            // If you need warehouse info at the item level:
            // warehouseId: item.warehouseId
          }));
          const voucherNumber = await getNextVoucherNumber(
            companyId,
            "RECEIPT",
            tx,
          );
          const paymentDataTemplate = async (invoiceNo: string) =>
            baseAmount > 0
              ? {
                  companyId,
                  userId: cashierId,
                  branchId,
                  customerId: customer?.id,
                  voucherNumber,
                  currencyCode: currency,
                  exchangeRate: exchangeRate,
                  paymentMethod: "cash",
                  type: TransactionType.RECEIPT,
                  amount: receivedAmount,
                  status: "paid",
                  notes: `دفعة مبيعات للفاتورة رقم: ${invoiceNo}`,
                }
              : undefined;

          let effectiveSaleNumber = currentSaleNumber;
          if (
            !effectiveSaleNumber ||
            effectiveSaleNumber.startsWith("OFFLINE-")
          ) {
            effectiveSaleNumber = await generateSaleNumber(companyId);
          }

          const baseAmountDue = Math.max(0, totalAfterDiscount - baseAmount);
          const paymentData = await paymentDataTemplate(effectiveSaleNumber);
          // const entryNumber = `SALE-${new Date().getFullYear()}-${paymentData?.voucherNumber}`;

          const sale = await tx.invoice.create({
            data: {
              companyId,
              invoiceNumber: effectiveSaleNumber,
              customerId: customer?.id,
              customerName: customer?.name || guestCustomerName || null,
              cashierId,
              branchId: branchId,
              sale_type: "SALE",
              status,
              totalAmount: totalAfterDiscount,
              amountPaid: baseAmount,
              warehouseId: cart[0]?.warehouseId || cart.warehouseId,
              amountDue: baseAmountDue,
              items: {
                create: invoiceItemsData,
              },
              transactions: { create: paymentData },
            },
          });
          // ==========================================
          // 2. جلب المخزون لكل منتج ومستودع
          const entryNumber =
            baseAmount > 0
              ? `SALE-${new Date().getFullYear()}-${paymentData?.voucherNumber}`
              : `SALE-${new Date().getFullYear()}-${sale.invoiceNumber}`;

          const invMap = new Map(
            inventoryUnits.map((i) => [`${i.productId}-${i.warehouseId}`, i]),
          );

          const saleItems: any[] = [];
          const stockMovements: any[] = [];
          const inventoryUpdates: any[] = [];
          let returnTotalCOGS = 0;
          // ==========================================
          // 3. معالجة كل سطر في السلة
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
            // حساب إجمالي التكلفة لهذا السطر باستخدام الكمية الأساسية
            // مثال: 880 حبة × تكلفة الحبة الواحدة
            const lineCOGS = baseQty * costPerBaseUnit;
            // io.emit("refresh");

            // إضافة الناتج إلى إجمالي تكلفة المبيعات
            returnTotalCOGS += lineCOGS;
            console.log("lineCOGS", lineCOGS);
            // بند البيع بالوحدة المختارة
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

            // حركة المخزون بالوحدة الأساسية
            stockMovements.push({
              companyId,
              productId: item.id,
              warehouseId: item.warehouseId,
              movementType: "صادر بيع",
              quantity: baseQty,
              quantityBefore: inventory.stockQuantity,
              quantityAfter: inventory.stockQuantity - baseQty,
              referenceType: "فاتوره مبيعات",
              referenceId: sale.invoiceNumber,
              userId: cashierId,
            });

            inventoryUpdates.push({
              id: inventory.id,
              stockQuantity: inventory.stockQuantity - baseQty,
              availableQuantity: inventory.availableQuantity - baseQty,
            });
          }

          // ==========================================
          // 4. تنفيذ عمليات قاعدة البيانات
          // ==========================================
          await Promise.all([
            // tx.invoiceItem.createMany({ data: saleItems }),
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
          // 5. تحديث رصيد العميل
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
          revalidatePath("/cashiercontrol");
          // ==========================================
          // 7. إنشاء رأس القيد وخطوطه
          // ==========================================
          const [mappings, fy] = await Promise.all([
            tx.account_mappings.findMany({
              where: { company_id: companyId, is_default: true },
              select: { mapping_type: true, account_id: true },
            }),
            getActiveFiscalYears(),
          ]);

          const accountMap = new Map(
            mappings.map((m) => [m.mapping_type, m.account_id]),
          );
          const cash = accountMap.get("cash");
          const ar = accountMap.get("accounts_receivable");
          const revenue = accountMap.get("sales_revenue");
          const inventory = accountMap.get("inventory");
          const cogs = accountMap.get("cogs");

          if (!cash || !ar || !revenue || !inventory || !cogs) {
            throw new Error(
              "Missing required account mappings for sales journal entry",
            );
          }

          const entryYear = new Date().getFullYear();

          const desc = `Sales invoice: ${sale.invoiceNumber}`;
          const isForeign =
            currency &&
            baseCurrency &&
            currency !== baseCurrency &&
            exchangeRate &&
            exchangeRate !== 1;

          const toForeignAmount = (baseValue: number) => {
            if (!isForeign || !exchangeRate) return null;
            return Number((baseValue / exchangeRate).toFixed(2));
          };

          const createLine = (
            accountId: string,
            memo: string,
            debitBase: number,
            creditBase: number,
            useForeign: boolean,
          ) => {
            const baseValue = debitBase > 0 ? debitBase : creditBase;
            return {
              companyId,
              accountId,
              debit: debitBase,
              credit: creditBase,
              memo,
              ...(useForeign
                ? {
                    currencyCode: currency,
                    exchangeRate,
                    foreignAmount: toForeignAmount(baseValue),
                    baseAmount: baseValue,
                  }
                : {
                    currencyCode: baseCurrency,
                  }),
            };
          };

          const totalBase = Number(totalAfterDiscount);
          const paidBase = Number(baseAmount);
          const dueBase = Math.max(0, totalBase - paidBase);
          const lines: any[] = [];

          if (sale.status === "paid") {
            lines.push(
              createLine(revenue, desc, 0, totalBase, isForeign),
              createLine(cash, desc, paidBase, 0, isForeign),
            );
          } else if (sale.status === "partial") {
            if (paidBase > 0) {
              lines.push(
                createLine(cash, `${desc} - cash`, paidBase, 0, isForeign),
              );
            }
            lines.push(
              createLine(revenue, desc, 0, totalBase, isForeign),
              createLine(ar, `${desc} - due`, dueBase, 0, isForeign),
            );
          } else {
            lines.push(
              createLine(revenue, desc, 0, totalBase, isForeign),
              createLine(ar, desc, totalBase, 0, isForeign),
            );
          }

          if (returnTotalCOGS > 0) {
            lines.push(
              createLine(cogs, `${desc} - cogs`, returnTotalCOGS, 0, false),
              createLine(
                inventory,
                `${desc} - inventory`,
                0,
                returnTotalCOGS,
                false,
              ),
            );
          }

          await tx.journalHeader.create({
            data: {
              companyId,
              entryNumber,
              description: desc,
              branchId,
              referenceType: "فاتوره مبيعات",
              referenceId: sale.id,
              entryDate: new Date(),
              status: "POSTED",
              createdBy: cashierId,
              lines: {
                create: lines.map((line) => ({
                  ...line,
                  companyId,
                })),
              },
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
    } catch (error: any) {
      const isUniqueViolation = error?.code === "P2002";
      if (!isUniqueViolation || txAttempt === 4) {
        throw error;
      }
      currentSaleNumber = await generateSaleNumber(companyId);
    }
  }

  throw new Error("Failed to process sale after retries");
}
function getExpiryStatus(expiryDateInput: string | Date) {
  const now = new Date();
  const expiryDate = new Date(expiryDateInput);
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    isExpired: daysLeft < 0,
    isExpiringSoon: daysLeft >= 0 && daysLeft <= 30,
    daysLeft,
  };
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
        barcode: true,
        packetsPerCarton: true,
        unitsPerPacket: true,
        expiredAt: true,
        warehouseId: true,
        inventory: { select: { availableQuantity: true } },
      },
      take: 100,
    }),
    prisma.warehouse.findMany({ select: { id: true, name: true } }),
  ]);

  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

  const expiringSoon: string[] = [];
  const expiredAlready: string[] = [];

  activeProducts.forEach((product) => {
    if (product.expiredAt) {
      const status = getExpiryStatus(new Date(product.expiredAt));
      if (status.isExpired) {
        expiredAlready.push(product.name);
      } else if (status.isExpiringSoon) {
        expiringSoon.push(product.name);
      }
    }
  });

  // إرسال إشعار واحد ملخص في الخلفية بدون await
  if (expiredAlready.length > 0 || expiringSoon.length > 0) {
    const totalIssues = expiredAlready.length + expiringSoon.length;
    const bodyText = [
      expiredAlready.length > 0 ? `منتهية (${expiredAlready.length})` : "",
      expiringSoon.length > 0
        ? `توشك على الانتهاء (${expiringSoon.length})`
        : "",
    ]
      .filter(Boolean)
      .join(" و ");

    const digestKey = [
      `expired:${[...new Set(expiredAlready)].sort().join("|")}`,
      `soon:${[...new Set(expiringSoon)].sort().join("|")}`,
    ].join(";");

    const shouldSend = await shouldSendNotificationDigest(
      companyId,
      "expiry-summary",
      digestKey,
    );

    if (shouldSend) {
      // لا نستخدم await هنا لكي لا ينتظر الكاشير
      sendRoleBasedNotification(
        { companyId, targetRoles: ["admin", "cashier", "manager_wh"] },
        {
          title: "⚠️ تنبيه صلاحية المنتجات",
          body: `يوجد ${totalIssues} منتجات تحتاج انتباهك: ${bodyText}`,
          url: "/products?expiryStatus=attention",
          tag: `expiry-summary-${companyId}-${new Date().toISOString().split("T")[0]}`,
        },
      ).catch((err) => console.error("Notification Error:", err));
    }
  }

  return activeProducts.map((product) => {
    const sellingUnits = (product.sellingUnits as SellingUnit[]) || [];
    const availableUnits = product.inventory[0]?.availableQuantity ?? 0;

    const baseStock = product.inventory[0]?.availableQuantity || 0;
    const availableStock: Record<string, number> = {};

    sellingUnits.forEach((unit) => {
      // بما أن unitsPerParent تمثل عدد الوحدات الأساسية داخل هذه الوحدة
      // نقسم إجمالي baseStock على معامل الوحدة مباشرة
      if (unit.unitsPerParent > 0) {
        availableStock[unit.id] = Math.floor(baseStock / unit.unitsPerParent);
      } else {
        // لتجنب القسمة على صفر في حال وجود خطأ في البيانات
        availableStock[unit.id] = unit.isbase ? baseStock : 0;
      }
    });

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      sellingUnits,
      availableStock,
      warehouseId: product.warehouseId,
      warehousename: warehouseMap.get(product.warehouseId) ?? "",
      barcode: product.barcode ?? "",

      sellingMode: product.type ?? "", // Optional: helpful for debugging
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
    totalReturn,
    returnToCustomer,
    baseCurrency,
    exchangeRate,
    currency,
    foreignAmount,
    paymentMethod,
  } = data;

  const returnItems = items.filter((item: any) => item.quantity > 0);
  if (returnItems.length === 0) {
    return {
      success: false,
      message: "لم يتم تحديد أي صنف للإرجاع",
    };
  }

  await validateFiscalYear(companyId);

  const result = await prisma.$transaction(
    async (tx) => {
      const originalSale = await tx.invoice.findUnique({
        where: { id: saleId },
        select: {
          id: true,
          invoiceNumber: true,
          sale_type: true,
          amountDue: true,
          customerId: true,
          customerName: true,
          warehouseId: true,
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
                  sellingUnits: true,
                },
              },
            },
          },
        },
      });

      if (!originalSale) {
        throw new Error("فاتورة البيع غير موجودة");
      }

      if (originalSale.sale_type !== "SALE") {
        throw new Error("يمكن تنفيذ الإرجاع على فاتورة بيع فقط");
      }

      const existingReturnSale = await tx.invoice.findFirst({
        where: {
          companyId,
          sale_type: "RETURN_SALE",
          invoiceNumber: originalSale.invoiceNumber,
        },
        select: {
          id: true,
          totalAmount: true,
          amountPaid: true,
          currencyCode: true,
          foreignAmount: true,
          baseAmount: true,
          items: {
            select: {
              productId: true,
              quantity: true,
            },
          },
        },
      });

      if (existingReturnSale) {
        throw new Error(
          "تم إرجاع هذه الفاتورة مسبقاً، لا يمكن إرجاعها مرة أخرى",
        );
      }

      const returnedQuantityMap = new Map<string, number>();
      const originalSaleAmountDue = Number(originalSale.amountDue || 0);
      const saleItemsMap = new Map(
        originalSale.items.map((item) => [item.productId, item]),
      );
      const returnInvoiceNumber = originalSale.invoiceNumber.replace(
        "بيع",
        "مرتجع",
      );

      let returnSubtotal =
        typeof totalReturn === "number" && Number.isFinite(totalReturn)
          ? totalReturn
          : 0;
      let returnTotalCOGS = 0;

      const productIds = returnItems.map((item: any) => item.productId);
      const inventories = await tx.inventory.findMany({
        where: {
          companyId,
          productId: { in: productIds },
        },
      });

      const inventoryMap = new Map(
        inventories.map((inv) => [`${inv.productId}-${inv.warehouseId}`, inv]),
      );

      const invoiceItemsData: any[] = [];
      const stockMovementsData: any[] = [];
      const inventoryUpdatesPromises: Prisma.PrismaPromise<any>[] = [];

      for (const returnItem of returnItems) {
        const saleItem = saleItemsMap.get(returnItem.productId);
        if (!saleItem) {
          throw new Error(
            `الصنف ${returnItem.name} غير موجود في فاتورة البيع الأصلية`,
          );
        }

        if (returnItem.quantity > saleItem.quantity.toNumber()) {
          throw new Error(
            `كمية الإرجاع للصنف ${returnItem.name} أكبر من الكمية المباعة`,
          );
        }

        const alreadyReturnedQty =
          returnedQuantityMap.get(returnItem.productId) || 0;
        const remainingReturnableQty =
          saleItem.quantity.toNumber() - alreadyReturnedQty;

        if (remainingReturnableQty <= 0) {
          throw new Error(
            `تم إرجاع كامل الكمية سابقًا للصنف ${returnItem.name}`,
          );
        }

        if (returnItem.quantity > remainingReturnableQty) {
          throw new Error(
            `الكمية المتبقية القابلة للإرجاع للصنف ${returnItem.name} هي ${remainingReturnableQty} فقط`,
          );
        }

        const product = saleItem.product;
        const sellingUnits = (product.sellingUnits as any[]) || [];
        const quantityInUnits = toBaseQty(
          returnItem.quantity,
          returnItem.selectedUnitId,
          sellingUnits,
        );
        const costPerBaseUnit = product.costPrice.toNumber();
        const lineCOGS = quantityInUnits * costPerBaseUnit;
        returnTotalCOGS += lineCOGS;

        if (
          !(typeof totalReturn === "number" && Number.isFinite(totalReturn))
        ) {
          returnSubtotal += saleItem.price.toNumber() * returnItem.quantity;
        }

        const inventoryKey = `${returnItem.productId}-${returnItem.warehouseId}`;
        const inventory = inventoryMap.get(inventoryKey);

        if (!inventory) {
          throw new Error(`لا يوجد مخزون مرتبط بالصنف ${returnItem.name}`);
        }

        const newStock = inventory.stockQuantity + quantityInUnits;
        const newAvailable = inventory.availableQuantity + quantityInUnits;

        invoiceItemsData.push({
          companyId,
          productId: returnItem.productId,
          quantity: returnItem.quantity,
          unit: returnItem.selectedUnitName,
          price: saleItem.price,
          totalPrice: saleItem.price.toNumber() * returnItem.quantity,
        });

        stockMovementsData.push({
          companyId,
          productId: returnItem.productId,
          warehouseId: returnItem.warehouseId,
          userId: cashierId,
          movementType: "مرتجع بيع",
          quantity: quantityInUnits,
          reason: reason ?? "مرتجع بيع",
          quantityBefore: inventory.stockQuantity,
          quantityAfter: newStock,
          referenceType: "مرتجع",
          referenceId: saleId,
          notes: reason || undefined,
        });

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

      returnSubtotal = Number(returnSubtotal.toFixed(2));

      const returnSale = await tx.invoice.create({
        data: {
          companyId,
          invoiceNumber: returnInvoiceNumber,
          customerId: originalSale.customerId,
          customerName: originalSale.customerName,
          cashierId,
          branchId,
          warehouseId: returnItems[0]?.warehouseId ?? originalSale.warehouseId,
          sale_type: "RETURN_SALE",
          status: returnToCustomer > 0 ? "paid" : "completed",
          totalAmount: returnSubtotal,
          amountPaid: returnToCustomer,
          amountDue: 0,
          currencyCode: currency || baseCurrency,
          exchangeRate,
          foreignAmount: foreignAmount ?? returnSubtotal,
          baseAmount: returnSubtotal,
          items: {
            create: invoiceItemsData,
          },
        },
      });

      stockMovementsData.forEach((movement) => {
        movement.referenceId = returnSale.id;
      });

      await Promise.all([
        tx.stockMovement.createMany({ data: stockMovementsData }),
        ...inventoryUpdatesPromises,
      ]);
      const voucherNumber = await getNextVoucherNumber(
        companyId,
        "PAYMENT",
        tx,
      );
      const customerOperations: Prisma.PrismaPromise<any>[] = [];
      const returnAgainstReceivable = Math.min(
        originalSaleAmountDue,
        Math.max(0, returnSubtotal - returnToCustomer),
      );

      if (customerId && returnAgainstReceivable > 0) {
        customerOperations.push(
          tx.customer.update({
            where: { id: customerId, companyId },
            data: {
              outstandingBalance: { decrement: returnAgainstReceivable },
            },
          }),
        );
      }

      if (returnToCustomer > 0) {
        customerOperations.push(
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
              status: "paid",
              notes: reason || "مرتجع بيع",
            },
          }),
        );
      }

      if (customerOperations.length > 0) {
        await Promise.all(customerOperations);
      }

      const mappings = await tx.account_mappings.findMany({
        where: { company_id: companyId, is_default: true },
        select: { mapping_type: true, account_id: true },
      });

      const accountMap = new Map(
        mappings.map((mapping) => [mapping.mapping_type, mapping.account_id]),
      );
      const cash = accountMap.get("cash");
      const ar = accountMap.get("accounts_receivable");
      const revenue = accountMap.get("sales_revenue");
      const inventory = accountMap.get("inventory");
      const cogs = accountMap.get("cogs");

      if (!cash || !ar || !revenue || !inventory || !cogs) {
        throw new Error(
          "Missing required account mappings for return sales journal entry",
        );
      }
      let createdTransactions = [];

      if (customerOperations.length > 0) {
        // Promise.all returns the actual results of the database operations
        createdTransactions = await Promise.all(customerOperations);
      }

      // Now you can access the voucherNumber from the first (or relevant) transaction
      const voucherFromDb =
        createdTransactions.length > 0
          ? createdTransactions[0].voucherNumber
          : "N/A";

      // Fix your entryNumber logic:
      const entryNumber = `RET-${new Date().getFullYear()}-${voucherFromDb}`;

      const desc = `Sales return: ${returnSale.invoiceNumber} / original ${originalSale.invoiceNumber}`;
      const isForeign =
        currency &&
        baseCurrency &&
        currency !== baseCurrency &&
        exchangeRate &&
        exchangeRate !== 1;

      const toForeignAmount = (baseValue: number) => {
        if (!isForeign || !exchangeRate) return null;
        return Number((baseValue / exchangeRate).toFixed(2));
      };

      const createLine = (
        accountId: string,
        memo: string,
        debitBase: number,
        creditBase: number,
        useForeign: boolean,
      ) => {
        const baseValue = debitBase > 0 ? debitBase : creditBase;
        return {
          companyId,
          accountId,
          debit: debitBase,
          credit: creditBase,
          memo,
          ...(useForeign
            ? {
                currencyCode: currency,
                exchangeRate,
                foreignAmount: toForeignAmount(baseValue),
                baseAmount: baseValue,
              }
            : {
                currencyCode: baseCurrency,
              }),
        };
      };

      const journalLines: any[] = [
        createLine(revenue, desc, returnSubtotal, 0, Boolean(isForeign)),
      ];

      if (returnToCustomer > 0) {
        journalLines.push(
          createLine(
            cash,
            `${desc} - refund`,
            0,
            returnToCustomer,
            Boolean(isForeign),
          ),
        );
      }

      if (returnAgainstReceivable > 0) {
        journalLines.push(
          createLine(
            ar,
            `${desc} - receivable reversal`,
            0,
            returnAgainstReceivable,
            Boolean(isForeign),
          ),
        );
      }

      if (returnTotalCOGS > 0) {
        journalLines.push(
          createLine(
            inventory,
            `${desc} - inventory`,
            returnTotalCOGS,
            0,
            false,
          ),
          createLine(cogs, `${desc} - cogs`, 0, returnTotalCOGS, false),
        );
      }

      await tx.journalHeader.create({
        data: {
          companyId,
          entryNumber,
          description: desc,
          branchId,
          referenceType: "ارجاع مبيعات",
          referenceId: returnSale.id,
          entryDate: new Date(),
          status: "POSTED",
          createdBy: cashierId,
          lines: {
            create: journalLines.map((line) => ({
              ...line,
              companyId,
            })),
          },
        },
      });

      const cleanReturnSale = JSON.parse(JSON.stringify(returnSale));
      return {
        success: true,
        message: "تمت معالجة المرتجع بنجاح",
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
