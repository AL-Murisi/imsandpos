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
  FormValue,
} from "@/lib/zod";
import { PaymentState } from "@/components/common/ReusablePayment";
import { getNextVoucherNumber } from "./cashier";
import { sendRoleBasedNotification } from "@/lib/push-notifications";
import { canCreateSubscriptionResource } from "./subscription";
import { acquireNotificationDigestLock } from "./notificationDigest";
import { getAccountMappings } from "./chartOfaccounts";
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

      prisma.supplier.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),

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
        orderBy: { updatedAt: "desc" }, // Optional: order inventories by product name for consistency
      }),
    ]);
    const productMap = new Map<
      string,
      {
        id: string;
        sku: string;
        name: string;
        sellingUnits: any[]; // Changed from Prisma.JsonValue
        warehouseId?: string;
      }
    >();

    for (const item of inventories) {
      const key = `${item.productId}-${item.warehouseId}`; // Per warehouse as requested earlier

      if (productMap.has(key)) continue;

      // 🔥 FIX: Force parse sellingUnits properly
      let sellingUnits: any[] = [];
      const raw = item.product.sellingUnits;

      if (Array.isArray(raw)) {
        sellingUnits = raw;
      } else if (typeof raw === "string") {
        // If Prisma returns it as a JSON string
        try {
          const parsed = JSON.parse(raw);
          sellingUnits = Array.isArray(parsed) ? parsed : [];
        } catch {
          sellingUnits = [];
        }
      } else if (raw && typeof raw === "object") {
        // Handle edge cases where it might be an object wrapper
        sellingUnits = Array.isArray((raw as any).sellingUnits)
          ? (raw as any).sellingUnits
          : [];
      }

      productMap.set(key, {
        id: item.productId,
        sku: item.product.sku,
        name: `${item.product.name} (${item.warehouse.name})`,
        sellingUnits,
        warehouseId: item.warehouseId,
      });
    }

    const productList = Array.from(productMap.values());
    const inventory = inventories.map((inv) => ({
      ...inv,
      availableQuantity: inv.stockQuantity - inv.reservedQuantity,
    }));

    return {
      products: serializeData(productList),
      warehouses,
      suppliers,
      inventories: serializeData(inventory),
    };
  } catch (error) {
    console.error("Error fetching form data:", error);
    return { products: [], warehouses: [], suppliers: [], inventories: [] };
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

interface PurchaseReturnPayload {
  purchaseId: string;
  supplierId: string;
  items: {
    purchaseItemId: string;
    productId: string;
    warehouseId: string;
    returnQuantity: number;
    selectedUnitId: string;
    unitCost: number;
    returnUnit: string;
    reason?: string;
  }[];
  branchId?: string;
  paymentMethod?: string;
  refundAmount?: number;
  transferNumber?: string;
  globalReason?: string;
  baseCurrency?: string;
  baseAmount: number;
  currency: string;
  exchangeRate: number;
}

export async function processPurchaseReturn(
  data: PurchaseReturnPayload,
  userId: string,
  companyId: string,
) {
  const {
    purchaseId,
    supplierId,
    items,
    branchId,
    transferNumber,
    paymentMethod,
    baseCurrency,
    baseAmount,
    currency,
    exchangeRate,
    refundAmount = 0,
    globalReason,
  } = data;

  try {
    const { apAccount, inventoryAccount, accountMap } =
      await getAccountMappings();
    const settlementAccount = resolveSettlementAccount(
      accountMap,
      paymentMethod,
    );

    if (!inventoryAccount || !apAccount) {
      return { success: false, message: "Missing required account mappings" };
    }
    if (refundAmount > 0 && !settlementAccount) {
      return {
        success: false,
        message: "Missing settlement account for refund",
      };
    }

    // Pre-fetch original purchase
    const originalPurchase = await prisma.invoice.findUnique({
      where: { id: purchaseId, companyId, sale_type: "PURCHASE" },
      select: {
        id: true,
        invoiceNumber: true,
        amountDue: true,
        amountPaid: true,
        supplierId: true,
      },
    });

    if (!originalPurchase) {
      return { success: false, message: "عملية الشراء الأصلية غير موجودة" };
    }

    // Pre-fetch inventory records for all items
    const inventoryRecords = await prisma.inventory.findMany({
      where: {
        companyId,
        OR: items.map((item) => ({
          productId: item.productId,
          warehouseId: item.warehouseId,
        })),
      },
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        stockQuantity: true,
        reservedQuantity: true,
        reorderLevel: true,
      },
    });

    // Pre-validate all items
    for (const item of items) {
      const inv = inventoryRecords.find(
        (i) =>
          i.productId === item.productId && i.warehouseId === item.warehouseId,
      );
      if (!inv) {
        return {
          success: false,
          message: `سجل المخزون غير موجود للمنتج ${item.productId}`,
        };
      }

      // Get purchase item for unit conversion
      const purchaseItem = await prisma.invoiceItem.findUnique({
        where: { id: item.purchaseItemId },
        include: { product: { select: { sellingUnits: true } } },
      });

      if (!purchaseItem) {
        return {
          success: false,
          message: `عنصر الشراء ${item.purchaseItemId} غير موجود`,
        };
      }

      const sellingUnits = (purchaseItem.product.sellingUnits as any[]) || [];
      const selectedUnit = sellingUnits.find(
        (u: any) => u.name === item.returnUnit,
      );
      const returnQtyInUnits = convertToBaseUnits(
        item.returnQuantity,
        selectedUnit,
        sellingUnits,
      );

      if (returnQtyInUnits > inv.stockQuantity) {
        return {
          success: false,
          message: `لا يمكن إرجاع كمية أكبر من المخزون الحالي (${inv.stockQuantity})`,
        };
      }

      // Attach computed values
      (item as any)._returnQtyInUnits = returnQtyInUnits;
      (item as any)._inventoryId = inv.id;
      (item as any)._stockBefore = inv.stockQuantity;
      (item as any)._purchaseItem = purchaseItem;
    }

    const totalReturnCost = items.reduce(
      (sum, item) => sum + item.returnQuantity * item.unitCost,
      0,
    );

    if (refundAmount > totalReturnCost) {
      return {
        success: false,
        message: `مبلغ الاسترداد (${refundAmount}) أكبر من قيمة المرتجع (${totalReturnCost})`,
      };
    }

    if (refundAmount > Number(originalPurchase.amountPaid)) {
      return {
        success: false,
        message: `مبلغ الاسترداد أكبر من المدفوع (${originalPurchase.amountPaid})`,
      };
    }

    const returnInvoiceNumber = originalPurchase.invoiceNumber.replace(
      "مشتريات",
      "مرتجع",
    );

    // ── TRANSACTION ──
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            // 1. Update original purchase amountDue if needed
            if (Number(originalPurchase.amountDue) > 0) {
              await tx.invoice.update({
                where: { id: purchaseId, companyId },
                data: { amountDue: 0 },
              });
            }

            // 2. Create return invoice with all items
            const purchaseReturn = await tx.invoice.create({
              data: {
                companyId,
                invoiceNumber: returnInvoiceNumber,
                cashierId: userId,
                branchId,
                warehouseId: items[0]?.warehouseId,
                supplierId: originalPurchase.supplierId,
                sale_type: "RETURN_PURCHASE",
                totalAmount: totalReturnCost,
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
                  create: items.map((item) => ({
                    companyId,
                    productId: item.productId,
                    warehouseId: item.warehouseId,
                    quantity: item.returnQuantity,
                    price: item.unitCost,
                    unit: item.returnUnit,
                    totalPrice: item.returnQuantity * item.unitCost,
                  })),
                },
              },
            });

            // 3. Update inventory batches
            const batchUpdates = items.map((item) =>
              tx.inventoryBatch.updateMany({
                where: { purchaseItemId: item.purchaseItemId },
                data: {
                  remainingQuantity: {
                    decrement: (item as any)._returnQtyInUnits,
                  },
                },
              }),
            );
            await Promise.all(batchUpdates);

            // 4. Update inventory records
            const inventoryUpdates = items.map((item) =>
              tx.inventory.update({
                where: { id: (item as any)._inventoryId },
                data: {
                  stockQuantity: {
                    decrement: (item as any)._returnQtyInUnits,
                  },
                  status: deriveStatus(
                    (item as any)._stockBefore -
                      (item as any)._returnQtyInUnits,
                    inventoryRecords.find(
                      (i) => i.id === (item as any)._inventoryId,
                    )?.reorderLevel || 0,
                  ),
                },
              }),
            );
            await Promise.all(inventoryUpdates);

            // 5. Create stock movements
            const stockMovements = items.map((item) => ({
              companyId,
              productId: item.productId,
              warehouseId: item.warehouseId,
              userId,
              movementType: "صادر",
              quantity: (item as any)._returnQtyInUnits,
              reason: item.reason || globalReason || "إرجاع للمورد",
              quantityBefore: (item as any)._stockBefore,
              quantityAfter:
                (item as any)._stockBefore - (item as any)._returnQtyInUnits,
              referenceType: "مرتجع مشتريات",
              referenceId: purchaseReturn.id,
              notes: `إرجاع ${item.returnQuantity} ${item.returnUnit}`,
            }));
            await tx.stockMovement.createMany({ data: stockMovements });

            // 6. Financial transaction (if refund)
            let paymentVoucher: number | null = null;
            if (refundAmount > 0 && paymentMethod) {
              const voucherNumber = await getNextVoucherNumber(
                companyId,
                "RECEIPT",
                tx,
              );
              const payment = await tx.financialTransaction.create({
                data: {
                  companyId,
                  supplierId: originalPurchase.supplierId,
                  currencyCode: currency || baseCurrency || "",
                  invoiceId: purchaseReturn.id,
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
                    globalReason ||
                    `استرداد من المورد - ${returnInvoiceNumber}`,
                },
              });
              paymentVoucher = payment.voucherNumber;
            }

            // 7. Journal entry
            const entryNumber = `PURET-${new Date().getFullYear()}-${
              paymentVoucher ??
              (await getNextVoucherNumber(companyId, "RECEIPT", tx))
            }`;
            const desc = `Purchase return: ${purchaseReturn.invoiceNumber}`;
            const payableReduction = Math.max(
              0,
              totalReturnCost - refundAmount,
            );

            const journalLines = [];

            if (refundAmount > 0 && settlementAccount) {
              journalLines.push(
                buildWarehouseJournalLine(
                  companyId,
                  settlementAccount,
                  `${desc} - refund`,
                  refundAmount,
                  0,
                  { currency, baseCurrency, exchangeRate },
                ),
              );
            }

            if (payableReduction > 0) {
              journalLines.push(
                buildWarehouseJournalLine(
                  companyId,
                  apAccount,
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
                totalReturnCost,
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
                lines: {
                  create: journalLines.map((l) => ({ ...l, companyId })),
                },
              },
            });

            return {
              success: true,
              message: "تم إرجاع المشتريات بنجاح",
              purchaseReturn,
              returnAmount: totalReturnCost,
              refundAmount,
            };
          },
          {
            timeout: 15000,
            maxWait: 3000,
            isolationLevel: "ReadCommitted",
          },
        );

        revalidatePath("/inventory");
        return result;
      } catch (error: any) {
        attempts++;
        if (
          attempts < maxAttempts &&
          (error.code === "P2034" ||
            error.message?.includes("transaction") ||
            error.message?.includes("timeout") ||
            error.message?.includes("deadlock"))
        ) {
          console.warn(
            `Transaction failed, retrying... (${attempts}/${maxAttempts})`,
          );
          await new Promise((r) => setTimeout(r, 100 * attempts));
          continue;
        }
        throw error;
      }
    }

    return {
      success: false,
      message: "فشل بعد عدة محاولات — يرجى المحاولة لاحقاً",
    };
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
export async function updateMultipleInventories(
  updatesData: InventoryUpdateDatas[],
  userId: string,
  companyId: string,
) {
  // ─────────────────────────────────────────────────────────────
  // PHASE 1: Validation (unchanged)
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
  // PHASE 2: Pre-computation (group by supplier added)
  // ─────────────────────────────────────────────────────────────
  const uniqueProductIds = [...new Set(updatesData.map((u) => u.productId))];

  const { apAccount, inventoryAccount, accountMap } =
    await getAccountMappings();

  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds } },
    select: { id: true, name: true, sku: true, sellingUnits: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

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
    orderBy: { invoiceNumber: "desc" },
  });

  let nextSequence = 1;
  if (existingPurchaseInvoices.length > 0) {
    const lastNum = parseInt(
      existingPurchaseInvoices[0].invoiceNumber.split("-")[0],
      10,
    );
    if (!Number.isNaN(lastNum)) nextSequence = lastNum + 1;
  }

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

  // ── GROUP SUPPLIER UPDATES BY SUPPLIER ──────────────────────
  const supplierGroups = new Map<
    string,
    {
      updates: InventoryUpdateDatas[];
      enriched: EnrichedUpdate[];
      totalCost: number;
      totalPaid: number;
      receiptNo: string;
      supplierId: string;
      branchId?: string;
    }
  >();

  for (const update of updatesData) {
    if (update.updateType === "supplier") {
      const sid = update.supplierId!;
      if (!supplierGroups.has(sid)) {
        const receiptNo = `${nextSequence.toString().padStart(6, "0")}${prefix}`;
        nextSequence++;
        supplierGroups.set(sid, {
          updates: [],
          enriched: [],
          totalCost: 0,
          totalPaid: 0,
          receiptNo,
          supplierId: sid,
          branchId: update.branchId,
        });
      }
      supplierGroups.get(sid)!.updates.push(update);
    }
  }
  // ─────────────────────────────────────────────────────────────

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

    // ── USE GROUP RECEIPT NO FOR SUPPLIER UPDATES ─────────────
    let receiptNo: string;
    if (update.updateType === "supplier") {
      const group = supplierGroups.get(update.supplierId!)!;
      receiptNo = group.receiptNo;
      group.enriched.push(null as any); // placeholder, replaced below
    } else {
      receiptNo = `${nextSequence.toString().padStart(6, "0")}${prefix}`;
      nextSequence++;
    }
    // ──────────────────────────────────────────────────────────

    const totalCost = stockUnits * (update.unitCost ?? 0);
    const inventoryKey = `${update.productId}-${update.warehouseId}`;

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

    const enriched: EnrichedUpdate = {
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
    };

    enrichedUpdates.push(enriched);

    // ── REPLACE PLACEHOLDER IN GROUP ──────────────────────────
    if (update.updateType === "supplier") {
      const group = supplierGroups.get(update.supplierId!)!;
      const placeholderIdx = group.enriched.indexOf(null as any);
      if (placeholderIdx >= 0) {
        group.enriched[placeholderIdx] = enriched;
      } else {
        group.enriched.push(enriched);
      }
      group.totalCost += totalCost;
      group.totalPaid += update.payment?.amountBase || 0;
    }
    // ──────────────────────────────────────────────────────────
  }

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
  // PHASE 3: Transaction (grouped invoice creation)
  // ─────────────────────────────────────────────────────────────
  const result = await prisma.$transaction(
    async (tx) => {
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

        const allInventories = await tx.inventory.findMany({
          where: { companyId, OR: inventoryPairs },
        });
        for (const inv of allInventories) {
          inventoryMap.set(`${inv.productId}-${inv.warehouseId}`, inv);
        }
      }

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

      // ── CREATE INVOICES: ONE PER SUPPLIER ───────────────────
      const createdPurchases: any[] = [];
      let purchaseItemMap = new Map<string, string>();

      if (supplierGroups.size > 0) {
        const invoiceData = Array.from(supplierGroups.values()).map(
          (group) => ({
            companyId,
            invoiceNumber: group.receiptNo,
            cashierId: userId,
            supplierId: group.supplierId,
            totalAmount: group.totalCost,
            amountPaid: group.totalPaid,
            amountDue: group.totalCost - group.totalPaid,
            status:
              group.totalPaid >= group.totalCost
                ? "paid"
                : group.totalPaid > 0
                  ? "partial"
                  : "pending",
            sale_type: "PURCHASE" as const,
            branchId: group.branchId,
          }),
        );

        const createdInvoices = await (tx.invoice as any).createManyAndReturn({
          data: invoiceData,
          skipDuplicates: true,
        });

        const invoiceIdMap = new Map(
          createdInvoices.map((inv: any) => [inv.invoiceNumber, inv.id]),
        );

        const invoiceItemsData: any[] = [];
        for (const group of supplierGroups.values()) {
          const invoiceId = invoiceIdMap.get(group.receiptNo)!;
          for (const u of group.enriched) {
            invoiceItemsData.push({
              companyId,
              invoiceId,
              productId: u.productId,
              quantity: u.stockUnits,
              price: u.unitCost!,
              unit: u.selectedUnit.name,
              totalPrice: u.totalCost,
              warehouseId: u.warehouseId,
            });
          }
        }

        const createdItems = await (tx.invoiceItem as any).createManyAndReturn({
          data: invoiceItemsData,
        });

        let itemIdx = 0;
        for (const group of supplierGroups.values()) {
          for (const u of group.enriched) {
            purchaseItemMap.set(
              u.receiptNo + "-" + u.productId + "-" + u.warehouseId,
              createdItems[itemIdx].id,
            );
            itemIdx++;
          }
        }

        createdPurchases.push(
          ...createdInvoices.map((inv: any) => ({
            ...inv,
            items: createdItems.filter(
              (item: any) => item.invoiceId === inv.id,
            ),
          })),
        );
      }
      // ──────────────────────────────────────────────────────────

      const batchIdByUpdateKey = new Map<string, string>();
      for (let i = 0; i < enrichedUpdates.length; i++) {
        const u = enrichedUpdates[i];
        const inventory = inventoryMap.get(u.inventoryKey)!;
        const purchaseItemId =
          u.updateType === "supplier"
            ? purchaseItemMap.get(
                u.receiptNo + "-" + u.productId + "-" + u.warehouseId,
              ) || null
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

      if (supplierGroups.size > 0 && inventoryAccount && apAccount) {
        let voucherIdx = 0;
        for (const group of supplierGroups.values()) {
          const purchase = createdPurchases.find(
            (p) => p.invoiceNumber === group.receiptNo,
          );
          if (!purchase) continue;

          const journalLines: any[] = [];
          const paid = group.totalPaid;
          const due = group.totalCost - paid;
          const settlementAccount = resolveSettlementAccount(
            accountMap,
            group.enriched[0]?.payment?.paymentMethod,
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
              group.totalCost,
              0,
              {
                currency: group.enriched[0]?.payment?.selectedCurrency || "",
                baseCurrency: group.enriched[0]?.baseCurrency,
                exchangeRate: group.enriched[0]?.payment?.exchangeRate,
                foreignAmount: group.enriched[0]?.payment?.amountFC,
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
                  currency: group.enriched[0]?.payment?.selectedCurrency || "",
                  baseCurrency: group.enriched[0]?.baseCurrency,
                  exchangeRate: group.enriched[0]?.payment?.exchangeRate,
                  foreignAmount: group.enriched[0]?.payment?.amountFC,
                },
              ),
            );
          }

          if (due > 0) {
            journalLines.push(
              buildWarehouseJournalLine(
                companyId,
                apAccount,
                `${desc} - payable`,
                0,
                due,
                {
                  currency: group.enriched[0]?.payment?.selectedCurrency || "",
                  baseCurrency: group.enriched[0]?.baseCurrency,
                  exchangeRate: group.enriched[0]?.payment?.exchangeRate,
                },
              ),
            );
          }

          if (paid > 0) {
            await tx.financialTransaction.create({
              data: {
                companyId,
                currencyCode:
                  group.enriched[0]?.payment?.selectedCurrency || "",
                voucherNumber: voucherNumbers[voucherIdx],
                supplierId: group.supplierId,
                userId,
                branchId: group.branchId,
                amount: paid,
                type: TransactionType.PAYMENT,
                status: "paid",
                financialAccountId:
                  group.enriched[0]?.payment?.financialAccountId || null,
                paymentMethod:
                  group.enriched[0]?.payment?.paymentMethod ?? "cash",
                notes: group.enriched[0]?.notes || "دفعة مشتريات",
              },
            });
            voucherIdx++;
          }

          if (journalLines.length > 0) {
            await tx.journalHeader.create({
              data: {
                companyId,
                entryNumber,
                description: desc,
                branchId: group.branchId,
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

      await tx.activityLogs.create({
        data: {
          userId,
          companyId,
          userAgent: typeof window !== "undefined" ? navigator.userAgent : "",
          action: "تحديث مخزون",
          details: `تم تحديث ${updatesData.length} سجل مخزون`,
        },
      });

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
    const purchase = await prisma.invoice.findFirst({
      where: { id: purchaseId, companyId, sale_type: "PURCHASE" },
      select: {
        supplierId: true,
        invoiceNumber: true,
        supplier: { select: { id: true, name: true } },
        invoiceDate: true,
        id: true,
        amountDue: true,
        amountPaid: true,
        totalAmount: true,
        status: true,
        items: {
          select: {
            id: true,
            unit: true,
            totalPrice: true,
            price: true,
            productId: true,
            quantity: true,
            warehouse: { select: { id: true, name: true, location: true } },
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
                stockMovements: {
                  select: {
                    id: true,
                    quantity: true,
                    warehouse: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      return { success: false, message: "لم يتم العثور على المشتريات" };
    }

    // Check if already returned
    const returnInvoiceNumber = purchase.invoiceNumber
      .replace("مشتريات", "مرتجع")
      .replace("شراء", "مرتجع");

    const existingReturnPurchase = await prisma.invoice.findFirst({
      where: {
        companyId,
        sale_type: "RETURN_PURCHASE",
        invoiceNumber: returnInvoiceNumber,
      },
      select: { id: true },
    });

    if (existingReturnPurchase) {
      return { success: false, message: "تم إرجاع هذه الفاتورة للمورد مسبقاً" };
    }

    // Map all items to the new format
    const items = purchase.items.map((item) => {
      // Resolve warehouse from item or batch
      const itemWarehouse = item.warehouse;
      const batchWarehouses =
        item.createdBatches?.flatMap(
          (batch) => batch.stockMovements?.map((sm) => sm.warehouse) ?? [],
        ) ?? [];
      const resolvedWarehouse = itemWarehouse ?? batchWarehouses[0];

      // Calculate stock by unit
      const sellingUnits = (item.product.sellingUnits as any[]) || [];
      const stockByUnit: Record<string, number> = {};
      sellingUnits.forEach((unit) => {
        stockByUnit[unit.id] = unit.isBase
          ? Number(item.quantity)
          : Number((Number(item.quantity) / unit.unitsPerParent).toFixed(2));
      });

      const originalPurchaseQty = Number(item.quantity);
      const batchRemainingQty =
        item.createdBatches?.reduce(
          (sum, b) => sum + Number(b.remainingQuantity || 0),
          0,
        ) ?? 0;

      return {
        purchaseItemId: item.id,
        productId: item.productId,
        productName: item.product.name,
        sku: item.product.sku,
        sellingUnits: item.product.sellingUnits,
        warehouseId: resolvedWarehouse?.id ?? "",
        warehouseName: resolvedWarehouse?.name,
        quantityPurchased: originalPurchaseQty,
        unitCost: Number(item.price),
        totalCost: Number(item.totalPrice),
        unit: item.unit,
        batches: item.createdBatches?.map((batch) => ({
          id: batch.id,
          quantity: batch.quantity,
          remainingQuantity: batch.remainingQuantity,
          costPrice: batch.costPrice,
          receivedAt: batch.receivedAt,
          warehouse: batch.stockMovements?.[0]?.warehouse ?? null,
        })),
        stockByUnit,
        maxReturnableQty: Math.min(
          originalPurchaseQty,
          batchRemainingQty || originalPurchaseQty,
        ),
      };
    });

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
        items, // ✅ Now returns items[] array
      },
    };
  } catch (error) {
    console.error("Error loading purchase return data", error);
    return { success: false, message: "حدث خطأ في الخادم" };
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

    filteredInventory.forEach((item) => {
      const availableQuantity = item.stockQuantity - item.reservedQuantity;
      if (availableQuantity <= (item.reorderLevel || 0)) {
        lowStockItems.push(item.product.name);
        lowStockItemIds.push(item.product.id);
      }
    });

    // 🆕 Convert base units to all selling units
    if (lowStockItems.length > 0) {
      const digestType = "low-stock-summary";
      const dayKey = new Date().toISOString().split("T")[0];
      const idKey = Array.from(new Set(lowStockItemIds)).sort().join("-");
      const acquired = await acquireNotificationDigestLock(
        companyId,
        digestType,
        idKey,
      );
      if (acquired) {
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
        ).catch((err) => console.error("Notification Error:", err));
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
      orderBy: [{ receivedAt: "desc" }, { expiredAt: "asc" }],
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
