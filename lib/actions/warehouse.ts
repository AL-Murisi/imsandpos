// app/actions/warehouse.ts
"use server";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";

import { z } from "zod";
import { Prisma, TransactionType } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
import {
  CashierSchema,
  CreateWarehouseSchema,
  InventoryUpdateWithTrackingSchema,
  UpdateWarehouseSchema,
  UpdateWarehouseInput,
  WarehouseInput,
  SellingUnit,
} from "@/lib/zod";
import { PaymentState } from "@/components/common/ReusablePayment";
import { getNextVoucherNumber } from "./cashier";
import { sendRoleBasedNotification } from "@/lib/push-notifications";
import { canCreateSubscriptionResource } from "./subscription";
import {
  markNotificationDigestSent,
  shouldSendNotificationDigest,
} from "./notificationDigest";
function serializeData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item)) as T;
  }

  const plainObj: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Prisma.Decimal) {
      plainObj[key] = value.toNumber(); // or value.toString() if you prefer
    } else if (value instanceof Date) {
      plainObj[key] = value.toISOString();
    } else if (typeof value === "bigint") {
      plainObj[key] = value.toString();
    } else if (typeof value === "object" && value !== null) {
      plainObj[key] = serializeData(value);
    } else {
      plainObj[key] = value;
    }
  }

  return plainObj;
}

async function getDefaultAccountMap(
  tx: any,
  companyId: string,
): Promise<Map<string, string>> {
  const mappings = await tx.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
    select: { mapping_type: true, account_id: true },
  });

  return new Map<string, string>(
    mappings.map((m: any) => [String(m.mapping_type), String(m.account_id)]),
  );
}

function resolveSettlementAccount(
  accountMap: Map<string, string>,
  paymentMethod?: string | null,
) {
  if (paymentMethod === "bank") {
    return accountMap.get("bank") || accountMap.get("cash");
  }
  return accountMap.get("cash");
}

function buildWarehouseJournalLine(
  companyId: string,
  accountId: string,
  memo: string,
  debitBase: number,
  creditBase: number,
  options: {
    currency?: string | null;
    baseCurrency?: string | null;
    exchangeRate?: number | null;
    foreignAmount?: number | null;
  } = {},
) {
  const { currency, baseCurrency, exchangeRate, foreignAmount } = options;
  const baseValue = debitBase > 0 ? debitBase : creditBase;
  const useForeign =
    Boolean(currency) &&
    Boolean(baseCurrency) &&
    currency !== baseCurrency &&
    Boolean(exchangeRate) &&
    exchangeRate !== 1;

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
          foreignAmount:
            foreignAmount ??
            Number((baseValue / Number(exchangeRate)).toFixed(2)),
          baseAmount: baseValue,
        }
      : {
          currencyCode: baseCurrency || currency || undefined,
        }),
  };
}
export type InventoryUpdateWithTrackingInput = z.infer<
  typeof InventoryUpdateWithTrackingSchema
>;

interface ExtendedInventoryUpdateData {
  id: string;

  reason?: string;
  notes?: string;
  availableQuantity?: number;
  stockQuantity?: number;
  productId?: string;
  supplierId?: string;
  quantity?: number;
  unitCost?: number;
  paymentMethod?: string;
  paymentAmount?: number;
  updateType?: "manual" | "supplier"; // <-- Explicitly allow this transient field
  reorderLevel?: number;
  maxStockLevel?: number;
  status?: string;
  warehouseId: string;
  lastStockTake?: string | Date; // 💡 FIX: Allow Date object or string for compatibility with form input/default values
  bankId?: string;
  transferNumber?: string;
  currency_code?: string;
  exchangeRate?: number;
  amountFC?: number;
}

export async function fetchAllFormDatas(companyId: string) {
  try {
    const [warehouses, suppliers, inventories] = await Promise.all([
      prisma.warehouse.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true, location: true },
        orderBy: { name: "asc" },
      }),

      // Suppliers
      prisma.supplier.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),

      // Inventories
      prisma.inventory.findMany({
        where: { companyId },
        select: {
          id: true,
          productId: true,
          warehouseId: true,
          stockQuantity: true,

          reservedQuantity: true,
          reorderLevel: true,
          status: true,
          batches: {
            select: { supplierId: true, costPrice: true },
          },
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              sellingUnits: true,
            },
          },
          warehouse: {
            select: { name: true, location: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);

    // 1. Extract unique products from the inventory records for your selection list
    // We use a Map to ensure that if a product is in multiple warehouses, it only appears once
    const productList = inventories.map((item) => ({
      id: item.productId,
      sku: item.product.sku,
      // We combine the name so the user sees which warehouse they are picking
      name: `${item.product.name} (${item.warehouse.name})`,
      sellingUnits: item.product.sellingUnits,
      // Pass these along so the frontend can auto-select the warehouse
    }));
    const inventory = inventories.map((inv) => ({
      ...inv,
      availableQuantity: inv.stockQuantity - inv.reservedQuantity,
    }));
    return {
      products: serializeData(productList), // Flat list for dropdowns
      warehouses,
      suppliers,
      inventories: serializeData(inventory), // Full inventory details
    };
  } catch (error) {
    console.error("Error fetching form data:", error);
    return {
      products: [],
      warehouses: [],
      suppliers: [],
      inventories: [],
    };
  }
}
function availableQty(inv: {
  stockQuantity: number;
  reservedQuantity: number;
}): number {
  return inv.stockQuantity - inv.reservedQuantity;
}

/** Derive inventory status from live quantities */
function deriveStatus(
  available: number,
  reorderLevel: number,
): "available" | "low" | "out_of_stock" {
  if (available <= 0) return "out_of_stock";
  if (available <= reorderLevel) return "low";
  return "available";
}
// export async function processPurchaseReturn(
//   data: PurchaseReturnData,
//   userId: string,
//   companyId: string,
// ) {
//   const {
//     purchaseId,
//     purchaseItemId,
//     warehouseId,
//     returnQuantity,
//     returnUnit,
//     unitCost,
//     branchId,
//     transferNumber,
//     paymentMethod,
//     baseCurrency,
//     baseAmount,
//     currency,
//     exchangeRate,
//     refundAmount = 0,
//     reason,
//   } = data;

//   try {
//     let purchaseReturn;
//     const result = await prisma.$transaction(
//       async (tx) => {
//         const accountMap = await getDefaultAccountMap(tx, companyId);
//         const inventoryAccount = accountMap.get("inventory");
//         const payableAccount = accountMap.get("accounts_payable");
//         const settlementAccount = resolveSettlementAccount(
//           accountMap,
//           paymentMethod,
//         );

//         const originalPurchase = await tx.invoice.findUnique({
//           where: { id: purchaseId, companyId, sale_type: "PURCHASE" },
//           select: {
//             id: true,
//             invoiceNumber: true,
//             sale_type: true,
//             amountDue: true,
//             items: {
//               where: { id: purchaseItemId },
//               include: {
//                 product: {
//                   select: {
//                     id: true,
//                     sellingUnits: true,
//                   },
//                 },
//               },
//             },
//             supplier: {
//               select: {
//                 id: true,
//                 totalPurchased: true,
//                 totalPaid: true,
//                 outstandingBalance: true,
//               },
//             },
//           },
//         });

//         if (!originalPurchase) {
//           throw new Error("عملية الشراء الأصلية غير موجودة");
//         }

//         if (originalPurchase.sale_type !== "PURCHASE") {
//           throw new Error("يمكن تنفيذ الإرجاع على فاتورة شراء فقط");
//         }

//         if (!inventoryAccount || !payableAccount) {
//           throw new Error(
//             "Missing required account mappings for purchase return journal entry",
//           );
//         }

//         if (refundAmount > 0 && !settlementAccount) {
//           throw new Error(
//             "Missing settlement account mapping for purchase return refund",
//           );
//         }

//         if (originalPurchase.items.length === 0) {
//           throw new Error("عنصر الشراء غير موجود");
//         }

//         const purchaseItem = originalPurchase.items[0];
//         const product = purchaseItem.product;
//         const supplier = originalPurchase.supplier;
//         const productId = product.id;
//         const supplierId = supplier?.id;
//         const returnInvoiceNumber = originalPurchase.invoiceNumber.replace(
//           "مشتريات",
//           "مرتجع",
//         );

//         const existingReturnPurchase = await tx.invoice.findFirst({
//           where: {
//             companyId,
//             sale_type: "RETURN_PURCHASE",
//             invoiceNumber: returnInvoiceNumber,
//           },
//           select: { id: true },
//         });

//         if (existingReturnPurchase) {
//           throw new Error(
//             "تم إرجاع هذه الفاتورة للمورد مسبقاً، لا يمكن إرجاعها مرة أخرى",
//           );
//         }

//         const inventory = await tx.inventory.findUnique({
//           where: {
//             companyId_productId_warehouseId: {
//               companyId,
//               productId,
//               warehouseId,
//             },
//           },
//           select: {
//             stockQuantity: true,
//             availableQuantity: true,
//             reorderLevel: true,
//           },
//         });

//         if (!inventory) {
//           throw new Error("سجل المخزون غير موجود");
//         }

//         const sellingUnits = (product.sellingUnits as any[]) || [];
//         const selectedUnit = sellingUnits.find(
//           (u: any) => u.name === returnUnit,
//         );
//         const returnQuantityInUnits = convertToBaseUnits(
//           returnQuantity,
//           selectedUnit,
//           sellingUnits,
//         );

//         if (returnQuantityInUnits > inventory.stockQuantity) {
//           throw new Error(
//             `لا يمكن إرجاع كمية أكبر من المخزون الحالي (${inventory.stockQuantity})`,
//           );
//         }

//         const inventoryRecord = await tx.inventory.findUnique({
//           where: {
//             companyId_productId_warehouseId: {
//               companyId,
//               productId,
//               warehouseId,
//             },
//           },
//           select: { id: true },
//         });
//         if (!inventoryRecord) {
//           throw new Error("سجل المخزون غير موجود");
//         }

//         // Consume returned quantity from batches (FIFO by oldest received first)

