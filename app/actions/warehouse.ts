// app/actions/warehouse.ts
"use server";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
import {
  CashierSchema,
  CreateWarehouseSchema,
  InventoryUpdateWithTrackingSchema,
  WarehouseInput,
} from "@/lib/zod";
import { recordSupplierPaymentWithJournalEntries } from "./Journal Entry";
import { getActiveFiscalYears } from "./fiscalYear";
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
export type InventoryUpdateWithTrackingInput = z.infer<
  typeof InventoryUpdateWithTrackingSchema
>;

interface ExtendedInventoryUpdateData {
  id: string;
  reason?: string;
  notes?: string;
  availableQuantity?: number;
  stockQuantity?: number;
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
}
function generateArabicPurchaseReceiptNumber(lastNumber: number) {
  const padded = String(lastNumber).padStart(5, "0"); // 00001
  const year = new Date().getFullYear();
  return `مشتريات-${year}-${padded}Q`; // مشتريات-2025-00001
}

export async function updateInventory(
  data: ExtendedInventoryUpdateData,
  userId: string,
  companyId: string,
) {
  try {
    const {
      id,

      notes,
      updateType,
      availableQuantity: inputCartons,
      stockQuantity: inputCartonsStock,
      quantity: purchaseQty,
      unitCost,
      paymentMethod,
      paymentAmount,
      supplierId: providedSupplierId,
      warehouseId: targetWarehouseId, // المستودع المستهدف
      ...updateData
    } = data;
    console.log(paymentMethod);
    // 1️⃣ جلب السجل الحالي للمخزون
    const currentInventory = await prisma.inventory.findUnique({
      where: { id, companyId },
      include: { product: true, warehouse: true },
    });
    if (!currentInventory) throw new Error("سجل المخزون غير موجود");
    let nextNumber = 1;
    if (currentInventory?.receiptNo) {
      const match = currentInventory.receiptNo.match(/(\d+)$/);
      if (match) nextNumber = parseInt(match[1]) + 1;
    }
    const receiptNo = await generateArabicPurchaseReceiptNumber(nextNumber);
    let purchase;
    const product = currentInventory.product;
    const unitsPerPacket = product.unitsPerPacket || 1;
    const packetsPerCarton = product.packetsPerCarton || 1;
    const supplierId = providedSupplierId || product.supplierId;

    if (!supplierId) throw new Error("يجب تحديد المورد");

    // 2️⃣ التحقق من وجود المورد
    const supplierExists = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplierExists) throw new Error("المورد غير موجود");

    const cartonToUnits = (cartons: number) =>
      cartons * packetsPerCarton * unitsPerPacket;

    const availableUnits = inputCartons ? cartonToUnits(inputCartons) : 0;
    const stockUnits = inputCartonsStock ? cartonToUnits(inputCartonsStock) : 0;

    // 3️⃣ تحديد المخزون المستهدف (نفس المستودع أو مستودع جديد)
    let inventoryTarget;
    if (targetWarehouseId === currentInventory.warehouseId) {
      // تحديث المخزون الحالي
      inventoryTarget = currentInventory;
    } else {
      // التحقق من وجود المخزون لنفس المنتج في المستودع الجديد
      const existingInTarget = await prisma.inventory.findFirst({
        where: {
          productId: product.id,
          warehouseId: targetWarehouseId,
          companyId,
        },
      });

      if (existingInTarget) {
        inventoryTarget = existingInTarget;
      } else {
        // إنشاء سجل جديد للمخزون
        inventoryTarget = await prisma.inventory.create({
          data: {
            companyId,
            productId: product.id,
            warehouseId: targetWarehouseId!,
            availableQuantity: 0,
            stockQuantity: 0,
            reorderLevel: currentInventory.reorderLevel,
            maxStockLevel: currentInventory.maxStockLevel,
            status: "متوفر",
            lastStockTake: new Date(),
          },
        });
      }
    }

    // 4️⃣ حساب الكميات النهائية
    const finalAvailableQty =
      inventoryTarget.availableQuantity + availableUnits;
    const finalStockQty = inventoryTarget.stockQuantity + stockUnits;
    const finalReorderLevel = inventoryTarget.reorderLevel;
    let calculatedStatus: "available" | "low" | "out_of_stock" = "available";
    if (finalAvailableQty <= 0) calculatedStatus = "out_of_stock";
    else if (finalAvailableQty < finalReorderLevel) calculatedStatus = "low";
    let purchaseItemId: string | null = null;

    // 5️⃣ إنشاء عملية شراء إذا كانت الكمية من المورد
    let purchaseId: string | null = null;
    if (updateType === "supplier" && inputCartons && unitCost) {
      const totalCost = inputCartons * unitCost;
      const paid = paymentAmount ?? 0;
      const due = Math.abs(totalCost - paid);
      purchase = await prisma.purchase.create({
        data: {
          companyId,
          supplierId,
          totalAmount: totalCost,
          amountPaid: paid,
          purchaseType: "purchases",
          amountDue: due,
          status: "pending",
        },
      });

      const purchaseItems = await prisma.purchaseItem.create({
        data: {
          companyId,
          purchaseId: purchase.id,
          productId: product.id,
          quantity: inputCartons,
          unitCost,
          totalCost,
        },
      });

      purchaseId = purchase.id;
      purchaseItemId = purchaseItems.id;
      // تسجيل الدفع إذا وجد
      if (paymentMethod && paymentAmount && paymentAmount > 0) {
        await prisma.supplierPayment.create({
          data: {
            companyId,
            supplierId,
            createdBy: userId,
            amount: paymentAmount,
            paymentMethod,
            note: notes,
          },
        });

        await prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            amountPaid: paymentAmount,
            amountDue: Math.max(0, totalCost - paymentAmount),
            status: paymentAmount >= totalCost ? "paid" : "partial",
          },
        });
      }
      const outstanding = Math.abs(totalCost - paid);
      await prisma.supplier.update({
        where: { id: supplierId, companyId },
        data: {
          totalPurchased: { increment: totalCost },

          totalPaid: { increment: paymentAmount },

          outstandingBalance: {
            increment: outstanding,
          },
        },
      });
    }

    // 6️⃣ تحديث المخزون النهائي
    const updatedInventory = await prisma.inventory.update({
      where: { id: inventoryTarget.id },
      data: {
        ...updateData,
        lastPurchaseId: purchaseId,
        lastPurchaseItemId: purchaseItemId,
        availableQuantity: finalAvailableQty,
        stockQuantity: finalStockQty,
        receiptNo,
        status: calculatedStatus,
        ...(data.lastStockTake && {
          lastStockTake: new Date(data.lastStockTake),
        }),
      },
      include: {
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true, location: true } },
      },
    });
    revalidatePath("/manageinvetory");

    // 7️⃣ تسجيل حركة المخزون
    const stockDifference = finalStockQty - inventoryTarget.stockQuantity;
    if (stockDifference !== 0) {
      await prisma.stockMovement.create({
        data: {
          companyId,
          productId: product.id,
          warehouseId: inventoryTarget.warehouseId,
          userId,
          movementType: stockDifference > 0 ? "وارد" : "صادر",
          quantity: Math.abs(stockDifference),
          reason: updateData.reason ? updateData.reason : "تم_استلام_المورد",
          notes:
            notes ||
            `${supplierId ? "المخزون من المورد" : "تحديث المخزون"}: ...`,
          quantityBefore: inventoryTarget.stockQuantity,
          quantityAfter: finalStockQty,
        },
      });
    }

    // 8️⃣ تسجيل النشاط
    await prisma.activityLogs.create({
      data: {
        userId,
        companyId,
        action:
          updateType === "supplier"
            ? "تم_استلام_مخزون_المورد"
            : "تم_تحديث_المخزون",
        details: `المنتج: ${product.name}, المخزون النهائي: ${finalStockQty}${
          paymentAmount ? `, الدفع: ${paymentAmount}` : ""
        }`,
      },
    });
    createPurchaseJournalEntries({
      purchase,
      companyId,
      userId,
      type: "purchase",
    }).catch((err) => {
      console.error("Failed to create purchase journal entries:", err);
    });
    return { success: true, data: updatedInventory };
  } catch (error) {
    console.error("خطأ في تحديث المخزون:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تحديث المخزون",
    };
  }
}
// export async function createSupplierPaymentJournalEntries({
//   payment,
//   companyId,
//   userId,
// }: {
//   payment: any;
//   companyId: string;
//   userId: string;
//   }) {

