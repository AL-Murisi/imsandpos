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
} from "@/lib/zod";
import { getActiveFiscalYears, validateFiscalYear } from "./fiscalYear";
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
          availableQuantity: true,
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

    return {
      products: serializeData(productList), // Flat list for dropdowns
      warehouses,
      suppliers,
      inventories: serializeData(inventories), // Full inventory details
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
    let purchaseReturn;
    const result = await prisma.$transaction(
      async (tx) => {
        const accountMap = await getDefaultAccountMap(tx, companyId);
        const inventoryAccount = accountMap.get("inventory");
        const payableAccount = accountMap.get("accounts_payable");
        const settlementAccount = resolveSettlementAccount(
          accountMap,
          paymentMethod,
        );

        const originalPurchase = await tx.invoice.findUnique({
          where: { id: purchaseId, companyId, sale_type: "PURCHASE" },
          select: {
            id: true,
            invoiceNumber: true,
            sale_type: true,
            amountDue: true,
            items: {
              where: { id: purchaseItemId },
              include: {
                product: {
                  select: {
                    id: true,
                    sellingUnits: true,
                  },
                },
              },
            },
            supplier: {
              select: {
                id: true,
                totalPurchased: true,
                totalPaid: true,
                outstandingBalance: true,
              },
            },
          },
        });

        if (!originalPurchase) {
          throw new Error("عملية الشراء الأصلية غير موجودة");
        }

        if (originalPurchase.sale_type !== "PURCHASE") {
          throw new Error("يمكن تنفيذ الإرجاع على فاتورة شراء فقط");
        }

        if (!inventoryAccount || !payableAccount) {
          throw new Error(
            "Missing required account mappings for purchase return journal entry",
          );
        }

        if (refundAmount > 0 && !settlementAccount) {
          throw new Error(
            "Missing settlement account mapping for purchase return refund",
          );
        }

        if (originalPurchase.items.length === 0) {
          throw new Error("عنصر الشراء غير موجود");
        }

        const purchaseItem = originalPurchase.items[0];
        const product = purchaseItem.product;
        const supplier = originalPurchase.supplier;
        const productId = product.id;
        const supplierId = supplier?.id;
        const returnInvoiceNumber = originalPurchase.invoiceNumber.replace(
          "مشتريات",
          "مرتجع",
        );

        const existingReturnPurchase = await tx.invoice.findFirst({
          where: {
            companyId,
            sale_type: "RETURN_PURCHASE",
            invoiceNumber: returnInvoiceNumber,
          },
          select: { id: true },
        });

        if (existingReturnPurchase) {
          throw new Error(
            "تم إرجاع هذه الفاتورة للمورد مسبقاً، لا يمكن إرجاعها مرة أخرى",
          );
        }

        const inventory = await tx.inventory.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId,
              productId,
              warehouseId,
            },
          },
          select: {
            stockQuantity: true,
            availableQuantity: true,
            reorderLevel: true,
          },
        });

        if (!inventory) {
          throw new Error("سجل المخزون غير موجود");
        }

        const sellingUnits = (product.sellingUnits as any[]) || [];
        const selectedUnit = sellingUnits.find(
          (u: any) => u.name === returnUnit,
        );
        const returnQuantityInUnits = convertToBaseUnits(
          returnQuantity,
          selectedUnit,
          sellingUnits,
        );

        if (returnQuantityInUnits > inventory.stockQuantity) {
          throw new Error(
            `لا يمكن إرجاع كمية أكبر من المخزون الحالي (${inventory.stockQuantity})`,
          );
        }

        const inventoryRecord = await tx.inventory.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId,
              productId,
              warehouseId,
            },
          },
          select: { id: true },
        });
        if (!inventoryRecord) {
          throw new Error("سجل المخزون غير موجود");
        }

        // Consume returned quantity from batches (FIFO by oldest received first)

        const returnTotalCost = returnQuantity * unitCost;
        const payableReduction = Math.max(0, returnTotalCost - refundAmount);
        if (Number(originalPurchase.amountDue) > 0) {
          await tx.invoice.update({
            where: { id: purchaseId, companyId },
            data: {
              amountDue: Number(0),
            },
          });
        }
        purchaseReturn = await tx.invoice.create({
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
              },
            },
          },
        });
        await tx.inventoryBatch.updateMany({
          where: { invoiceItemId: originalPurchase.items[0].id },
          data: { remainingQuantity: { decrement: returnQuantity } },
        });

        const newStockQty = inventory.stockQuantity - returnQuantityInUnits;
        const newAvailableQty =
          inventory.availableQuantity - returnQuantityInUnits;

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
            availableQuantity: newAvailableQty,
            status:
              newAvailableQty <= 0
                ? "out_of_stock"
                : newAvailableQty <= inventory.reorderLevel
                  ? "low"
                  : "available",
          },
        });

        await tx.stockMovement.create({
          data: {
            companyId,
            productId,
            warehouseId,
            userId,
            movementType: "صادر",
            quantity: returnQuantityInUnits,
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
        const voucherNumber = await getNextVoucherNumber(
          companyId,
          "RECEIPT",
          tx,
        );
        let payment;
        if (refundAmount > 0 && paymentMethod) {
          const payments = await tx.financialTransaction.create({
            data: {
              companyId,
              supplierId,
              currencyCode: currency || baseCurrency || "",
              invoiceId: purchaseReturn.id,
              branchId,
              type: "RECEIPT",
              purchaseId: purchaseReturn.id,
              voucherNumber: voucherNumber,
              userId: userId,
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
          payment = payments.voucherNumber;
        }
        const entryNumber = `PURET-${new Date().getFullYear()}-${payment}`;

        await tx.supplier.update({
          where: { id: supplierId },
          data: {
            totalPurchased: {
              set: Math.max(
                0,
                Number(supplier?.totalPurchased) - returnTotalCost,
              ),
            },
            ...(refundAmount > 0 && {
              totalPaid: {
                set: Math.max(0, Number(supplier?.totalPaid) - refundAmount),
              },
            }),
            outstandingBalance: {
              set: Math.max(
                0,
                Number(supplier?.outstandingBalance) - payableReduction,
              ),
            },
          },
        });

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
              {
                currency,
                baseCurrency,
                exchangeRate,
              },
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
            {
              currency,
              baseCurrency,
              exchangeRate,
            },
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
              create: journalLines.map((line) => ({
                ...line,
                companyId,
              })),
            },
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
      {
        timeout: 20000,
        maxWait: 5000,
      },
    );

    revalidatePath("/manageStocks");

    return result;
  } catch (error: any) {
    console.error("خطأ في إرجاع المشتريات:", error);
    return {
      success: false,
      message: error.message || "فشل في معالجة الإرجاع",
    };
  }
}
// ============================================
// 🔄 Purchase Journal Entries with Retry
// ============================================

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

export async function getPurchaseReturnData(
  purchaseId: string,
  companyId: string,
) {
  try {
    // 1) Fetch the purchase invoice with item->batch links (new schema flow)
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
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                sellingUnits: true,
              },
            },
            batches: {
              select: {
                id: true,
                quantity: true,
                remainingQuantity: true,
                inventory: {
                  select: {
                    warehouseId: true,
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
      return {
        success: false,
        message: "تم إرجاع هذه الفاتورة للمورد مسبقاً",
      };
    }

    // 2) Prefer item that still has linked batch quantity available for return
    const item =
      purchase.items.find(
        (it) =>
          it.batches?.some((b) => Number(b.remainingQuantity) > 0) ?? false,
      ) || purchase.items[0];

    if (!item) {
      return {
        success: false,
        message: "لا توجد منتجات في هذه المشتريات",
      };
    }
    function calculateStockByUnit(baseQuantity: number, units: any[]) {
      const stockByUnit: Record<string, number> = {};

      // نفترض أن المصفوفة مرتبة من الأصغر (Base) إلى الأكبر
      // أو نقوم بالبحث عن المعاملات
      units.forEach((unit) => {
        if (unit.isBase) {
          stockByUnit[unit.id] = baseQuantity;
        } else {
          // إذا كان الكرتون يحتوي على 10 حبات، نقسم الكمية الأساسية على 10
          // ملاحظة: تأكد من أن unitsPerParent تعبر عن التحويل من القاعدة
          stockByUnit[unit.id] = Number(
            (baseQuantity / unit.unitsPerParent).toFixed(2),
          );
        }
      });

      return stockByUnit;
    }

    const batchRemainingQty = item.batches.reduce(
      (sum, b) => sum + Number(b.remainingQuantity || 0),
      0,
    );
    const warehouseIdFromBatch =
      item.batches.find((b) => b.inventory?.warehouseId)?.inventory
        ?.warehouseId || undefined;
    const resolvedWarehouseId = purchase.warehouseId || warehouseIdFromBatch;

    // 3) Fetch inventory for selected item in the resolved warehouse
    const inventory = await prisma.inventory.findFirst({
      where: {
        companyId,
        productId: item.productId,
        warehouseId: resolvedWarehouseId,
      },
    });
    const currentStock = inventory ? Number(inventory.availableQuantity) : 0;

    const sellingUnits = (item.product.sellingUnits as any[]) || [];
    const stockByUnit = calculateStockByUnit(currentStock, sellingUnits);

    // التحقق من حالة البيع:
    // إذا كانت الكمية في المخزن أقل من الكمية التي تم شراؤها في هذه الفاتورة
    // فهذا يعني أن جزءا منها قد تم بيعه أو التصرف فيه
    const originalPurchaseQty = Number(item.quantity); // الكمية عند الشراء
    const hasBeenSold = currentStock < originalPurchaseQty; // 3. Get available quantity (base unit)

    const supplierdata = serializeData(purchase.supplier);
    const products = serializeData({
      ...item.product,
      warehouseId: resolvedWarehouseId,
    });
    // 6. Final return object
    return {
      success: true,
      data: {
        purchase: {
          id: purchase.id,
          totalAmount: Number(purchase.totalAmount),
          amountPaid: Number(purchase.amountPaid),
          amountDue: Number(purchase.amountDue),
          status: purchase.status,
          supplierId: purchase.supplierId,
          createdAt: purchase.invoiceDate,
        },

        supplier: supplierdata,

        product: products,

        purchaseItem: {
          id: item.id,
          quantity: item.quantity,
          unitCost: Number(item.price),
          totalCost: Number(item.totalPrice),
        },

        inventory: {
          stockByUnit, // سيعيد {"unit-1": 13, "unit-176...": 1.3}
          currentStockInBaseUnit: currentStock,

          isPartiallySold: hasBeenSold,
          maxReturnableQty: Math.min(
            currentStock,
            originalPurchaseQty,
            batchRemainingQty || originalPurchaseQty,
          ), // لا يمكن إرجاع أكثر من المتاح بالمخزون أو المتبقي من دفعات الشراء
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
          availableQuantity: newAvailableQuantity,
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

        if (inventory.availableQuantity < item.selectedQty) {
          throw new Error("Insufficient available stock for reservation");
        }

        const newReservedQuantity =
          inventory.reservedQuantity + item.selectedQty;
        const newAvailableQuantity =
          inventory.availableQuantity - item.selectedQty;

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
            availableQuantity: newAvailableQuantity,
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
        { location: { contains: searchQuery, mode: "insensitive" } },
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
        availableQuantity: true,
        reorderLevel: true,
        maxStockLevel: true,
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        location: true,
        status: true,
        lastStockTake: true,
        createdAt: true,
        updatedAt: true,
      },
      where: combinedWhere,
    });

    const filteredInventory = inventory.filter((item) => {
      if (requestedStatus === "attention") {
        return item.availableQuantity <= (item.reorderLevel || 0);
      }

      if (requestedStatus === "low") {
        return (
          item.availableQuantity > 0 &&
          item.availableQuantity <= (item.reorderLevel || 0)
        );
      }

      if (requestedStatus === "out_of_stock") {
        return item.availableQuantity <= 0;
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
      if (item.availableQuantity <= (item.reorderLevel || 0)) {
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
            if (result.successful > 0) {
              await markNotificationDigestSent(
                companyId,
                "low-stock-summary",
                idKey,
              );
            }
          })
          .catch((err) => console.error("Notification Error:", err));
      }
    }

    const convertedInventory = paginatedInventory.map((item) => {
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
          availableByUnit[unit.id] = item.availableQuantity;
          reservedByUnit[unit.id] = item.reservedQuantity;
        } else {
          // Calculate for higher units
          let divisor = 1;
          for (let i = 1; i <= index; i++) {
            divisor *= sellingUnits[i].unitsPerParent;
          }
          stockByUnit[unit.id] = Math.floor(baseStock / divisor);
          availableByUnit[unit.id] = Math.floor(
            item.availableQuantity / divisor,
          );
          reservedByUnit[unit.id] = Math.floor(item.reservedQuantity / divisor);
        }
      });

      return {
        ...item,
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
export async function updateMultipleInventories(
  updatesData: InventoryUpdateDatas[],
  userId: string,
  companyId: string,
) {
  try {
    await validateFiscalYear(companyId);
    if (!companyId || !userId) {
      return {
        success: false,
        error: "معرف الشركة ومعرف المستخدم مطلوبان",
      };
    }

    if (!updatesData || updatesData.length === 0) {
      return {
        success: false,
        error: "يجب إضافة تحديث واحد على الأقل",
      };
    }

    // Validate each update
    for (let i = 0; i < updatesData.length; i++) {
      const update = updatesData[i];

      if (!update.productId || !update.warehouseId) {
        return {
          success: false,
          error: `التحديث ${i + 1}: المنتج والمستودع مطلوبان`,
        };
      }

      if (!update.selectedUnitId) {
        return {
          success: false,
          error: `التحديث ${i + 1}: يجب اختيار وحدة البيع`,
        };
      }

      if (!update.quantity || update.quantity <= 0) {
        return {
          success: false,
          error: `التحديث ${i + 1}: الكمية يجب أن تكون أكبر من صفر`,
        };
      }

      if (update.updateType === "supplier") {
        if (!update.supplierId || !update.unitCost || update.unitCost <= 0) {
          return {
            success: false,
            error: `التحديث ${i + 1}: المورد وسعر الوحدة مطلوبان لتحديثات المورد`,
          };
        }

        // if ((update.paymentAmount || 0) > totalCost) {
        //   return {
        //     success: false,
        //     error: `التحديث ${i + 1}: مبلغ الدفع أكبر من التكلفة الإجمالية`,
        //   };
        // }
      }
    }

    // Process all updates in a transaction
    const result = await prisma.$transaction(
      async (tx) => {
        const accountMap = await getDefaultAccountMap(tx, companyId);
        const inventoryAccount = accountMap.get("inventory");
        const payableAccount = accountMap.get("accounts_payable");
        const updatedInventories = [];
        const createdPurchases = [];
        const stockMovements = [];
        let totalCost = 0;
        const receiptNumbers = await Promise.all(
          updatesData.map((_, i) => generateSaleNumber(companyId, i)),
        );
        for (let idx = 0; idx < updatesData.length; idx++) {
          // 🆕 use indexed loop
          const updateData = updatesData[idx];
          // Fetch product and current inventory
          const [product, currentInventory] = await Promise.all([
            tx.product.findUnique({
              where: { id: updateData.productId },
              select: {
                id: true,
                name: true,
                sku: true,
                sellingUnits: true, // 🆕 Get selling units
              },
            }),
            tx.inventory.findFirst({
              where: {
                companyId,
                productId: updateData.productId,
                warehouseId: updateData.warehouseId,
              },
            }),
          ]);

          if (!product) {
            throw new Error(`المنتج غير موجود: ${updateData.productId}`);
          }

          // 🆕 Parse selling units
          const sellingUnits = (product.sellingUnits as any[]) || [];
          const selectedUnit = sellingUnits.find(
            (u: any) => u.id === updateData.selectedUnitId,
          );

          if (!selectedUnit) {
            throw new Error(
              `الوحدة المحددة غير موجودة: ${updateData.selectedUnitId}`,
            );
          }

          // 🆕 Convert to base units
          const stockUnits = convertToBaseUnits(
            updateData.quantity,
            selectedUnit,
            sellingUnits,
          );
          totalCost = stockUnits * updateData.unitCost!;
          console.log(totalCost);

          const receiptNo = receiptNumbers[idx];

          // Get or create inventory record
          let inventory = currentInventory;
          if (!inventory) {
            inventory = await tx.inventory.create({
              data: {
                companyId,
                productId: product.id,
                warehouseId: updateData.warehouseId,
                availableQuantity: 0,
                stockQuantity: 0,
                reorderLevel: 10,
                status: "available",
                lastStockTake: new Date(),
              },
            });
          }

          // Calculate final quantities (in base units)
          const finalStockQty = inventory.stockQuantity + stockUnits;
          const finalAvailableQty = inventory.availableQuantity + stockUnits;
          const finalReorderLevel = inventory.reorderLevel;

          let calculatedStatus: "available" | "low" | "out_of_stock" =
            "available";
          if (finalAvailableQty <= 0) calculatedStatus = "out_of_stock";
          else if (finalAvailableQty < finalReorderLevel)
            calculatedStatus = "low";

          let purchaseId: string | null = null;
          let paymentId: string | null = null;
          // Create purchase if from supplier
          if (
            updateData.updateType === "supplier" &&
            updateData.unitCost &&
            updateData.supplierId
          ) {
            const paid = updateData.payment?.amountBase || 0;
            const due = totalCost - paid;
            console.log("Total Cost:", totalCost, "Paid:", paid, "Due:", due);
            const item = {
              companyId: companyId,
              productId: product.id,
              quantity: stockUnits,
              price: updateData.unitCost,
              unit: selectedUnit.name,
              totalPrice: totalCost,
            };
            const voucherNumber = await getNextVoucherNumber(
              companyId,
              "PAYMENT",
              tx,
            );
            const payment =
              paid > 0
                ? {
                    companyId,
                    currencyCode: "",
                    voucherNumber,
                    supplierId: updateData.supplierId,
                    userId,
                    branchId: updateData.branchId,
                    amount: paid,
                    type: TransactionType.PAYMENT,
                    status: "paid",
                    financialAccountId:
                      updateData.payment?.financialAccountId || null,
                    paymentMethod: updateData.payment?.paymentMethod ?? "cash",
                    notes: updateData.notes || "دفعة مشتريات",
                  }
                : undefined;

            const purchase = await tx.invoice.create({
              data: {
                companyId,
                invoiceNumber: receiptNo,
                cashierId: userId,
                supplierId: updateData.supplierId,
                totalAmount: totalCost,
                amountPaid: paid,
                branchId: updateData.branchId,
                sale_type: "PURCHASE",
                amountDue: due,
                status:
                  paid >= totalCost ? "paid" : paid > 0 ? "partial" : "pending",
                items: { create: item },
                transactions: { create: payment },
              },
              include: { transactions: true, items: true },
            });
            paymentId = purchase.transactions[0]?.id ?? "";
            purchaseId = purchase.id;
            createdPurchases.push(purchase);
            let supplierPaymentId: string | null = null;

            const outstanding = totalCost - paid;
            await tx.supplier.update({
              where: { id: updateData.supplierId, companyId },
              data: {
                totalPurchased: { increment: totalCost },
                totalPaid: { increment: paid },
                outstandingBalance: { increment: outstanding },
              },
            });

            const settlementAccount = resolveSettlementAccount(
              accountMap,
              updateData.payment?.paymentMethod,
            );
            const updatedInventory = await tx.inventory.update({
              where: {
                companyId_productId_warehouseId: {
                  companyId,
                  productId: product.id,
                  warehouseId: updateData.warehouseId,
                },
              },
              data: {
                availableQuantity: finalAvailableQty,
                stockQuantity: finalStockQty,
                reservedQuantity:
                  updateData.reservedQuantity || inventory.reservedQuantity,

                status: calculatedStatus,
                lastStockTake: updateData.lastStockTake || new Date(),
              },
              include: {
                product: { select: { name: true, sku: true } },
                warehouse: { select: { name: true } },
              },
            });

            await tx.inventoryBatch.create({
              data: {
                inventoryId: inventory.id,
                invoiceItemId: purchase.items[0].id,
                quantity: stockUnits,
                expiredAt: updateData.expiredAt,
                remainingQuantity: finalAvailableQty,
                costPrice: updateData.unitCost ?? 0,
                receivedAt: updateData.lastStockTake,
                supplierId: updateData.supplierId || null,
              },
            });
            updatedInventories.push(updatedInventory);
            if (!inventoryAccount || !payableAccount) {
              throw new Error(
                "Missing required account mappings for purchase journal entry",
              );
            }

            if (paid > 0 && !settlementAccount) {
              throw new Error(
                "Missing settlement account mapping for purchase payment",
              );
            }

            const entryYear = new Date().getFullYear();
            const entryNumberBase = `JE-${entryYear}-${purchase.id}`;
            const desc = `مشتريات: ${purchase.invoiceNumber}`;
            const purchaseLines: any[] = [
              buildWarehouseJournalLine(
                companyId,
                inventoryAccount,
                desc,
                totalCost,
                0,
                {
                  currency: updateData.payment?.selectedCurrency || "",
                  baseCurrency: updateData.baseCurrency,
                  exchangeRate: updateData.payment?.exchangeRate,
                  foreignAmount: updateData.payment?.amountFC,
                },
              ),
            ];
            const paymentac = updateData.payment?.accountId ?? "";

            if (paid > 0 && settlementAccount) {
              purchaseLines.push(
                buildWarehouseJournalLine(
                  companyId,
                  paymentac,
                  `${desc} - payment`,
                  0,
                  paid,
                  {
                    currency: updateData.payment?.selectedCurrency || "",
                    baseCurrency: updateData.baseCurrency,
                    exchangeRate: updateData.payment?.exchangeRate,
                    foreignAmount: updateData.payment?.amountFC,
                  },
                ),
              );
            }

            if (outstanding > 0) {
              purchaseLines.push(
                buildWarehouseJournalLine(
                  companyId,
                  payableAccount,
                  `${desc} - payable`,
                  0,
                  outstanding,
                  {
                    currency: updateData.payment?.selectedCurrency || "",
                    baseCurrency: updateData.baseCurrency,
                    exchangeRate: updateData.payment?.exchangeRate,
                  },
                ),
              );
            }

            let journalCreated = false;
            for (let attempt = 0; attempt < 5; attempt++) {
              const entryNumber =
                attempt === 0
                  ? entryNumberBase
                  : `${entryNumberBase}-${attempt + 1}`;
              try {
                await tx.journalHeader.create({
                  data: {
                    companyId,
                    entryNumber,
                    description: desc,
                    branchId: updateData.branchId,
                    referenceType: "سند صرف مخزني",
                    referenceId: paymentId ?? purchaseId,
                    entryDate: new Date(),
                    status: "POSTED",
                    createdBy: userId,
                    lines: {
                      create: purchaseLines.map((line) => ({
                        ...line,
                        companyId,
                      })),
                    },
                  },
                });
                journalCreated = true;
                break;
              } catch (error: any) {
                const isUniqueError =
                  error instanceof Prisma.PrismaClientKnownRequestError &&
                  error.code === "P2002";
                if (!isUniqueError || attempt === 4) throw error;
              }
            }
            if (!journalCreated) {
              throw new Error("تعذر إنشاء قيد اليومية بسبب تعارض رقم القيد");
            }
          }

          // Update inventory & create batch for manual updates (no supplier)
          if (updateData.updateType !== "supplier") {
            const updatedInventory = await tx.inventory.update({
              where: {
                companyId_productId_warehouseId: {
                  companyId,
                  productId: updateData.productId,
                  warehouseId: updateData.warehouseId,
                },
              },
              data: {
                availableQuantity: finalAvailableQty,
                stockQuantity: finalStockQty,
                reservedQuantity:
                  updateData.reservedQuantity || inventory.reservedQuantity,

                status: calculatedStatus,
                lastStockTake: updateData.lastStockTake || new Date(),
              },
              include: {
                product: { select: { name: true, sku: true } },
                warehouse: { select: { name: true } },
              },
            });

            // create a batch record for manual adjustment so batches reflect new stock
            await tx.inventoryBatch.create({
              data: {
                inventoryId: inventory.id,
                invoiceItemId: null,
                quantity: stockUnits,
                expiredAt: updateData.expiredAt,
                remainingQuantity: stockUnits,
                costPrice: updateData.unitCost ?? 0,
                receivedAt: updateData.lastStockTake,
                supplierId: null,
              },
            });

            updatedInventories.push(updatedInventory);
          }

          // Record stock movement
          const stockDifference = finalStockQty - inventory.stockQuantity;
          if (stockDifference !== 0) {
            const movement = await tx.stockMovement.create({
              data: {
                companyId,
                productId: product.id,
                warehouseId: updateData.warehouseId,
                userId,
                movementType: "وارد للمخزن",
                quantity: Math.abs(stockDifference),
                reason:
                  updateData.updateType === "supplier"
                    ? "تم استلام المورد"
                    : updateData.reason || "تحديث يدوي",
                notes:
                  updateData.notes ||
                  `${updateData.updateType === "supplier" ? "المخزون من المورد" : "تحديث المخزون"}`,
                quantityBefore: inventory.stockQuantity,
                quantityAfter: finalStockQty,
              },
            });
            stockMovements.push(movement);
          }
        }

        // Create activity log for batch
        const totalUnits = updatesData.reduce((sum, u) => sum + u.quantity, 0);
        await tx.activityLogs.create({
          data: {
            userId,
            companyId,
            userAgent: typeof window !== "undefined" ? navigator.userAgent : "",
            action: "تحديث مخزون",
            details: `تم تحديث ${updatesData.length} سجل مخزون. إجمالي الوحدات: ${totalUnits}`,
          },
        });

        // Inside the transaction return — serialize before leaving the tx
        return {
          updatedInventories: updatedInventories.map(serializeDecimal),
          createdPurchases: createdPurchases.map(serializeDecimal),
          stockMovements: stockMovements.map(serializeDecimal),
        };
      },
      {
        timeout: 60000,
        maxWait: 10000,
      },
    );

    revalidatePath("/inventory");

    return {
      success: true,
      count: result.updatedInventories.length,
      inventories: result.updatedInventories,
      purchases: result.createdPurchases,
      message: `تم تحديث ${result.updatedInventories.length} سجل مخزون بنجاح`,
    };
  } catch (error) {
    console.error("Error updating multiple inventory:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تحديث المخزون",
    };
  }
}

// 🆕 Helper function to convert to base units
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