//         const returnTotalCost = returnQuantity * unitCost;
//         const payableReduction = Math.max(0, returnTotalCost - refundAmount);
//         if (Number(originalPurchase.amountDue) > 0) {
//           await tx.invoice.update({
//             where: { id: purchaseId, companyId },
//             data: {
//               amountDue: Number(0),
//             },
//           });
//         }
//         purchaseReturn = await tx.invoice.create({
//           data: {
//             companyId,
//             invoiceNumber: returnInvoiceNumber,
//             cashierId: userId,
//             branchId,
//             warehouseId,
//             supplierId,
//             sale_type: "RETURN_PURCHASE",
//             totalAmount: returnTotalCost,
//             amountPaid: refundAmount,
//             amountDue: 0,
//             status: "completed",
//             currencyCode: currency || baseCurrency || "",
//             exchangeRate,
//             baseAmount,
//             foreignAmount:
//               currency && baseCurrency && currency !== baseCurrency
//                 ? refundAmount
//                 : undefined,
//             items: {
//               create: {
//                 companyId,
//                 productId,
//                 quantity: returnQuantity,
//                 price: unitCost,
//                 unit: returnUnit,
//                 totalPrice: returnTotalCost,
//               },
//             },
//           },
//         });
//         await tx.inventoryBatch.updateMany({
//           where: { invoiceItemId: originalPurchase.items[0].id },
//           data: { remainingQuantity: { decrement: returnQuantity } },
//         });

//         const newStockQty = inventory.stockQuantity - returnQuantityInUnits;
//         const newAvailableQty =
//           inventory.availableQuantity - returnQuantityInUnits;

//         await tx.inventory.update({
//           where: {
//             companyId_productId_warehouseId: {
//               companyId,
//               productId,
//               warehouseId,
//             },
//           },
//           data: {
//             stockQuantity: newStockQty,
//             availableQuantity: newAvailableQty,
//             status:
//               newAvailableQty <= 0
//                 ? "out_of_stock"
//                 : newAvailableQty <= inventory.reorderLevel
//                   ? "low"
//                   : "available",
//           },
//         });

//         await tx.stockMovement.create({
//           data: {
//             companyId,
//             productId,
//             warehouseId,
//             userId,
//             movementType: "صادر",
//             quantity: returnQuantityInUnits,
//             reason: "إرجاع للمورد",
//             quantityBefore: inventory.stockQuantity,
//             quantityAfter: newStockQty,
//             referenceType: "مرتجع مشتريات",
//             referenceId: purchaseReturn.id,
//             notes:
//               reason ||
//               `إرجاع ${returnQuantity} ${returnUnit} من فاتورة ${purchaseId}`,
//           },
//         });
//         const voucherNumber = await getNextVoucherNumber(
//           companyId,
//           "RECEIPT",
//           tx,
//         );
//         let payment;
//         if (refundAmount > 0 && paymentMethod) {
//           const payments = await tx.financialTransaction.create({
//             data: {
//               companyId,
//               supplierId,
//               currencyCode: currency || baseCurrency || "",
//               invoiceId: purchaseReturn.id,
//               branchId,
//               type: "RECEIPT",
//               purchaseId: purchaseReturn.id,
//               voucherNumber: voucherNumber,
//               userId: userId,
//               status: "paid",
//               amount: refundAmount,
//               exchangeRate,
//               baseAmount,
//               foreignAmount:
//                 currency && baseCurrency && currency !== baseCurrency
//                   ? refundAmount
//                   : undefined,
//               paymentMethod,
//               referenceNumber: transferNumber,
//               notes:
//                 reason ||
//                 `استرداد مبلغ من المورد - فاتورة ${returnInvoiceNumber}`,
//             },
//           });
//           payment = payments.voucherNumber;
//         }
//         const entryNumber = `PURET-${new Date().getFullYear()}-${payment}`;

//         await tx.supplier.update({
//           where: { id: supplierId },
//           data: {
//             totalPurchased: {
//               set: Math.max(
//                 0,
//                 Number(supplier?.totalPurchased) - returnTotalCost,
//               ),
//             },
//             ...(refundAmount > 0 && {
//               totalPaid: {
//                 set: Math.max(0, Number(supplier?.totalPaid) - refundAmount),
//               },
//             }),
//             outstandingBalance: {
//               set: Math.max(
//                 0,
//                 Number(supplier?.outstandingBalance) - payableReduction,
//               ),
//             },
//           },
//         });

//         const desc = `Purchase return: ${purchaseReturn.invoiceNumber}`;
//         const journalLines: any[] = [];

//         if (refundAmount > 0 && settlementAccount) {
//           journalLines.push(
//             buildWarehouseJournalLine(
//               companyId,
//               settlementAccount,
//               `${desc} - refund`,
//               refundAmount,
//               0,
//               {
//                 currency,
//                 baseCurrency,
//                 exchangeRate,
//                 foreignAmount:
//                   currency && baseCurrency && currency !== baseCurrency
//                     ? refundAmount
//                     : undefined,
//               },
//             ),
//           );
//         }

//         if (payableReduction > 0) {
//           journalLines.push(
//             buildWarehouseJournalLine(
//               companyId,
//               payableAccount,
//               `${desc} - payable reversal`,
//               payableReduction,
//               0,
//               {
//                 currency,
//                 baseCurrency,
//                 exchangeRate,
//               },
//             ),
//           );
//         }

//         journalLines.push(
//           buildWarehouseJournalLine(
//             companyId,
//             inventoryAccount,
//             `${desc} - inventory`,
//             0,
//             returnTotalCost,
//             {
//               currency,
//               baseCurrency,
//               exchangeRate,
//             },
//           ),
//         );

//         await tx.journalHeader.create({
//           data: {
//             companyId,
//             entryNumber,
//             description: desc,
//             branchId,
//             referenceType: "مرتجع مشتريات",
//             referenceId: purchaseReturn.id,
//             entryDate: new Date(),
//             status: "POSTED",
//             createdBy: userId,
//             lines: {
//               create: journalLines.map((line) => ({
//                 ...line,
//                 companyId,
//               })),
//             },
//           },
//         });

//         return {
//           success: true,
//           message: "تم إرجاع المشتريات بنجاح",
//           purchaseReturn,
//           returnAmount: returnTotalCost,
//           refundAmount,
//           originalPurchaseId: purchaseId,
//         };
//       },
//       {
//         timeout: 20000,
//         maxWait: 5000,
//       },
//     );

//     revalidatePath("/manageStocks");