//   const mappings = await prisma.account_mappings.findMany({
//       where: { company_id: companyId, is_default: true },
//     });

//     const getAcc = (type: string) =>
//       mappings.find((m) => m.mapping_type === type)?.account_id;

//   const payableAccount =getAcc("accounts_payable")
//   const cashAccount = getAcc("cash")

//   const bankAccount = getAcc("bank")

//   const paymentAccount =
//     payment.paymentMethod === "bank"
//       ? bankAccount
//       : cashAccount;

//   const entryNumber = `SP-${payment.id.slice(0, 6)}`;

//   await prisma.journal_entries.create({
//     data: {
//         company_id: companyId,
//       account_id: payableAccount,
//       description: `سداد للمورد`,
//       debit: payment.amount,
//       credit: 0,
//       reference_type: "supplier_payment",
//       reference_id: payment.id,
//       entry_number: `${entryNumber} -D`,
//       entry_date: new Date(),
//       created_by: userId,
//       is_automated: true,
//     },
//   });

//   await prisma.journal_entries.create({
//     data: {
//           company_id: companyId,
//       account_id: paymentAccount,
//       description: `سداد للمورد`,
//       debit: 0,
//       credit: payment.amount,
//       reference_type: "supplier_payment",
//       reference_id: payment.id,
//       entry_date: new Date(),
//       entry_number: entryNumber + "-C",
//       created_by: userId,
//       is_automated: true,
//     },
//   });
// }
type PurchaseOrReturn = {
  id: string;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  paymentMethod?: "cash" | "bank";
  type: "purchase" | "return";
};