//     return result;
//   } catch (error: any) {
//     console.error("خطأ في إرجاع المشتريات:", error);
//     return {
//       success: false,
//       message: error.message || "فشل في معالجة الإرجاع",
//     };
//   }
// }
// ============================================
// 🔄 Purchase Journal Entries with Retry
// ============================================
export async function processPurchaseReturn(
  data: PurchaseReturnData,
  userId: string,
  companyId: string,
) {
  const {
    purchaseId,
    purchaseItemId,
    warehouseId,
    returnQuantity,
    returnUnit,
    unitCost,
    branchId,
    transferNumber,
    paymentMethod,
    baseCurrency,
    baseAmount,
    currency,
    exchangeRate,
    refundAmount = 0,
    reason,
  } = data;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const accountMap = await getDefaultAccountMap(tx, companyId);
        const inventoryAccount = accountMap.get("inventory");
        const payableAccount = accountMap.get("accounts_payable");
        const settlementAccount = resolveSettlementAccount(
          accountMap,
          paymentMethod,
        );

        if (!inventoryAccount || !payableAccount)
          throw new Error(
            "Missing required account mappings for purchase return journal entry",
          );
        if (refundAmount > 0 && !settlementAccount)
          throw new Error(
            "Missing settlement account mapping for purchase return refund",
          );

        // ── 1. Fetch original purchase ───────────────────────────
        const originalPurchase = await tx.invoice.findUnique({
          where: { id: purchaseId, companyId, sale_type: "PURCHASE" },
          select: {
            id: true,
            invoiceNumber: true,
            amountDue: true,
            items: {
              where: { id: purchaseItemId },
              include: {
                product: { select: { id: true, sellingUnits: true } },
              },
            },
            supplier: { select: { id: true } }, // ✅ removed totalPurchased etc
          },
        });

        if (!originalPurchase)
          throw new Error("عملية الشراء الأصلية غير موجودة");
        if (originalPurchase.items.length === 0)
          throw new Error("عنصر الشراء غير موجود");

        const purchaseItem = originalPurchase.items[0];
        const supplierId = originalPurchase.supplier?.id;
        const productId = purchaseItem.product.id;
        const returnInvoiceNumber = originalPurchase.invoiceNumber.replace(
          "مشتريات",
          "مرتجع",
        );

        const existing = await tx.invoice.findFirst({
          where: {
            companyId,
            sale_type: "RETURN_PURCHASE",
            invoiceNumber: returnInvoiceNumber,
          },
          select: { id: true },
        });
        if (existing) throw new Error("تم إرجاع هذه الفاتورة للمورد مسبقاً");

        // ── 2. Inventory check ───────────────────────────────────
        const inventory = await tx.inventory.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId,
              productId,
              warehouseId,
            },
          },
          select: {
            id: true,
            stockQuantity: true,
            reservedQuantity: true,
            reorderLevel: true,
          },
        });
        if (!inventory) throw new Error("سجل المخزون غير موجود");

        const sellingUnits = (purchaseItem.product.sellingUnits as any[]) || [];
        const selectedUnit = sellingUnits.find(
          (u: any) => u.name === returnUnit,
        );
        const returnQtyInUnits = convertToBaseUnits(
          returnQuantity,
          selectedUnit,
          sellingUnits,
        );

        if (returnQtyInUnits > inventory.stockQuantity)
          throw new Error(
            `لا يمكن إرجاع كمية أكبر من المخزون الحالي (${inventory.stockQuantity})`,
          );

        const returnTotalCost = returnQuantity * unitCost;
        const payableReduction = Math.max(0, returnTotalCost - refundAmount);

        // ── 3. Zero out original purchase amountDue if needed ────
        if (Number(originalPurchase.amountDue) > 0) {
          await tx.invoice.update({
            where: { id: purchaseId, companyId },
            data: { amountDue: 0 },
          });
        }

        // ── 4. Create return invoice ─────────────────────────────
        const purchaseReturn = await tx.invoice.create({
          data: {
            companyId,
            invoiceNumber: returnInvoiceNumber,
            cashierId: userId,
            branchId,
            warehouseId,
            supplierId,
            sale_type: "RETURN_PURCHASE",
            totalAmount: returnTotalCost,
            amountPaid: refundAmount,
            amountDue: 0,
            status: "completed",
            currencyCode: currency || baseCurrency || "",
            exchangeRate,
            baseAmount,
            foreignAmount:
              currency && baseCurrency && currency !== baseCurrency
                ? refundAmount
                : undefined,
            items: {
              create: {
                companyId,
                productId,
                quantity: returnQuantity,
                price: unitCost,
                unit: returnUnit,
                totalPrice: returnTotalCost,
                warehouseId, // ✅ carry warehouse
              },
            },
          },
        });

        // ── 5. Restore batch via purchaseItemId ──────────────────
        // ✅ was invoiceItemId — now purchaseItemId
        const restoredBatch = await tx.inventoryBatch.findFirst({
          where: { purchaseItemId: purchaseItem.id },
          select: { id: true },
        });

        await tx.inventoryBatch.updateMany({
          where: { purchaseItemId: purchaseItem.id },
          data: { remainingQuantity: { decrement: returnQtyInUnits } }, // ✅ was decrement
        });

        // ── 6. Update inventory ──────────────────────────────────
        const newStockQty = inventory.stockQuantity - returnQtyInUnits;
        const newAvailable = availableQty(inventory) - returnQtyInUnits;

        await tx.inventory.update({
          where: {
            companyId_productId_warehouseId: {
              companyId,
              productId,
              warehouseId,
            },
          },
          data: {
            stockQuantity: newStockQty,
            // ✅ no availableQuantity column
            status: deriveStatus(newAvailable, inventory.reorderLevel),
          },
        });

        // ── 7. Stock movement ────────────────────────────────────
        await tx.stockMovement.create({
          data: {
            companyId,
            productId,
            warehouseId,
            userId,
            movementType: "صادر",
            batchId: restoredBatch?.id ?? null, // ✅ was missing entirely

            quantity: returnQtyInUnits,
            reason: "إرجاع للمورد",
            quantityBefore: inventory.stockQuantity,
            quantityAfter: newStockQty,
            referenceType: "مرتجع مشتريات",
            referenceId: purchaseReturn.id,
            notes:
              reason ||
              `إرجاع ${returnQuantity} ${returnUnit} من فاتورة ${purchaseId}`,
          },
        });

        // ── 8. Financial transaction ─────────────────────────────
        const voucherNumber = await getNextVoucherNumber(
          companyId,
          "RECEIPT",
          tx,
        );
        let paymentVoucher: number | null = null;

        if (refundAmount > 0 && paymentMethod) {
          const payment = await tx.financialTransaction.create({
            data: {
              companyId,
              supplierId,
              currencyCode: currency || baseCurrency || "",
              invoiceId: purchaseReturn.id, // ✅ no purchaseId field anymore
              branchId,
              type: "RECEIPT",
              voucherNumber,
              userId,
              status: "paid",
              amount: refundAmount,
              exchangeRate,
              baseAmount,
              foreignAmount:
                currency && baseCurrency && currency !== baseCurrency
                  ? refundAmount
                  : undefined,
              paymentMethod,
              referenceNumber: transferNumber,
              notes:
                reason ||
                `استرداد مبلغ من المورد - فاتورة ${returnInvoiceNumber}`,
            },
          });
          paymentVoucher = payment.voucherNumber;
        }

        // ✅ supplier totals REMOVED — no update needed
        // Balance is now derived from invoice/transaction queries

        // ── 9. Journal entry ─────────────────────────────────────
        const entryNumber = `PURET-${new Date().getFullYear()}-${paymentVoucher ?? voucherNumber}`;
        const desc = `Purchase return: ${purchaseReturn.invoiceNumber}`;
        const journalLines: any[] = [];

        if (refundAmount > 0 && settlementAccount) {
          journalLines.push(
            buildWarehouseJournalLine(
              companyId,
              settlementAccount,
              `${desc} - refund`,
              refundAmount,
              0,
              {
                currency,
                baseCurrency,
                exchangeRate,
                foreignAmount:
                  currency && baseCurrency && currency !== baseCurrency
                    ? refundAmount
                    : undefined,
              },
            ),
          );
        }

        if (payableReduction > 0) {
          journalLines.push(
            buildWarehouseJournalLine(
              companyId,
              payableAccount,
              `${desc} - payable reversal`,
              payableReduction,
              0,
              { currency, baseCurrency, exchangeRate },
            ),
          );
        }

        journalLines.push(
          buildWarehouseJournalLine(
            companyId,
            inventoryAccount,
            `${desc} - inventory`,
            0,
            returnTotalCost,
            { currency, baseCurrency, exchangeRate },
          ),
        );

        await tx.journalHeader.create({
          data: {
            companyId,
            entryNumber,
            description: desc,
            branchId,
            referenceType: "مرتجع مشتريات",
            referenceId: purchaseReturn.id,
            entryDate: new Date(),
            status: "POSTED",
            createdBy: userId,
            lines: { create: journalLines.map((l) => ({ ...l, companyId })) },
          },
        });

        return {
          success: true,
          message: "تم إرجاع المشتريات بنجاح",
          purchaseReturn,
          returnAmount: returnTotalCost,
          refundAmount,
          originalPurchaseId: purchaseId,
        };
      },
      { timeout: 30000, maxWait: 5000 },
    );

    revalidatePath("/inventory");
    return result;
  } catch (error: any) {
    console.error("خطأ في إرجاع المشتريات:", error);
    return {
      success: false,
      message: error.message || "فشل في معالجة الإرجاع",
    };
  }
}
interface PurchaseReturnData {
  purchaseId: string; // Changed from productId
  purchaseItemId: string; // Added to identify specific item
  warehouseId: string;
  returnQuantity: number;
  returnUnit: string; // Specify the type as string or another appropriate type
  unitCost: number;
  branchId?: string;
  paymentMethod?: string;
  refundAmount?: number;
  reason?: string;
  baseCurrency?: string;
  transferNumber?: string;
  baseAmount: number;
  currency: string;
  exchangeRate: number;
}
// export async function updateMultipleInventories(
//   updatesData: InventoryUpdateDatas[],
//   userId: string,
//   companyId: string,
// ) {
//   try {
//     if (!companyId || !userId)
//       return { success: false, error: "معرف الشركة ومعرف المستخدم مطلوبان" };
//     if (!updatesData?.length)
//       return { success: false, error: "يجب إضافة تحديث واحد على الأقل" };

//     for (let i = 0; i < updatesData.length; i++) {
//       const u = updatesData[i];
//       if (!u.productId || !u.warehouseId)
//         return {
//           success: false,
//           error: `التحديث ${i + 1}: المنتج والمستودع مطلوبان`,
//         };
//       if (!u.selectedUnitId)
//         return {
//           success: false,
//           error: `التحديث ${i + 1}: يجب اختيار وحدة البيع`,
//         };
//       if (!u.quantity || u.quantity <= 0)
//         return {
//           success: false,
//           error: `التحديث ${i + 1}: الكمية يجب أن تكون أكبر من صفر`,
//         };
//       if (
//         u.updateType === "supplier" &&
//         (!u.supplierId || !u.unitCost || u.unitCost <= 0)
//       )
//         return {
//           success: false,
//           error: `التحديث ${i + 1}: المورد وسعر الوحدة مطلوبان`,
//         };
//     }
//        const receiptNumbers = await Promise.all(
//   updatesData.map((_, i) => generateSaleNumber(companyId, i))
// );

// const uniqueProductIds = [...new Set(updatesData.map(u => u.productId))];
// const inventoryPairs = updatesData.map(u => ({
//   productId: u.productId,
//   warehouseId: u.warehouseId,
// }));

// // Pre-fetch all products
// const products = await prisma.product.findMany({
//   where: { id: { in: uniqueProductIds } },
//   select: { id: true, name: true, sku: true, sellingUnits: true },
// });
// const productMap = new Map(products.map(p => [p.id, p]));

// // Pre-validate units (no DB call needed)
// for (const update of updatesData) {
//   const product = productMap.get(update.productId);
//   const unit = (product?.sellingUnits as SellingUnit[])?.find((u: SellingUnit) => u.id === update.selectedUnitId) ?? [];
//   if (!unit) throw new Error(`Unit not found: ${update.selectedUnitId}`);
// }

//     const result = await prisma.$transaction(
//       async (tx) => {
//         const accountMap = await getDefaultAccountMap(tx, companyId);
//         const inventoryAccount = accountMap.get("inventory");
//         const payableAccount = accountMap.get("accounts_payable");

//         const updatedInventories = [];
//         const createdPurchases = [];
//         const stockMovements = [];

//         const receiptNumbers = await Promise.all(
//           updatesData.map((_, i) => generateSaleNumber(companyId, i)),
//         );

//         const inventoryPairs = updatesData.map((u) => ({
//           productId: u.productId,
//           warehouseId: u.warehouseId,
//         }));

//         const stockMovementRows: Prisma.StockMovementCreateManyInput[] = [];

//         for (let idx = 0; idx < updatesData.length; idx++) {
//           const updateData = updatesData[idx];
//           const currentInventory = inventoryMap.get(
//             `${updateData.productId}-${updateData.warehouseId}`,
//           );

//           if (!uniqueProductIds)
//             throw new Error(`المنتج غير موجود: ${updateData.productId}`);

//           const stockUnits = convertToBaseUnits(
//             updateData.quantity,
//             selectedUnit,
//             sellingUnits,
//           );
//           const totalCost = stockUnits * updateData.unitCost!;
//           const receiptNo = receiptNumbers[idx];

//           // Inventory rows are preloaded/created above

//           let createdPurchaseItemId: string | null = null;

//           if (
//             updateData.updateType === "supplier" &&
//             updateData.unitCost &&
//             updateData.supplierId
//           ) {
//             const paid = updateData.payment?.amountBase || 0;
//             const due = totalCost - paid;

//             const voucherNumber = await getNextVoucherNumber(
//               companyId,
//               "PAYMENT",
//               tx,
//             );

//             const paymentData =
//               paid > 0
//                 ? {
//                     companyId,
//                     currencyCode: updateData.payment?.selectedCurrency || "",
//                     voucherNumber,
//                     supplierId: updateData.supplierId,
//                     userId,
//                     branchId: updateData.branchId,
//                     amount: paid,
//                     type: TransactionType.PAYMENT,
//                     status: "paid",
//                     financialAccountId:
//                       updateData.payment?.financialAccountId || null,
//                     paymentMethod: updateData.payment?.paymentMethod ?? "cash",
//                     notes: updateData.notes || "دفعة مشتريات",
//                   }
//                 : undefined;

//             const purchase = await tx.invoice.create({
//               data: {
//                 companyId,
//                 invoiceNumber: receiptNo,
//                 cashierId: userId,
//                 supplierId: updateData.supplierId,
//                 totalAmount: totalCost,
//                 amountPaid: paid,
//                 branchId: updateData.branchId,
//                 sale_type: "PURCHASE",
//                 amountDue: due,
//                 status:
//                   paid >= totalCost ? "paid" : paid > 0 ? "partial" : "pending",
//                 items: {
//                   create: {
//                     companyId,
//                     productId: product.id,
//                     quantity: stockUnits,
//                     price: updateData.unitCost!,
//                     unit: selectedUnit.name,
//                     totalPrice: totalCost,
//                     warehouseId: updateData.warehouseId, // ✅ now on InvoiceItem
//                   },
//                 },
//                 transactions: { create: paymentData },
//               },
//               include: { transactions: true, items: true },
//             });
//             createdPurchaseItemId = purchase.items[0]?.id ?? null;

//             createdPurchases.push(purchase);

//             // ✅ supplier totals REMOVED from schema — skip these updates
//             // Supplier balance is now derived from invoice queries

//             const updatedInventory = await tx.inventory.update({
//               where: {
//                 companyId_productId_warehouseId: {
//                   companyId,
//                   productId: product.id,
//                   warehouseId: updateData.warehouseId,
//                 },
//               },
//               data: {
//                 stockQuantity: finalStockQty,
//                 reservedQuantity:
//                   updateData.reservedQuantity ?? inventory.reservedQuantity,
//                 // ✅ no availableQuantity
//                 status: calculatedStatus,
//                 lastStockTake: updateData.lastStockTake || new Date(),
//               },
//               include: {
//                 product: { select: { name: true, sku: true } },
//                 warehouse: { select: { name: true } },
//               },
//             });

//             // ✅ purchaseItemId instead of invoiceItemId

//             updatedInventories.push(updatedInventory);

//             if (!inventoryAccount || !payableAccount)
//               throw new Error(
//                 "Missing required account mappings for purchase journal entry",
//               );

//             const settlementAccount = resolveSettlementAccount(
//               accountMap,
//               updateData.payment?.paymentMethod,
//             );
//             if (paid > 0 && !settlementAccount)
//               throw new Error(
//                 "Missing settlement account mapping for purchase payment",
//               );

//             const entryNumber = `PUR-${new Date().getFullYear()}-${purchase.id}`;
//             const desc = `مشتريات: ${purchase.invoiceNumber}`;
//             const purchaseLines: any[] = [
//               buildWarehouseJournalLine(
//                 companyId,
//                 inventoryAccount,
//                 desc,
//                 totalCost,
//                 0,
//                 {
//                   currency: updateData.payment?.selectedCurrency || "",
//                   baseCurrency: updateData.baseCurrency,
//                   exchangeRate: updateData.payment?.exchangeRate,
//                   foreignAmount: updateData.payment?.amountFC,
//                 },
//               ),
//             ];

//             if (paid > 0 && settlementAccount) {
//               purchaseLines.push(
//                 buildWarehouseJournalLine(
//                   companyId,
//                   settlementAccount,
//                   `${desc} - payment`,
//                   0,
//                   paid,
//                   {
//                     currency: updateData.payment?.selectedCurrency || "",
//                     baseCurrency: updateData.baseCurrency,
//                     exchangeRate: updateData.payment?.exchangeRate,
//                     foreignAmount: updateData.payment?.amountFC,
//                   },
//                 ),
//               );
//             }

//             if (due > 0) {
//               purchaseLines.push(
//                 buildWarehouseJournalLine(
//                   companyId,
//                   payableAccount,
//                   `${desc} - payable`,
//                   0,
//                   due,
//                   {
//                     currency: updateData.payment?.selectedCurrency || "",
//                     baseCurrency: updateData.baseCurrency,
//                     exchangeRate: updateData.payment?.exchangeRate,
//                   },
//                 ),
//               );
//             }

//             await tx.journalHeader.create({
//               data: {
//                 companyId,
//                 entryNumber,
//                 description: desc,
//                 branchId: updateData.branchId,
//                 referenceType: "سند صرف مخزني",
//                 referenceId: purchase.transactions[0]?.id ?? purchase.id,
//                 entryDate: new Date(),
//                 status: "POSTED",
//                 createdBy: userId,
//                 lines: {
//                   create: purchaseLines.map((l) => ({ ...l, companyId })),
//                 },
//               },
//             });
//           }

//           // Manual update (no supplier)
//           if (updateData.updateType !== "supplier") {
//             const updatedInventory = await tx.inventory.update({
//               where: {
//                 companyId_productId_warehouseId: {
//                   companyId,
//                   productId: updateData.productId,
//                   warehouseId: updateData.warehouseId,
//                 },
//               },
//               data: {
//                 stockQuantity: finalStockQty,
//                 reservedQuantity:
//                   updateData.reservedQuantity ?? inventory.reservedQuantity,
//                 status: calculatedStatus,
//                 lastStockTake: updateData.lastStockTake || new Date(),
//               },
//               include: {
//                 product: { select: { name: true, sku: true } },
//                 warehouse: { select: { name: true } },
//               },
//             });

//             // ✅ purchaseItemId is null for manual batches — correct

//             updatedInventories.push(updatedInventory);
//           }

//           // Stock movement

//           const stockDifference = finalStockQty - inventory.stockQuantity;

//           const createdBatch = await tx.inventoryBatch.create({
//             data: {
//               inventoryId: inventory.id,
//               purchaseItemId:
//                 updateData.updateType === "supplier"
//                   ? createdPurchaseItemId
//                   : null,
//               quantity: stockUnits,
//               remainingQuantity: stockUnits,
//               costPrice: updateData.unitCost ?? 0,
//               expiredAt: updateData.expiredAt,
//               receivedAt: updateData.lastStockTake || new Date(),
//               supplierId:
//                 updateData.updateType === "supplier"
//                   ? updateData.supplierId || null
//                   : null,
//             },
//           });
//           stockMovementRows.push({
//             companyId,
//             productId: product.id,
//             warehouseId: updateData.warehouseId,
//             userId,
//             batchId: createdBatch.id,
//             movementType: "وارد للمخزن",
//             quantity: Math.abs(stockDifference),
//             reason:
//               updateData.updateType === "supplier"
//                 ? "تم استلام المورد"
//                 : updateData.reason || "تحديث يدوي",
//             quantityBefore: inventory.stockQuantity,
//             quantityAfter: finalStockQty,
//             notes: updateData.notes || undefined,
//           });

//           // Keep local map in sync for repeated updates to same inventory in one request
//           inventoryMap.set(
//             `${updateData.productId}-${updateData.warehouseId}`,
//             {
//               ...inventory,
//               stockQuantity: finalStockQty,
//               reservedQuantity:
//                 updateData.reservedQuantity ?? inventory.reservedQuantity,
//               status: calculatedStatus,
//               lastStockTake: updateData.lastStockTake || new Date(),
//             },
//           );
//         }

//         if (stockMovementRows.length) {
//           await tx.stockMovement.createMany({ data: stockMovementRows });
//           stockMovements.push(...stockMovementRows);
//         }

//         await tx.activityLogs.create({
//           data: {
//             userId,
//             companyId,
//             userAgent: typeof window !== "undefined" ? navigator.userAgent : "",
//             action: "تحديث مخزون",
//             details: `تم تحديث ${updatesData.length} سجل مخزون`,
//           },
//         });

//         return {
//           updatedInventories: updatedInventories.map(serializeDecimal),
//           createdPurchases: createdPurchases.map(serializeDecimal),
//           stockMovements: stockMovements.map(serializeDecimal),
//         };
//       },
//       { timeout: 60000, maxWait: 10000 },
//     );

//     revalidatePath("/inventory");
//     return {
//       success: true,
//       count: result.updatedInventories.length,
//       inventories: result.updatedInventories,
//       purchases: result.createdPurchases,
//       message: `تم تحديث ${result.updatedInventories.length} سجل مخزون بنجاح`,
//     };
//   } catch (error) {
//     console.error("Error updating multiple inventory:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "فشل تحديث المخزون",
//     };
//   }
// }