export async function createPurchaseJournalEntries({
  purchase,
  companyId,
  userId,
  type,
}: {
  purchase: any;
  companyId: string;
  userId: string;
  type: string;
}) {
  const mappings = await prisma.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
  });
  const fy = await getActiveFiscalYears();
  if (!fy) return;
  const getAcc = (type: string) =>
    mappings.find((m) => m.mapping_type === type)?.account_id;

  const payableAccount = getAcc("accounts_payable");
  const cashAccount = getAcc("cash");
  const bankAccount = getAcc("bank");
  const inventoryAccount = getAcc("inventory");

  if (!inventoryAccount || !payableAccount || !bankAccount || !cashAccount) {
    throw new Error("الحسابات الأساسية غير موجودة");
  }

  const entryNumber = `JE-${new Date().getFullYear()}-${purchase.id.slice(
    0,
    6,
  )}`;
  const description =
    type === "purchase"
      ? `مشتريات - فاتورة رقم ${purchase.id}`
      : `إرجاع مشتريات - فاتورة رقم ${purchase.id}`;

  // Helper to update account balance
  const updateAccountBalance = async (
    accountId: string,
    debit: number,
    credit: number,
  ) => {
    await prisma.accounts.update({
      where: { id: accountId },
      data: { balance: { increment: debit - credit } },
    });
  };

  if (purchase.type === "purchase") {
    // ================= PURCHASE =================
    // 1. Debit Inventory
    await prisma.journal_entries.create({
      data: {
        company_id: companyId,
        account_id: inventoryAccount,
        description,
        debit: purchase.totalAmount,
        credit: 0,
        fiscal_period: fy.period_name,
        entry_date: new Date(),
        reference_type: "purchase",
        reference_id: purchase.id,
        entry_number: entryNumber + "-D",
        created_by: userId,
        is_automated: true,
      },
    });
    await updateAccountBalance(inventoryAccount, purchase.totalAmount, 0);

    // 2. Credit Payables / Cash / Bank
    if (purchase.amountPaid === 0) {
      // Full credit
      await prisma.journal_entries.create({
        data: {
          company_id: companyId,
          account_id: payableAccount,
          description: description + " - آجل كامل",
          debit: 0,
          fiscal_period: fy.period_name,
          credit: purchase.totalAmount,
          entry_date: new Date(),
          reference_type: "purchase",
          reference_id: purchase.supplierId,
          entry_number: entryNumber + "-C",
          created_by: userId,
          is_automated: true,
        },
      });
      await updateAccountBalance(payableAccount, 0, purchase.totalAmount);
    } else if (purchase.amountPaid < purchase.totalAmount) {
      const due = purchase.amountDue;

      // Remaining payable
      await prisma.journal_entries.create({
        data: {
          company_id: companyId,
          account_id: payableAccount,
          description: description + " - دفع جزئي",
          debit: 0,
          credit: due,
          fiscal_period: fy.period_name,
          entry_date: new Date(),
          reference_type: "purchase",
          reference_id: purchase.supplierId,
          entry_number: entryNumber + "-C1",
          created_by: userId,
          is_automated: true,
        },
      });
      await updateAccountBalance(payableAccount, 0, due);

      // Paid part
      const paymentAccount =
        purchase.paymentMethod === "bank" ? bankAccount : cashAccount;
      await prisma.journal_entries.create({
        data: {
          company_id: companyId,
          account_id: paymentAccount,
          description: description + " - دفع جزئي",
          debit: 0,
          fiscal_period: fy.period_name,
          credit: purchase.amountPaid,
          entry_date: new Date(),
          reference_type: "purchase",
          reference_id: purchase.supplierId,
          entry_number: entryNumber + "-C2",
          created_by: userId,
          is_automated: true,
        },
      });
      await updateAccountBalance(paymentAccount, 0, purchase.amountPaid);
    } else {
      // Fully paid
      const paymentAccount =
        purchase.paymentMethod === "bank" ? bankAccount : cashAccount;
      await prisma.journal_entries.create({
        data: {
          company_id: companyId,
          account_id: paymentAccount,
          description: description + " - مدفوع بالكامل",
          debit: 0,
          fiscal_period: fy.period_name,
          credit: purchase.totalAmount,
          entry_date: new Date(),
          reference_type: "purchase",
          reference_id: purchase.supplierId,
          entry_number: entryNumber + "-C",
          created_by: userId,
          is_automated: true,
        },
      });
      await updateAccountBalance(paymentAccount, 0, purchase.totalAmount);
    }
  } else {
    // ================= PURCHASE RETURN =================
    // 1. Credit Inventory (reduce inventory value)
    await prisma.journal_entries.create({
      data: {
        company_id: companyId,
        account_id: inventoryAccount,
        description: description + " - تخفيض المخزون",
        debit: 0,
        fiscal_period: fy.period_name,
        credit: purchase.totalAmount,
        entry_date: new Date(),
        reference_type: " مرتجع مشتريات",
        reference_id: purchase.id,
        entry_number: entryNumber + "-C1",
        created_by: userId,
        is_automated: true,
      },
    });
    await updateAccountBalance(inventoryAccount, 0, purchase.totalAmount);

    const remainingAmount = purchase.totalAmount - purchase.amountPaid;

    if (purchase.amountPaid > 0) {
      // Debit Cash/Bank
      const paymentAccount =
        purchase.paymentMethod === "bank" ? bankAccount : cashAccount;
      await prisma.journal_entries.create({
        data: {
          company_id: companyId,
          account_id: paymentAccount,
          description: description + " - استرداد نقدي/بنكي",
          debit: purchase.amountPaid,
          credit: 0,
          fiscal_period: fy.period_name,
          entry_date: new Date(),
          reference_type: "مرتجع مشتريات دفع",
          reference_id: purchase.supplierId,
          entry_number: entryNumber + "-D1",
          created_by: userId,
          is_automated: true,
        },
      });
      await updateAccountBalance(paymentAccount, purchase.amountPaid, 0);

      // If partial refund, debit remaining to payables
      if (remainingAmount > 0) {
        await prisma.journal_entries.create({
          data: {
            company_id: companyId,
            account_id: payableAccount,
            description: description + " - تخفيض الذمم الدائنة",
            debit: remainingAmount,
            credit: 0,
            fiscal_period: fy.period_name,
            entry_date: new Date(),
            reference_type: "purchase_return",
            reference_id: purchase.supplierId,
            entry_number: entryNumber + "-D2",
            created_by: userId,
            is_automated: true,
          },
        });
        await updateAccountBalance(payableAccount, remainingAmount, 0);
      }
    } else {
      // No refund: debit payables
      await prisma.journal_entries.create({
        data: {
          company_id: companyId,
          account_id: payableAccount,
          description: description + " - تخفيض الذمم الدائنة",
          debit: purchase.totalAmount,
          credit: 0,
          fiscal_period: fy.period_name,
          entry_date: new Date(),
          reference_type: "purchase_return",
          reference_id: purchase.supplierId,
          entry_number: entryNumber + "-D1",
          created_by: userId,
          is_automated: true,
        },
      });
      await updateAccountBalance(payableAccount, purchase.totalAmount, 0);
    }
  }
}