export async function updateMultipleInventories(
  updatesData: InventoryUpdateDatas[],
  userId: string,
  companyId: string,
) {
  // ─────────────────────────────────────────────────────────────
  // PHASE 1: Validation (outside transaction — no DB locks)
  // ─────────────────────────────────────────────────────────────
  if (!companyId || !userId) {
    return { success: false, error: "معرف الشركة ومعرف المستخدم مطلوبان" };
  }
  if (!updatesData?.length) {
    return { success: false, error: "يجب إضافة تحديث واحد على الأقل" };
  }

  for (let i = 0; i < updatesData.length; i++) {
    const u = updatesData[i];
    if (!u.productId || !u.warehouseId) {
      return {
        success: false,
        error: `التحديث ${i + 1}: المنتج والمستودع مطلوبان`,
      };
    }
    if (!u.selectedUnitId) {
      return {
        success: false,
        error: `التحديث ${i + 1}: يجب اختيار وحدة البيع`,
      };
    }
    if (!u.quantity || u.quantity <= 0) {
      return {
        success: false,
        error: `التحديث ${i + 1}: الكمية يجب أن تكون أكبر من صفر`,
      };
    }
    if (
      u.updateType === "supplier" &&
      (!u.supplierId || !u.unitCost || u.unitCost <= 0)
    ) {
      return {
        success: false,
        error: `التحديث ${i + 1}: المورد وسعر الوحدة مطلوبان`,
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 2: Pre-computation (outside transaction)
  // ─────────────────────────────────────────────────────────────
  const uniqueProductIds = [...new Set(updatesData.map((u) => u.productId))];

  // Fetch all products once
  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds } },
    select: { id: true, name: true, sku: true, sellingUnits: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  // Pre-generate ALL receipt numbers in one shot (single DB scan)
  const currentYear = new Date().getFullYear();
  const prefix = `-${currentYear}-مشتريات`;
  const existingPurchaseInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      sale_type: "PURCHASE",
      invoiceNumber: { endsWith: prefix },
    },
    select: { invoiceNumber: true },
    take: 1,
    orderBy: { invoiceNumber: "desc" }, // Get max directly
  });

  let nextSequence = 1;
  if (existingPurchaseInvoices.length > 0) {
    const lastNum = parseInt(
      existingPurchaseInvoices[0].invoiceNumber.split("-")[0],
      10,
    );
    if (!Number.isNaN(lastNum)) nextSequence = lastNum + 1;
  }

  // Pre-enrich all updates with computed values
  type EnrichedUpdate = InventoryUpdateDatas & {
    stockUnits: number;
    totalCost: number;
    receiptNo: string;
    product: {
      id: string;
      name: string;
      sku: string | null;
      sellingUnits: any[];
    };
    selectedUnit: any;
    finalStockQty: number;
    finalAvailableQty: number;
    calculatedStatus: string;
    inventoryKey: string;
  };

  const enrichedUpdates: EnrichedUpdate[] = [];
  const inventoryKeyMap = new Map<
    string,
    { stockQty: number; reservedQty: number; reorderLevel: number }
  >();

  for (let idx = 0; idx < updatesData.length; idx++) {
    const update = updatesData[idx];
    const product = productMap.get(update.productId);
    if (!product) throw new Error(`المنتج غير موجود: ${update.productId}`);

    const sellingUnits = (product.sellingUnits as any[]) || [];
    const selectedUnit = sellingUnits.find(
      (u) => u.id === update.selectedUnitId,
    );
    if (!selectedUnit) {
      throw new Error(
        `وحدة البيع غير موجودة للمنتج ${product.name}: ${update.selectedUnitId}`,
      );
    }

    const stockUnits = convertToBaseUnits(
      update.quantity,
      selectedUnit,
      sellingUnits,
    );
    if (!Number.isFinite(stockUnits) || stockUnits <= 0) {
      throw new Error(`الكمية المحولة غير صالحة للمنتج ${product.name}`);
    }

    const receiptNo = `${(nextSequence + idx).toString().padStart(6, "0")}${prefix}`;
    const totalCost = stockUnits * (update.unitCost ?? 0);
    const inventoryKey = `${update.productId}-${update.warehouseId}`;

    // Track running totals for same inventory in this batch
    const existing = inventoryKeyMap.get(inventoryKey);
    const currentStock = existing?.stockQty ?? 0;
    const currentReserved = existing?.reservedQty ?? 0;
    const reorderLevel = existing?.reorderLevel ?? 10;

    const finalStockQty = currentStock + stockUnits;
    const finalAvailableQty = finalStockQty - currentReserved;
    const calculatedStatus = deriveStatus(finalAvailableQty, reorderLevel);

    inventoryKeyMap.set(inventoryKey, {
      stockQty: finalStockQty,
      reservedQty: update.reservedQuantity ?? currentReserved,
      reorderLevel,
    });

    enrichedUpdates.push({
      ...update,
      stockUnits,
      totalCost,
      receiptNo,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        sellingUnits,
      },
      selectedUnit,
      finalStockQty,
      finalAvailableQty,
      calculatedStatus,
      inventoryKey,
    });
  }

  // Pre-generate voucher numbers for ALL supplier updates (single query)
  const supplierUpdates = enrichedUpdates.filter(
    (u) => u.updateType === "supplier",
  );
  let voucherNumbers: number[] = [];
  if (supplierUpdates.length > 0) {
    const lastVoucher = await prisma.financialTransaction.findFirst({
      where: { companyId, type: TransactionType.PAYMENT },
      select: { voucherNumber: true },
      orderBy: { voucherNumber: "desc" },
    });
    let nextVoucher = 1;
    if (lastVoucher?.voucherNumber) {
      const num = lastVoucher.voucherNumber || 0;

      if (!Number.isNaN(num)) nextVoucher = num + 1;
    }
    voucherNumbers = supplierUpdates.map((_, i) => nextVoucher + i);
  }

  // ─────────────────────────────────────────────────────────────
  // PHASE 3: Transaction (minimal round trips, atomic operations)
  // ─────────────────────────────────────────────────────────────
  const result = await prisma.$transaction(
    async (tx) => {
      const accountMap = await getDefaultAccountMap(tx, companyId);
      const inventoryAccount = accountMap.get("inventory");
      const payableAccount = accountMap.get("accounts_payable");

      // 1. Fetch existing inventories
      const inventoryPairs = enrichedUpdates.map((u) => ({
        productId: u.productId,
        warehouseId: u.warehouseId,
      }));

      const initialInventories = await tx.inventory.findMany({
        where: { companyId, OR: inventoryPairs },
      });

      const inventoryMap = new Map(
        initialInventories.map((inv) => [
          `${inv.productId}-${inv.warehouseId}`,
          inv,
        ]),
      );

      // 2. Create missing inventories (bulk)
      const missingInventories = inventoryPairs
        .filter(
          (pair) => !inventoryMap.has(`${pair.productId}-${pair.warehouseId}`),
        )
        .map((pair) => ({
          companyId,
          productId: pair.productId,
          warehouseId: pair.warehouseId,
          stockQuantity: 0,
          reservedQuantity: 0,
          reorderLevel: 10,
          status: "available" as const,
          lastStockTake: new Date(),
        }));

      if (missingInventories.length) {
        await tx.inventory.createMany({
          data: missingInventories,
          skipDuplicates: true,
        });

        // Re-fetch to get IDs for new records
        const allInventories = await tx.inventory.findMany({
          where: { companyId, OR: inventoryPairs },
        });
        for (const inv of allInventories) {
          inventoryMap.set(`${inv.productId}-${inv.warehouseId}`, inv);
        }
      }

      // 3. BULK UPDATE all inventories — SINGLE QUERY with atomic increments
      const inventoryUpdateCases = enrichedUpdates
        .map(
          (u) => `
        WHEN (product_id, warehouse_id) = ('${u.productId}', '${u.warehouseId}') 
        THEN stock_quantity + ${u.stockUnits}
      `,
        )
        .join(" ");

      const statusUpdateCases = enrichedUpdates
        .map(
          (u) => `
        WHEN (product_id, warehouse_id) = ('${u.productId}', '${u.warehouseId}') 
        THEN '${u.calculatedStatus}'
      `,
        )
        .join(" ");

      const reservedCases = enrichedUpdates
        .filter((u) => u.reservedQuantity !== undefined)
        .map(
          (u) => `
          WHEN (product_id, warehouse_id) = ('${u.productId}', '${u.warehouseId}') 
          THEN ${u.reservedQuantity}
        `,
        )
        .join(" ");

      await tx.$executeRawUnsafe(`
        UPDATE inventory 
        SET 
          stock_quantity = CASE 
            ${inventoryUpdateCases}
            ELSE stock_quantity 
          END,
          status = CASE 
            ${statusUpdateCases}
            ELSE status 
          END,
          reserved_quantity = CASE 
            ${reservedCases || "WHEN 1=0 THEN reserved_quantity"}
            ELSE reserved_quantity 
          END,
          last_stock_take = NOW()
        WHERE company_id = '${companyId}'
        AND (product_id, warehouse_id) IN (
          ${enrichedUpdates.map((u) => `('${u.productId}', '${u.warehouseId}')`).join(",")}
        )
      `);

      // 4. BULK CREATE invoices (supplier only) — createManyAndReturn for IDs [^14^][^19^]
      const createdPurchases: any[] = [];
      let purchaseItemMap = new Map<string, string>(); // receiptNo -> invoiceItemId

      if (supplierUpdates.length > 0) {
        // Create invoice headers in bulk
        const invoiceData = supplierUpdates.map((u, idx) => ({
          companyId,
          invoiceNumber: u.receiptNo,
          cashierId: userId,
          supplierId: u.supplierId!,
          totalAmount: u.totalCost,
          amountPaid: u.payment?.amountBase || 0,
          amountDue: u.totalCost - (u.payment?.amountBase || 0),
          status:
            (u.payment?.amountBase || 0) >= u.totalCost
              ? "paid"
              : (u.payment?.amountBase || 0) > 0
                ? "partial"
                : "pending",
          sale_type: "PURCHASE" as const,
          branchId: u.branchId,
        }));

        // Use createManyAndReturn to get IDs (PostgreSQL only) [^14^][^19^]
        const createdInvoices = await (tx.invoice as any).createManyAndReturn({
          data: invoiceData,
          skipDuplicates: true,
        });

        // Map receipt numbers to invoice IDs
        const invoiceIdMap = new Map(
          createdInvoices.map((inv: any) => [inv.invoiceNumber, inv.id]),
        );

        // Bulk create invoice items
        const invoiceItemsData = supplierUpdates.map((u) => ({
          companyId,
          invoiceId: invoiceIdMap.get(u.receiptNo)!,
          productId: u.productId,
          quantity: u.stockUnits,
          price: u.unitCost!,
          unit: u.selectedUnit.name,
          totalPrice: u.totalCost,
          warehouseId: u.warehouseId,
        }));

        const createdItems = await (tx.invoiceItem as any).createManyAndReturn({
          data: invoiceItemsData,
        });

        // Map invoiceItem IDs back to receipt numbers for batch linking
        createdItems.forEach((item: any, idx: number) => {
          purchaseItemMap.set(supplierUpdates[idx].receiptNo, item.id);
        });

        // Build purchase objects for return value
        createdPurchases.push(
          ...createdInvoices.map((inv: any) => ({
            ...inv,
            items: createdItems.filter(
              (item: any) => item.invoiceId === inv.id,
            ),
          })),
        );
      }

      // 5. CREATE inventory batches with Prisma (safer than raw SQL on drifted schemas)
      const batchIdByUpdateKey = new Map<string, string>();
      for (let i = 0; i < enrichedUpdates.length; i++) {
        const u = enrichedUpdates[i];
        const inventory = inventoryMap.get(u.inventoryKey)!;
        const purchaseItemId =
          u.updateType === "supplier"
            ? purchaseItemMap.get(u.receiptNo) || null
            : null;

        const createdBatch = await tx.inventoryBatch.create({
          data: {
            inventoryId: inventory.id,
            purchaseItemId,
            quantity: u.stockUnits,
            remainingQuantity: u.stockUnits,
            costPrice: u.unitCost ?? 0,
            expiredAt: u.expiredAt || null,
            receivedAt: u.lastStockTake || new Date(),
            supplierId: u.supplierId || null,
          },
          select: { id: true },
        });

        batchIdByUpdateKey.set(`${u.inventoryKey}-${i}`, createdBatch.id);
      }

      // 6. BULK CREATE stock movements — SINGLE createMany
      const stockMovementsData = enrichedUpdates.map((u, idx) => {
        const inventory = inventoryMap.get(u.inventoryKey)!;
        return {
          companyId,
          productId: u.productId,
          warehouseId: u.warehouseId,
          userId,
          batchId: batchIdByUpdateKey.get(`${u.inventoryKey}-${idx}`)!,
          movementType: "وارد للمخزن",
          quantity: u.stockUnits,
          reason:
            u.updateType === "supplier"
              ? "تم استلام المورد"
              : u.reason || "تحديث يدوي",
          quantityBefore: inventory.stockQuantity,
          quantityAfter: inventory.stockQuantity + u.stockUnits,
          notes: u.notes || undefined,
        };
      });

      await tx.stockMovement.createMany({ data: stockMovementsData });

      // 7. CREATE journal entries per purchase (correct referenceId per supplier invoice)
      if (supplierUpdates.length > 0 && inventoryAccount && payableAccount) {
        for (let i = 0; i < supplierUpdates.length; i++) {
          const u = supplierUpdates[i];
          const purchase = createdPurchases.find(
            (p) => p.invoiceNumber === u.receiptNo,
          );
          if (!purchase) continue;
          const journalLines: any[] = [];

          const paid = u.payment?.amountBase || 0;
          const due = u.totalCost - paid;
          const settlementAccount = resolveSettlementAccount(
            accountMap,
            u.payment?.paymentMethod,
          );

          if (paid > 0 && !settlementAccount) {
            throw new Error(
              "Missing settlement account mapping for purchase payment",
            );
          }

          const entryNumber = `PUR-${currentYear}-${purchase.id}`;
          const desc = `مشتريات: ${purchase.invoiceNumber}`;

          journalLines.push(
            buildWarehouseJournalLine(
              companyId,
              inventoryAccount,
              desc,
              u.totalCost,
              0,
              {
                currency: u.payment?.selectedCurrency || "",
                baseCurrency: u.baseCurrency,
                exchangeRate: u.payment?.exchangeRate,
                foreignAmount: u.payment?.amountFC,
              },
            ),
          );

          if (paid > 0 && settlementAccount) {
            journalLines.push(
              buildWarehouseJournalLine(
                companyId,
                settlementAccount,
                `${desc} - payment`,
                0,
                paid,
                {
                  currency: u.payment?.selectedCurrency || "",
                  baseCurrency: u.baseCurrency,
                  exchangeRate: u.payment?.exchangeRate,
                  foreignAmount: u.payment?.amountFC,
                },
              ),
            );
          }

          if (due > 0) {
            journalLines.push(
              buildWarehouseJournalLine(
                companyId,
                payableAccount,
                `${desc} - payable`,
                0,
                due,
                {
                  currency: u.payment?.selectedCurrency || "",
                  baseCurrency: u.baseCurrency,
                  exchangeRate: u.payment?.exchangeRate,
                },
              ),
            );
          }

          // Create payment transaction for this purchase
          if (paid > 0) {
            await tx.financialTransaction.create({
              data: {
                companyId,
                currencyCode: u.payment?.selectedCurrency || "",
                voucherNumber: voucherNumbers[i],
                supplierId: u.supplierId!,
                userId,
                branchId: u.branchId,
                amount: paid,
                type: TransactionType.PAYMENT,
                status: "paid",
                financialAccountId: u.payment?.financialAccountId || null,
                paymentMethod: u.payment?.paymentMethod ?? "cash",
                notes: u.notes || "دفعة مشتريات",
              },
            });
          }

          if (journalLines.length > 0) {
            await tx.journalHeader.create({
              data: {
                companyId,
                entryNumber,
                description: desc,
                branchId: u.branchId,
                referenceType: "سند صرف مخزني",
                referenceId: purchase.id,
                entryDate: new Date(),
                status: "POSTED",
                createdBy: userId,
                lines: {
                  create: journalLines.map((l) => ({ ...l, companyId })),
                },
              },
            });
          }
        }
      }

      // 8. Activity log
      await tx.activityLogs.create({
        data: {
          userId,
          companyId,
          userAgent: typeof window !== "undefined" ? navigator.userAgent : "",
          action: "تحديث مخزون",
          details: `تم تحديث ${updatesData.length} سجل مخزون`,
        },
      });

      // 9. Return updated inventories (from memory, no re-query)
      const updatedInventories = enrichedUpdates.map((u) => {
        const inv = inventoryMap.get(u.inventoryKey)!;
        return {
          ...inv,
          stockQuantity: inv.stockQuantity + u.stockUnits,
          reservedQuantity: u.reservedQuantity ?? inv.reservedQuantity,
          status: u.calculatedStatus,
          lastStockTake: u.lastStockTake || new Date(),
          product: { name: u.product.name, sku: u.product.sku },
        };
      });

      return {
        updatedInventories: updatedInventories.map(serializeDecimal),
        createdPurchases: createdPurchases.map(serializeDecimal),
        stockMovements: stockMovementsData.map(serializeDecimal),
      };
    },
    { timeout: 30000, maxWait: 5000 },
  );

  // ─────────────────────────────────────────────────────────────
  // PHASE 4: Side effects (outside transaction)
  // ─────────────────────────────────────────────────────────────
  revalidatePath("/inventory");

  return {
    success: true,
    count: result.updatedInventories.length,
    inventories: result.updatedInventories,
    purchases: result.createdPurchases,
    message: `تم تحديث ${result.updatedInventories.length} سجل مخزون بنجاح`,
  };
}
export async function getPurchaseReturnData(
  purchaseId: string,
  companyId: string,
) {
  try {
    // 1) Fetch the purchase invoice with properly nested warehouse data
    const purchase = await prisma.invoice.findFirst({
      where: { id: purchaseId, companyId, sale_type: "PURCHASE" },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            // ✅ Warehouse at item level — where this item was purchased
            warehouse: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                sellingUnits: true,
              },
            },
            createdBatches: {
              select: {
                id: true,
                quantity: true,
                remainingQuantity: true,
                costPrice: true,
                receivedAt: true,
                // ✅ Include warehouse via stockMovements (where batch was received)
                stockMovements: {
                  select: {
                    id: true,
                    quantity: true,
                    warehouse: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      return {
        success: false,
        message: "لم يتم العثور على المشتريات",
      };
    }

    // Generate return invoice number
    const returnInvoiceNumber = purchase.invoiceNumber
      .replace("مشتريات", "مرتجع")
      .replace("شراء", "مرتجع");

    // Check if already returned
    const existingReturnPurchase = await prisma.invoice.findFirst({
      where: {
        companyId,
        sale_type: "RETURN_PURCHASE",
        invoiceNumber: returnInvoiceNumber,
      },
      select: { id: true },
    });

    if (existingReturnPurchase) {
      return {
        success: false,
        message: "تم إرجاع هذه الفاتورة للمورد مسبقاً",
      };
    }

    // 2) Find item with available batch quantity for return
    const items = purchase.items ?? [];

    const item =
      items.find((it) =>
        it.createdBatches?.some((b) => Number(b.remainingQuantity) > 0),
      ) || items[0];

    if (!item) {
      return {
        success: false,
        message: "لا توجد منتجات في هذه المشتريات",
      };
    }

    // 3) Calculate stock by unit
    function calculateStockByUnit(baseQuantity: number, units: any[]) {
      const stockByUnit: Record<string, number> = {};

      units.forEach((unit) => {
        if (unit.isBase) {
          stockByUnit[unit.id] = baseQuantity;
        } else {
          stockByUnit[unit.id] = Number(
            (baseQuantity / unit.unitsPerParent).toFixed(2),
          );
        }
      });

      return stockByUnit;
    }

    // 4) Resolve warehouse from item or batch
    // ✅ item.warehouse is a single Warehouse object (not array!)
    const itemWarehouse = item.warehouse;

    // ✅ Get warehouse from batch stock movements (where batch was received)
    const batchWarehouses =
      item.createdBatches?.flatMap(
        (batch) => batch.stockMovements?.map((sm) => sm.warehouse) ?? [],
      ) ?? [];

    // Prefer item's warehouse, fallback to first batch movement warehouse
    const resolvedWarehouse = itemWarehouse ?? batchWarehouses[0];
    const resolvedWarehouseId = resolvedWarehouse?.id;

    // 5) Fetch current inventory for this product in the resolved warehouse
    const inventory = resolvedWarehouseId
      ? await prisma.inventory.findFirst({
          where: {
            companyId,
            productId: item.productId,
            warehouseId: resolvedWarehouseId,
          },
        })
      : null;

    const currentStock = inventory ? Number(inventory.stockQuantity) : 0;
    const sellingUnits = (item.product.sellingUnits as any[]) || [];
    const stockByUnit = calculateStockByUnit(currentStock, sellingUnits);

    // 6) Calculate return limits
    const originalPurchaseQty = Number(item.quantity);
    const hasBeenSold = currentStock < originalPurchaseQty;

    const batchRemainingQty =
      item.createdBatches?.reduce(
        (sum, b) => sum + Number(b.remainingQuantity || 0),
        0,
      ) ?? 0;

    const maxReturnableQty = Math.min(
      currentStock,
      originalPurchaseQty,
      batchRemainingQty || originalPurchaseQty,
    );

    // 7) Serialize and return with NESTED warehouse data
    return {
      success: true,
      data: {
        purchase: {
          id: purchase.id,
          invoiceNumber: purchase.invoiceNumber,
          totalAmount: Number(purchase.totalAmount),
          amountPaid: Number(purchase.amountPaid),
          amountDue: Number(purchase.amountDue),
          status: purchase.status,
          supplierId: purchase.supplierId,
          createdAt: purchase.invoiceDate,
        },

        supplier: purchase.supplier,

        // ✅ Product with nested warehouse info
        product: {
          ...item.product,
          warehouseId: resolvedWarehouseId,
          warehouse: resolvedWarehouse, // ← NESTED warehouse object
        },

        purchaseItem: {
          id: item.id,
          quantity: item.quantity,
          unitCost: Number(item.price),
          totalCost: Number(item.totalPrice),
          // ✅ Item-level warehouse (where it was originally purchased)
          warehouse: item.warehouse,
        },

        // ✅ Batches with their respective warehouses
        batches: item.createdBatches?.map((batch) => ({
          id: batch.id,
          quantity: batch.quantity,
          remainingQuantity: batch.remainingQuantity,
          costPrice: batch.costPrice,
          receivedAt: batch.receivedAt,
          // ✅ Batch warehouse from stock movements
          warehouse: batch.stockMovements?.[0]?.warehouse ?? null,
          stockMovements: batch.stockMovements?.map((sm) => ({
            id: sm.id,
            quantity: sm.quantity,
            warehouse: sm.warehouse,
          })),
        })),

        inventory: {
          stockByUnit,
          currentStockInBaseUnit: currentStock,
          isPartiallySold: hasBeenSold,
          maxReturnableQty,
        },
      },
    };
  } catch (error) {
    console.error("Error loading purchase return data", error);
    return {
      success: false,
      message: "حدث خطأ في الخادم",
    };
  }
}

// Helper function to determine allowed units based on product type

export async function adjustStock(
  productId: string,
  warehouseId: string,
  newQuantity: number,
  userId: string,
  reason: string,
  notes?: string,
  companyId?: string,
) {
  if (!companyId) return;
  try {
    return await prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({
        where: {
          companyId_productId_warehouseId: {
            companyId: companyId ?? "", // <-- ADD THIS FIELD
            productId,
            warehouseId,
          },
        },
        include: {
          product: {
            select: {
              name: true,
            },
          },
          warehouse: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!inventory) {
        throw new Error("Inventory record not found");
      }

      const difference = newQuantity - inventory.stockQuantity;
      const newAvailableQuantity = Math.max(
        0,
        newQuantity - inventory.reservedQuantity,
      );

      // Determine status
      let status = "available";
      if (newAvailableQuantity === 0) {
        status = "out_of_stock";
      } else if (newAvailableQuantity <= inventory.reorderLevel) {
        status = "low";
      }

      // Update inventory
      const updatedInventory = await tx.inventory.update({
        where: {
          companyId_productId_warehouseId: {
            companyId: companyId ?? "", // <-- ADD THIS FIELD
            productId,
            warehouseId,
          },
        },
        data: {
          stockQuantity: newQuantity,
          status,
        },
      });

      // Create stock movement
      await tx.stockMovement.create({
        data: {
          companyId,
          productId,
          warehouseId,
          userId: "cmd5xocl8000juunw1hcxsyre",
          movementType: difference > 0 ? "in" : "out",
          quantity: Math.abs(difference),
          reason,
          quantityBefore: inventory.stockQuantity,
          quantityAfter: newQuantity,
          notes:
            notes ||
            `Stock adjustment: ${difference > 0 ? "+" : ""}${difference}`,
        },
      });
      revalidatePath("/inventory");

      if (newAvailableQuantity <= inventory.reorderLevel) {
        await sendRoleBasedNotification(
          {
            companyId,
            targetRoles: ["admin", "cashier", "manager_wh"],
          },
          {
            title: "تنبيه انخفاض المخزون",
            body: `${inventory.product.name} في ${inventory.warehouse.name} وصل إلى ${newAvailableQuantity} (حد إعادة الطلب ${inventory.reorderLevel})`,
            url: "/inventory?stockStatus=low",
            tag: `low-stock-${productId}-${warehouseId}-${new Date().toISOString().split("T")[0]}`,
          },
        );
      }

      return { success: true, data: updatedInventory };
    });
  } catch (error) {
    console.error("Error adjusting stock:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to adjust stock",
    };
  }
}
const reserve = CashierSchema.extend({
  reason: z.string().optional(),
  customerId: z.string().optional(),
  customerName: z.string().optional(),
});
type CashierFormValues = z.infer<typeof CashierSchema>;

// 4. Reserve stock (when order is placed but not yet fulfilled)
export async function reserveStock(data: CashierFormValues, companyId: string) {
  const { cart } = data;
  try {
    return await prisma.$transaction(async (tx) => {
      for (const item of cart) {
        // Convert selling quantity to base units (cartons)

        const inventory = await tx.inventory.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId,
              productId: item.id,
              warehouseId: item.warehouseId,
            },
          },
        });

        if (!inventory) {
          throw new Error("Inventory record not found");
        }

        if (inventory.stockQuantity < item.selectedQty) {
          throw new Error("Insufficient available stock for reservation");
        }

        const newReservedQuantity =
          inventory.reservedQuantity + item.selectedQty;
        const newAvailableQuantity = inventory.stockQuantity - item.selectedQty;

        const updatedInventory = await tx.inventory.update({
          where: {
            companyId_productId_warehouseId: {
              companyId,
              productId: item.id,
              warehouseId: item.warehouseId,
            },
          },
          data: {
            reservedQuantity: newReservedQuantity,
            stockQuantity: newAvailableQuantity,
          },
        });

        return { success: true, data: updatedInventory };
      }
    });
  } catch (error) {
    console.error("Error reserving stock:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reserve stock",
    };
  }
}

// 5. Get current inventory levels

type SortState = {
  id: string;
  desc: boolean;
}[];
export async function getStockMovements(
  companyId: string,
  searchQuery: string = "",
  where: Prisma.StockMovementWhereInput = {},
  from?: string,
  to?: string,
  page: number = 0, // 0-indexed page number
  pageSize: number = 5,
  sort?: SortingState,
) {
  try {
    const orderBy = sort?.length
      ? { [sort[0].id]: sort[0].desc ? "desc" : "asc" }
      : { createdAt: "desc" as const };
    const fromatDate = from ? new Date(from).toISOString() : undefined;
    const toDate = to ? new Date(to).toISOString() : undefined;
    const dateRange: any = { gte: fromatDate, lte: toDate };
    // Build where clause with optional filters
    const combinedWhere: Prisma.StockMovementWhereInput = {
      ...where, // Existing filters (category, warehouse, etc.)
      companyId,
    };
    if (searchQuery) {
      combinedWhere.OR = [
        { product: { name: { contains: searchQuery, mode: "insensitive" } } },
        { product: { sku: { contains: searchQuery, mode: "insensitive" } } },

        { movementType: { contains: searchQuery, mode: "insensitive" } },
        { reason: { contains: searchQuery, mode: "insensitive" } },
        { notes: { contains: searchQuery, mode: "insensitive" } },
      ];
    }
    if (fromatDate || toDate) {
      combinedWhere.createdAt = {
        ...(fromatDate && {
          gte: fromatDate,
        }),
        ...(toDate && {
          lte: toDate,
        }),
      };
    }

    // If you want to support global filter search, add to where using OR on fields:

    // Get total count for pagination
    const totalCount = await prisma.stockMovement.count({
      where: { companyId },
    });

    // Get paginated data
    const movements = await prisma.stockMovement.findMany({
      select: {
        id: true,
        productId: true,
        movementType: true,
        quantity: true,
        reason: true,
        quantityBefore: true,
        quantityAfter: true,
        notes: true,
        createdAt: true,
        referenceId: true,
        product: {
          select: {
            name: true,
            sku: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
        warehouse: {
          select: {
            name: true,
            location: true,
          },
        },
      },
      where: combinedWhere,
      orderBy,
      skip: page * pageSize,
      take: pageSize,
    });
    const invoiceIds = movements
      .filter((m) => m.referenceId)
      .map((m) => m.referenceId as string);
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        invoiceId: { in: invoiceIds },
      },
      select: {
        invoiceId: true,
        productId: true,
        unit: true, // This is the selling unit you want
      },
    });

    // 3. Map the units back to the movements
    const movementsWithUnits = movements.map((m) => {
      const matchingItem = invoiceItems.find(
        (item) =>
          item.invoiceId === m.referenceId && item.productId === m.productId,
      );

      return {
        ...m,
        sellingUnit: matchingItem?.unit || "وحدة أساسية",
      };
    });

    return { movements: movementsWithUnits, totalCount };
  } catch (error) {
    console.error("Error getting stock movements:", error);
    throw error;
  }
}