interface PurchaseReturnData {
  purchaseId: string; // Changed from productId
  purchaseItemId: string; // Added to identify specific item
  warehouseId: string;
  returnQuantity: number;
  returnUnit: "unit" | "packet" | "carton";
  unitCost: number;
  paymentMethod?: string;
  refundAmount?: number;
  reason?: string;
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
    paymentMethod,
    refundAmount = 0,
    reason,
  } = data;

  try {
    let purchaseReturn;
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Get original purchase and item
        const originalPurchase = await tx.purchase.findUnique({
          where: { id: purchaseId, companyId },
          include: {
            purchaseItems: {
              where: { id: purchaseItemId },
              include: {
                product: true,
              },
            },
            supplier: true,
          },
        });

        if (!originalPurchase) {
          throw new Error("الشراء الأصلي غير موجود");
        }

        if (originalPurchase.purchaseItems.length === 0) {
          throw new Error("عنصر الشراء غير موجود");
        }

        const purchaseItem = originalPurchase.purchaseItems[0];
        const product = purchaseItem.product;
        const supplier = originalPurchase.supplier;
        const productId = product.id;
        const supplierId = supplier.id;

        // 2. Get inventory
        const inventory = await tx.inventory.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId,
              productId,
              warehouseId,
            },
          },
        });

        if (!inventory) {
          throw new Error("سجل المخزون غير موجود");
        }

        // 3. Convert return quantity to base units
        function convertToBaseUnits(
          qty: number,
          unit: string,
          unitsPerPacket: number,
          packetsPerCarton: number,
        ): number {
          if (unit === "unit") return qty;
          if (unit === "packet") return qty * (unitsPerPacket || 1);
          if (unit === "carton")
            return qty * (unitsPerPacket || 1) * (packetsPerCarton || 1);
          return qty;
        }

        const returnQuantityInUnits = convertToBaseUnits(
          returnQuantity,
          returnUnit,
          product.unitsPerPacket || 1,
          product.packetsPerCarton || 1,
        );

        // Validate: Can't return more than what's in stock
        if (returnQuantityInUnits > inventory.stockQuantity) {
          throw new Error(
            `لا يمكن إرجاع كمية أكبر من المخزون الحالي (${inventory.stockQuantity})`,
          );
        }

        // Validate: Can't return more than originally purchased
        const originalPurchasedInUnits = convertToBaseUnits(
          purchaseItem.quantity,
          returnUnit,
          product.unitsPerPacket || 1,
          product.packetsPerCarton || 1,
        );

        if (returnQuantityInUnits > originalPurchasedInUnits) {
          throw new Error(
            `لا يمكن إرجاع كمية أكبر من الكمية المشتراة الأصلية (${purchaseItem.quantity})`,
          );
        }

        // 4. Calculate return cost (ALWAYS POSITIVE)
        const returnTotalCost = Math.abs(returnQuantity * unitCost);

        // 5. Calculate outstanding balance adjustments
        const amountDue = Number(originalPurchase.amountDue || 0);
        let outstandingDecrease = 0;
        console.log(amountDue);
        if (refundAmount > 0) {
          outstandingDecrease = Math.min(amountDue, refundAmount);
        } else {
          // If no refund, reduce outstanding by return cost
          outstandingDecrease = Math.min(amountDue, returnTotalCost);
        }

        // 6. Create purchase return record (POSITIVE VALUES)
        purchaseReturn = await tx.purchase.update({
          where: { id: purchaseId },
          data: {
            companyId,
            supplierId,
            purchaseType: "return",
            totalAmount: returnTotalCost,
            amountPaid: refundAmount,
            amountDue:
              Number(originalPurchase.amountDue) > 0
                ? Math.max(0, Number(originalPurchase.amountDue) - refundAmount)
                : 0,
            status: "مرتجع",
            // Link to original purchase
          },
        });

        // 7. Create purchase item for return (POSITIVE QUANTITY)
        await tx.purchaseItem.create({
          data: {
            companyId,
            purchaseId: purchaseReturn.id,
            productId,
            quantity: returnQuantity,
            unitCost,
            totalCost: returnTotalCost,
          },
        });

        // 8. Update inventory (DECREASE stock)
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

        // 9. Record stock movement
        await tx.stockMovement.create({
          data: {
            companyId,
            productId,
            warehouseId,
            userId,
            movementType: "صادر",
            quantity: returnQuantityInUnits,
            reason: "إرجاع_للمورد",
            quantityBefore: inventory.stockQuantity,
            quantityAfter: newStockQty,
            referenceType: "purchase_return",
            referenceId: purchaseReturn.id,
            notes:
              reason ||
              `إرجاع ${returnQuantity} ${returnUnit} من فاتورة ${purchaseId}`,
          },
        });

        // 10. Handle refund payment if any
        if (refundAmount > 0 && paymentMethod) {
          await tx.supplierPayment.create({
            data: {
              companyId,
              supplierId,
              purchaseId: purchaseReturn.id,
              createdBy: userId,
              amount: refundAmount,
              paymentMethod,
              note: reason || `استرداد مبلغ من المورد - فاتورة ${purchaseId}`,
            },
          });
        }

        // 11. Update supplier balance
        await tx.supplier.update({
          where: { id: supplierId },
          data: {
            totalPurchased: {
              set: Math.max(
                0,
                Number(supplier.totalPurchased) - returnTotalCost,
              ),
            },
            ...(refundAmount > 0 && {
              totalPaid: {
                set: Math.max(0, Number(supplier.totalPaid) - refundAmount),
              },
            }),
            outstandingBalance: {
              set: Math.max(
                0,
                Number(supplier.outstandingBalance) - outstandingDecrease,
              ),
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

    revalidatePath("/manageinvetory");
    revalidatePath("/purchases"); // Add this path too
    createPurchaseJournalEntries({
      purchase: purchaseReturn,
      companyId,
      userId,
      type: "return",
    }).catch((err) => {
      console.error("Failed to create purchase journal entries:", err);
    });
    return result;
  } catch (error: any) {
    console.error("خطأ في إرجاع المشتريات:", error);
    return {
      success: false,
      message: error.message || "فشل في معالجة الإرجاع",
    };
  }
}
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
      revalidatePath("/manageinvetory");
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
export async function getInventoryLevels(warehouseId?: string) {
  try {
    const inventory = await prisma.inventory.findMany({
      where: warehouseId ? { warehouseId } : undefined,
      include: {
        product: {
          select: {
            name: true,
            sku: true,
            unitsPerPacket: true,
            packetsPerCarton: true,
          },
        },
        warehouse: {
          select: {
            name: true,
            location: true,
          },
        },
      },
    });

    return inventory.map((inv) => ({
      ...inv,
      totalUnits:
        inv.stockQuantity *
        inv.product.packetsPerCarton *
        inv.product.unitsPerPacket,
      totalPackets: inv.stockQuantity * inv.product.packetsPerCarton,
      needsReorder: inv.availableQuantity <= inv.reorderLevel,
    }));
  } catch (error) {
    console.error("Error getting inventory levels:", error);
    throw error;
  }
}
type DateRange = {
  from: Date | null;
  to: Date | null;
};

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
    console.log(dateRange);
    // If you want to support global filter search, add to where using OR on fields:

    // Get total count for pagination
    const totalCount = await prisma.stockMovement.count({
      where: { companyId },
    });

    // Get paginated data
    const movements = await prisma.stockMovement.findMany({
      select: {
        id: true,
        movementType: true,
        quantity: true,
        reason: true,
        quantityBefore: true,
        quantityAfter: true,
        notes: true,
        createdAt: true,

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

    return { movements, totalCount };
  } catch (error) {
    console.error("Error getting stock movements:", error);
    throw error;
  }
}

// 7. Get single inventory item by ID
export async function getInventoryById(
  companyId: string,
  searchQuery: string = "",
  where: Prisma.InventoryWhereInput = {},
  from?: string,
  to?: string,
  page: number = 1,
  pageSize: number = 7,
  sort: SortState = [],
) {
  try {
    const fromatDate = from ? new Date(from).toISOString() : undefined;
    const toDate = to ? new Date(to).toISOString() : undefined;

    const combinedWhere: Prisma.InventoryWhereInput = {
      ...where,
      companyId,
    };

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

    const totalCount = await prisma.inventory.count({ where: { companyId } });

    const inventory = await prisma.inventory.findMany({
      select: {
        id: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            costPrice: true,
            unitsPerPacket: true,
            type: true,
            packetsPerCarton: true,

            supplier: { select: { id: true, name: true } }, // ✅ تأكد أن هذا موجود
          },
        },

        productId: true,
        warehouse: {
          select: {
            name: true,
            location: true,
          },
        },
        receiptNo: true,
        lastPurchaseId: true,
        lastPurchaseItemId: true,
        warehouseId: true,
        stockQuantity: true,
        reservedQuantity: true,
        availableQuantity: true,
        reorderLevel: true,
        maxStockLevel: true,
        location: true,
        status: true,

        lastStockTake: true,
        createdAt: true,
        updatedAt: true,
      },
      where: combinedWhere,
      skip: page * pageSize,
      take: pageSize,
    });

    // ✅ Convert all unit-based quantities to carton-based
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
    const convertedInventory = inventory.map((item) => {
      const availableUnits = item.availableQuantity ?? 0;

      const { availablePackets, availableCartons } = convertFromBaseUnit(
        item.product,
        item.availableQuantity,
      );

      const { availablePackets: stockPackets, availableCartons: stockCartons } =
        convertFromBaseUnit(item.product, item.stockQuantity);

      const {
        availablePackets: reservedPackets,
        availableCartons: reservedCartons,
      } = convertFromBaseUnit(item.product, item.reservedQuantity);

      let finalAvailableUnits = 0;
      let finalAvailablePackets = 0;
      let finalAvailableCartons = 0;

      let finalStockUnits = 0;
      let finalStockPackets = 0;
      let finalStockCartons = 0;

      let finalReservedUnits = 0;
      let finalReservedPackets = 0;
      let finalReservedCartons = 0;

      if (item.product.type === "full") {
        finalAvailableUnits = availableUnits;
        finalAvailablePackets = availablePackets;
        finalAvailableCartons = availableCartons;

        finalStockUnits = availableUnits;
        finalStockPackets = stockPackets;
        finalStockCartons = stockCartons;

        finalReservedUnits = availableUnits;
        finalReservedPackets = reservedPackets;
        finalReservedCartons = reservedCartons;
      } else if (item.product.type === "cartonUnit") {
        finalAvailableUnits = availableUnits;
        finalAvailableCartons = availableCartons;
        finalAvailablePackets = 0;

        finalStockUnits = availableUnits;
        finalStockCartons = stockCartons;
        finalStockPackets = 0;

        finalReservedUnits = availableUnits;
        finalReservedCartons = reservedCartons;
        finalReservedPackets = 0;
      } else if (item.product.type === "cartonOnly") {
        finalAvailableCartons = availableCartons;
        finalAvailableUnits = 0;
        finalAvailablePackets = 0;

        finalStockCartons = stockCartons;
        finalStockUnits = 0;
        finalStockPackets = 0;

        finalReservedCartons = reservedCartons;
        finalReservedUnits = 0;
        finalReservedPackets = 0;
      } else if (item.product.type === "unit") {
        finalAvailableUnits = availableUnits;
        finalAvailablePackets = 0;
        finalAvailableCartons = 0;

        finalStockUnits = availableUnits;
        finalStockPackets = 0;
        finalStockCartons = 0;

        finalReservedUnits = availableUnits;
        finalReservedPackets = 0;
        finalReservedCartons = 0;
      } else if (item.product.type === "packetUnit") {
        finalAvailableUnits = availableUnits;
        finalAvailablePackets = availablePackets;
        finalAvailableCartons = 0;

        finalStockUnits = availableUnits;
        finalStockPackets = stockPackets;
        finalStockCartons = 0;

        finalReservedUnits = availableUnits;
        finalReservedPackets = reservedPackets;
        finalReservedCartons = 0;
      }

      return {
        ...item,
        availableUnits: finalAvailableUnits,
        availablePackets: finalAvailablePackets,
        availableCartons: finalAvailableCartons,

        stockUnits: finalStockUnits,
        stockPackets: finalStockPackets,
        stockCartons: finalStockCartons,

        reservedUnits: finalReservedUnits,
        reservedPackets: finalReservedPackets,
        reservedCartons: finalReservedCartons,
      };
    });
    const inventories = serializeData(convertedInventory);
    return { inventory: inventories, totalCount };
  } catch (error) {
    console.error("Error getting inventory by ID:", error);
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

export async function updateWarehouse(id: string, input: WarehouseInput) {
  const parsed = CreateWarehouseSchema.safeParse(input);
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
    return { success: false, error: "حدث خطأ أثناء تحديث المستودع" };
  }
}

export async function deleteWarehouse(id: string) {
  try {
    await prisma.warehouse.delete({ where: { id } });

    revalidatePath("/warehouses");
    revalidatePath("/products");

    return { success: true };
  } catch (error) {
    console.error("Failed to delete warehouse:", error);
    return { success: false, error: "حدث خطأ أثناء حذف المستودع" };
  }
}