export async function getInventoryById(
  companyId: string,
  searchQuery: string = "",
  where: Prisma.InventoryWhereInput = {},
  from?: string,
  to?: string,
  page: number = 1,
  pageSize: number = 12,
  sort: SortState = [],
) {
  try {
    const fromatDate = from ? new Date(from).toISOString() : undefined;
    const toDate = to ? new Date(to).toISOString() : undefined;
    const requestedStatus = where.status;
    const baseWhere: Prisma.InventoryWhereInput = {
      ...where,
      status: undefined,
      companyId,
    };

    const combinedWhere: Prisma.InventoryWhereInput = baseWhere;

    if (searchQuery) {
      combinedWhere.OR = [
        { product: { name: { contains: searchQuery, mode: "insensitive" } } },

        { warehouseId: { contains: searchQuery, mode: "insensitive" } },
        { productId: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    if (fromatDate || toDate) {
      combinedWhere.createdAt = {
        ...(fromatDate && { gte: fromatDate }),
        ...(toDate && { lte: toDate }),
      };
    }

    const inventory = await prisma.inventory.findMany({
      select: {
        id: true,
        product: {
          select: {
            id: true,
            name: true,
            sellingUnits: true, // 🆕
          },
        },
        productId: true,

        stockQuantity: true,
        reservedQuantity: true,

        reorderLevel: true,
        maxStockLevel: true,
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },

        status: true,
        lastStockTake: true,
        createdAt: true,
        updatedAt: true,
      },
      where: combinedWhere,
    });
    const inventories = inventory.map((i) => {
      const stock = i.stockQuantity;
      const reserved = i.reservedQuantity;
      return stock - reserved;
    });
    const availableQuantity = inventories;
    const filteredInventory = inventory.filter((item) => {
      const availableQuantity = item.stockQuantity - item.reservedQuantity;
      if (requestedStatus === "attention") {
        return availableQuantity <= (item.reorderLevel || 0);
      }

      if (requestedStatus === "low") {
        return (
          availableQuantity > 0 && availableQuantity <= (item.reorderLevel || 0)
        );
      }

      if (requestedStatus === "out_of_stock") {
        return availableQuantity <= 0;
      }

      return true;
    });

    const totalCount = filteredInventory.length;
    const paginatedInventory = filteredInventory.slice(
      page * pageSize,
      page * pageSize + pageSize,
    );

    const lowStockItems: string[] = [];
    const lowStockItemIds: string[] = [];
    const outOfStockItems: string[] = [];
    const outOfStockItemIds: string[] = [];

    filteredInventory.forEach((item) => {
      const availableQuantity = item.stockQuantity - item.reservedQuantity;
      if (availableQuantity <= 0) {
        outOfStockItems.push(item.product.name);
        outOfStockItemIds.push(item.product.id);
      }
      if (availableQuantity <= (item.reorderLevel || 0)) {
        lowStockItems.push(item.product.name);
        lowStockItemIds.push(item.product.id);
      }
    });

    // 🆕 Convert base units to all selling units
    if (lowStockItems.length > 0) {
      const dayKey = new Date().toISOString().split("T")[0];
      const idKey = Array.from(new Set(lowStockItemIds)).sort().join("-");
      const shouldSend = await shouldSendNotificationDigest(
        companyId,
        "low-stock-summary",
        idKey,
      );

      if (shouldSend) {
        void sendRoleBasedNotification(
          {
            companyId,
            targetRoles: ["admin", "cashier", "manager_wh"],
          },
          {
            title: "⚠️ تنبيه انخفاض المخزون",
            body: `يوجد ${lowStockItems.length} منتجات وصلت للحد الأدنى: ${lowStockItems.slice(0, 3).join("، ")}${lowStockItems.length > 3 ? "..." : ""}`,
            url: "/inventory?stockStatus=low",
            tag: `low-stock-summary-${companyId}-${dayKey}-${idKey}`,
          },
        )
          .then(async (result) => {
            await markNotificationDigestSent(
              companyId,
              "low-stock-summary",
              idKey,
            );
          })
          .catch((err) => console.error("Notification Error:", err));
      }
    }

    if (outOfStockItems.length > 0) {
      const dayKey = new Date().toISOString().split("T")[0];
      const idKey = Array.from(new Set(outOfStockItemIds)).sort().join("-");
      const shouldSend = await shouldSendNotificationDigest(
        companyId,
        "out-of-stock-summary",
        idKey,
      );

      if (shouldSend) {
        void sendRoleBasedNotification(
          {
            companyId,
            targetRoles: ["admin", "cashier", "manager_wh"],
          },
          {
            title: "🚫 نفاد المخزون",
            body: `يوجد ${outOfStockItems.length} منتجات نفدت من المخزون: ${outOfStockItems.slice(0, 3).join("، ")}${outOfStockItems.length > 3 ? "..." : ""}`,
            url: "/inventory?stockStatus=out_of_stock",
            tag: `out-of-stock-summary-${companyId}-${dayKey}-${idKey}`,
          },
        )
          .then(async () => {
            await markNotificationDigestSent(
              companyId,
              "out-of-stock-summary",
              idKey,
            );
          })
          .catch((err) => console.error("Notification Error:", err));
      }
    }
    const convertedInventory = paginatedInventory.map((item) => {
      const availableQuantity = item.stockQuantity - item.reservedQuantity;
      const sellingUnits = (item.product.sellingUnits as any[]) || [];
      const baseStock = item.stockQuantity;
      // Calculate quantity for each selling unit
      const stockByUnit: Record<string, number> = {};
      const availableByUnit: Record<string, number> = {};
      const reservedByUnit: Record<string, number> = {};

      sellingUnits.forEach((unit, index) => {
        if (index === 0) {
          // Base unit
          stockByUnit[unit.id] = baseStock;
          availableByUnit[unit.id] = availableQuantity;
          reservedByUnit[unit.id] = item.reservedQuantity;
        } else {
          // Calculate for higher units
          let divisor = 1;
          for (let i = 1; i <= index; i++) {
            divisor *= sellingUnits[i].unitsPerParent;
          }
          stockByUnit[unit.id] = Math.floor(baseStock / divisor);
          availableByUnit[unit.id] = Math.floor(availableQuantity / divisor);
          reservedByUnit[unit.id] = Math.floor(item.reservedQuantity / divisor);
        }
      });

      return {
        ...item,
        availableQuantity,
        sellingUnits,
        stockByUnit,
        availableByUnit,
        reservedByUnit,
      };
    });
    return {
      inventory: serializeData(convertedInventory),
      totalCount,
    };
  } catch (error) {
    console.error("Error getting inventory by ID:", error);
    throw error;
  }
}

type InventoryBatchQueryOptions = {
  searchQuery?: string;
  expiryStatus?: string;
  warehouseId?: string;
  supplierId?: string;
  inventoryId?: string;
  page?: number;
  pageSize?: number;
};

function getBatchExpiryStatus(expiredAt: Date | null) {
  if (!expiredAt) return "none";

  const today = new Date();
  const expiryDate = new Date(expiredAt);
  const diffInDays = Math.ceil(
    (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffInDays <= 0) return "expired";
  if (diffInDays <= 30) return "soon";
  return "active";
}

export async function getInventoryBatchesByCompany(
  companyId: string,
  options: InventoryBatchQueryOptions = {},
) {
  try {
    const {
      searchQuery = "",
      expiryStatus = "all",
      warehouseId,
      inventoryId,
      supplierId,
      page = 1,
      pageSize = 20,
    } = options;

    const batches = await prisma.inventoryBatch.findMany({
      where: {
        ...(inventoryId ? { inventoryId } : {}),
        ...(supplierId ? { supplierId } : {}),
        inventory: {
          companyId,
          ...(warehouseId ? { warehouseId } : {}),
        },
      },
      select: {
        id: true,
        quantity: true,
        remainingQuantity: true,
        costPrice: true,
        expiredAt: true,
        receivedAt: true,
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        inventory: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
            warehouse: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        },
      },
      orderBy: [{ expiredAt: "asc" }, { receivedAt: "desc" }],
    });

    const loweredSearch = searchQuery.trim().toLowerCase();
    const stats = batches.reduce(
      (acc, batch) => {
        const status = getBatchExpiryStatus(batch.expiredAt);
        if (status === "expired") acc.expired += 1;
        if (status === "soon") acc.soon += 1;
        if (status === "active") acc.active += 1;
        if (status !== "none") acc.totalTracked += 1;
        return acc;
      },
      {
        active: 0,
        soon: 0,
        expired: 0,
        totalTracked: 0,
      },
    );

    const filtered = batches.filter((batch) => {
      const status = getBatchExpiryStatus(batch.expiredAt);
      const matchesStatus =
        expiryStatus === "all"
          ? true
          : expiryStatus === status ||
            (expiryStatus === "expired-only" ? status === "expired" : false);

      if (!matchesStatus) return false;

      if (!loweredSearch) return true;

      const haystack = [
        batch.inventory.product.name,
        batch.inventory.product.sku,
        batch.inventory.warehouse.name,
        batch.inventory.warehouse.location,
        batch.supplier?.name ?? "",
        batch.id,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(loweredSearch);
    });

    const totalCount = filtered.length;
    const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

    return {
      data: serializeData(
        paginated.map((batch) => ({
          ...batch,
          status: getBatchExpiryStatus(batch.expiredAt),
        })),
      ),
      totalCount,
      stats,
    };
  } catch (error) {
    console.error("Error getting inventory batches:", error);
    throw error;
  }
}
export async function fetchWarehouse(companyId: string) {
  return await prisma.warehouse.findMany({
    where: { companyId },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
export async function createWarehouse(
  input: WarehouseInput,
  companyId: string,
) {
  const parsed = CreateWarehouseSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid warehouse data");
  }
  const {
    name,
    location,
    address,
    city,
    state,
    country,
    postalCode,
    phoneNumber,
    email,
  } = parsed.data;
  try {
    const warehouseCapacity = await canCreateSubscriptionResource(
      companyId,
      "warehouses",
    );
    if (!warehouseCapacity.allowed) {
      throw new Error(
        `تم الوصول إلى الحد الأقصى للمخازن (${warehouseCapacity.usage.used}/${warehouseCapacity.usage.limit})`,
      );
    }

    const warehouse = await prisma.warehouse.create({
      data: {
        companyId,
        name,
        location,
        address,
        city,
        state,
        country,
        postalCode,
        phoneNumber,
        email,
      },
    });
    revalidatePath("warehouses");
    revalidatePath("/products");
    return warehouse;
  } catch (error) {
    console.error("Failed to create product:", error);
    throw error;
  }
}

export async function updateWarehouse(id: string, input: UpdateWarehouseInput) {
  const parsed = UpdateWarehouseSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid warehouse data");
  }

  try {
    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: parsed.data,
    });

    revalidatePath("/warehouses");
    revalidatePath("/products");

    return { success: true, warehouse };
  } catch (error) {
    console.error("Failed to update warehouse:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء تحديث المستودع",
    };
  }
}

async function getWarehouseDependencyCounts(warehouseId: string) {
  const [inventoryCount, stockMovementCount, invoiceCount] = await Promise.all([
    prisma.inventory.count({ where: { warehouseId } }),
    prisma.stockMovement.count({ where: { warehouseId } }),
    prisma.invoice.count({ where: { warehouseId } }),
  ]);

  return {
    inventoryCount,
    stockMovementCount,
    invoiceCount,
    total: inventoryCount + stockMovementCount + invoiceCount,
  };
}

export async function deleteWarehouse(id: string) {
  try {
    const dependencies = await getWarehouseDependencyCounts(id);

    if (dependencies.total > 0) {
      const blocks: string[] = [];

      if (dependencies.inventoryCount > 0) {
        blocks.push(`${dependencies.inventoryCount} سجل مخزون`);
      }
      if (dependencies.stockMovementCount > 0) {
        blocks.push(`${dependencies.stockMovementCount} حركة مخزون`);
      }
      if (dependencies.invoiceCount > 0) {
        blocks.push(`${dependencies.invoiceCount} فاتورة`);
      }

      return {
        success: false,
        error: `لا يمكن حذف المستودع لأنه مرتبط بـ ${blocks.join(" و ")}. احذف أو انقل هذه السجلات أولاً.`,
      };
    }

    await prisma.warehouse.delete({ where: { id } });

    revalidatePath("/warehouses");
    revalidatePath("/products");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete warehouse:", error);
    return {
      success: false,
      error: "حدث خطأ أثناء حذف المستودع",
    };
  }
}

export interface InventoryUpdateDatas {
  id?: string;
  productId: string;
  warehouseId: string;
  updateType: "manual" | "supplier";

  // 🆕 Selling Unit Info
  selectedUnitId: string; // Which unit is being updated
  quantity: number; // Quantity in the selected unit

  // Old fields (kept for backward compatibility)
  stockQuantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
  branchId?: string;
  expiredAt: Date;
  supplierId?: string;
  unitCost?: number;
  currency_code?: string;
  baseCurrency: string;
  // Payment
  paymentAmount?: number;
  paymentMethod?: string;
  payment?: PaymentState;

  notes?: string;
  reason?: string;
  lastStockTake?: Date;
}
function serializeDecimal<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "object" && "toNumber" in (obj as any)) {
    return (obj as any).toNumber() as T;
  }
  if (Array.isArray(obj)) return obj.map(serializeDecimal) as T;
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as any).map(([k, v]) => [k, serializeDecimal(v)]),
    ) as T;
  }
  return obj;
}
export async function generateSaleNumber(
  companyId: string,
  offset = 0, // 🆕 add offset param
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `-${currentYear}-مشتريات`;

  const allInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      sale_type: "PURCHASE",
      invoiceNumber: { endsWith: prefix },
    },
    select: { invoiceNumber: true },
  });

  let nextNumber = 1;

  if (allInvoices.length > 0) {
    const sequenceNumbers = allInvoices
      .map((inv) => {
        const parts = inv.invoiceNumber.split("-");
        return parseInt(parts[0], 10);
      })
      .filter((num) => !isNaN(num));

    if (sequenceNumbers.length > 0) {
      nextNumber = Math.max(...sequenceNumbers) + 1;
    }
  }

  // 🆕 Apply offset so batch items get unique sequential numbers
  const formattedNumber = (nextNumber + offset).toString().padStart(6, "0");
  return `${formattedNumber}${prefix}`;
}
function convertToBaseUnits(
  quantity: number,
  selectedUnit: any,
  allUnits: any[],
): number {
  // Find the index of the selected unit
  const unitIndex = allUnits.findIndex((u) => u.id === selectedUnit.id);

  if (unitIndex === 0) {
    // Already in base units
    return quantity;
  }

  // Calculate total multiplier from base to selected unit
  let multiplier = 1;
  for (let i = 1; i <= unitIndex; i++) {
    multiplier *= allUnits[i].unitsPerParent;
  }

  return quantity * multiplier;
}

// 🆕 Helper function to convert from base units to any unit
export async function convertFromBaseUnits(
  baseQuantity: number,
  targetUnitId: string,
  allUnits: any[],
): Promise<number> {
  const unitIndex = allUnits.findIndex((u: any) => u.id === targetUnitId);

  if (unitIndex === 0) {
    return Promise.resolve(baseQuantity);
  }

  let divisor = 1;
  for (let i = 1; i <= unitIndex; i++) {
    divisor *= allUnits[i].unitsPerParent;
  }

  return Promise.resolve(baseQuantity / divisor);
}
