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
  WarehouseInput,
} from "@/lib/zod";
import { getActiveFiscalYears, validateFiscalYear } from "./fiscalYear";
import { PaymentState } from "@/components/common/ReusablePayment";
import { getNextVoucherNumber } from "./cashier";
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
      productId,
      bankId,
      transferNumber,
      currency_code,
      exchangeRate,
      amountFC,
      supplierId: providedSupplierId,
      warehouseId: targetWarehouseId,
      ...updateData
    } = data;

    // ============================================
    // 1️⃣ PARALLEL FETCH: Inventory + Supplier
    // ============================================
    const [currentInventory, supplierExists] = await Promise.all([
      prisma.inventory.findFirst({
        where: { companyId, productId, warehouseId: targetWarehouseId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              unitsPerPacket: true,
              packetsPerCarton: true,
              supplierId: true,
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
      }),
      providedSupplierId
        ? prisma.supplier.findUnique({
            where: { id: providedSupplierId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!currentInventory) {
      throw new Error("سجل المخزون غير موجود");
    }

    const product = currentInventory.product;
    const supplierId = providedSupplierId || product.supplierId;

    if (updateType === "supplier" && !supplierId) {
      throw new Error("يجب تحديد المورد");
    }

    if (updateType === "supplier" && !supplierExists) {
      throw new Error("المورد غير موجود");
    }

    // ============================================
    // 2️⃣ HELPER FUNCTIONS & CALCULATIONS
    // ============================================
    const unitsPerPacket = product.unitsPerPacket || 1;
    const packetsPerCarton = product.packetsPerCarton || 1;
    const cartonToUnits = (cartons: number) =>
      cartons * packetsPerCarton * unitsPerPacket;

    const availableUnits = inputCartons ? cartonToUnits(inputCartons) : 0;
    const stockUnits = inputCartonsStock ? cartonToUnits(inputCartonsStock) : 0;

    // Generate receipt number
    const nextNumber = currentInventory.receiptNo
      ? parseInt(currentInventory.receiptNo.match(/(\d+)$/)?.[1] || "0") + 1
      : 1;
    const receiptNo = `مشتريات-${new Date().getFullYear()}-${String(nextNumber).padStart(5, "0")}Q-${Date.now()}`;

    // ============================================
    // 3️⃣ DETERMINE TARGET INVENTORY
    // ============================================
    let inventoryTarget;
    if (targetWarehouseId === currentInventory.warehouseId) {
      inventoryTarget = currentInventory;
    } else {
      // Check if inventory exists in target warehouse
      inventoryTarget =
        (await prisma.inventory.findFirst({
          where: {
            productId: product.id,
            warehouseId: targetWarehouseId,
            companyId,
          },
        })) ||
        (await prisma.inventory.create({
          data: {
            companyId,
            productId: product.id,
            warehouseId: targetWarehouseId,
            availableQuantity: 0,
            stockQuantity: 0,
            reorderLevel: currentInventory.reorderLevel,
            maxStockLevel: currentInventory.maxStockLevel,
            status: "available",
            lastStockTake: new Date(),
          },
        }));
    }

    // ============================================
    // 4️⃣ CALCULATE FINAL QUANTITIES
    // ============================================
    const finalAvailableQty =
      inventoryTarget.availableQuantity + availableUnits;
    const finalStockQty = inventoryTarget.stockQuantity + stockUnits;
    const finalReorderLevel = inventoryTarget.reorderLevel;

    let calculatedStatus: "available" | "low" | "out_of_stock" = "available";
    if (finalAvailableQty <= 0) calculatedStatus = "out_of_stock";
    else if (finalAvailableQty < finalReorderLevel) calculatedStatus = "low";

    // ============================================
    // 5️⃣ TRANSACTION: CREATE PURCHASE & UPDATE INVENTORY
    // ============================================
    const result = await prisma.$transaction(
      async (tx) => {
        let purchase = null;
        let purchaseId: string | null = null;
        let purchaseItemId: string | null = null;
        let supplierPaymentId: string | null = null;

        // Create purchase if from supplier
        if (updateType === "supplier" && inputCartons && unitCost) {
          const totalCost = inputCartons * unitCost;
          const paid = paymentAmount ?? 0;
          const due = totalCost - paid;

          purchase = await tx.invoice.create({
            data: {
              companyId,
              invoiceNumber: "",
              supplierId: supplierId!,
              totalAmount: totalCost,
              amountPaid: paid,
              cashierId: userId,
              sale_type: "PURCHASE",
              amountDue: due,
              status:
                paid >= totalCost ? "paid" : paid > 0 ? "partial" : "pending",
            },
          });

          const purchaseItem = await tx.invoiceItem.create({
            data: {
              companyId,
              invoiceId: purchase.id,
              productId: product.id,
              quantity: inputCartons,
              price: unitCost,
              totalPrice: totalCost,
              unit: "",
            },
          });

          purchaseId = purchase.id;
          purchaseItemId = purchaseItem.id;

          // Prepare batch operations
          const operations = [];

          // Create supplier payment if applicable
          if (paymentMethod && paymentAmount && paymentAmount > 0) {
            operations.push(
              tx.financialTransaction.create({
                data: {
                  companyId,
                  supplierId: supplierId!,
                  userId: userId,
                  currencyCode: "",
                  voucherNumber: 0,
                  purchaseId: purchase.id,
                  amount: paymentAmount,
                  paymentMethod,
                  status: "paid",
                  notes: notes || "دفعة مشتريات",
                },
              }),
            );
            const supplierPayment = await operations[0];
            supplierPaymentId = supplierPayment.id;
          }

          // Update supplier totals
          const outstanding = totalCost - paid;
          operations.push(
            tx.supplier.update({
              where: { id: supplierId!, companyId },
              data: {
                totalPurchased: { increment: totalCost },
                totalPaid: { increment: paid },
                outstandingBalance: { increment: outstanding },
              },
            }),
          );

          // Execute all supplier operations in parallel
          await Promise.all(operations);
        }

        // Update inventory
        const updatedInventory = await tx.inventory.update({
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

        // Record stock movement if there's a difference
        const stockDifference = finalStockQty - inventoryTarget.stockQuantity;
        const stockMovementPromise =
          stockDifference !== 0
            ? tx.stockMovement.create({
                data: {
                  companyId,
                  productId: product.id,
                  warehouseId: inventoryTarget.warehouseId,
                  userId,
                  movementType: stockDifference > 0 ? "وارد" : "صادر",
                  quantity: Math.abs(stockDifference),
                  reason: updateData.reason || "تم_استلام_المورد",
                  notes:
                    notes ||
                    `${supplierId ? "المخزون من المورد" : "تحديث المخزون"}`,
                  quantityBefore: inventoryTarget.stockQuantity,
                  quantityAfter: finalStockQty,
                },
              })
            : Promise.resolve(null);
        const journalEvent = tx.journalEvent.create({
          data: {
            companyId: companyId,
            eventType: "purchase",
            status: "pending",
            entityType: "purchase",
            payload: {
              companyId,

              supplierId,
              purchase: purchase,
              userId,
              type: "purchase",

              paymentDetails: {
                bankId: bankId,
                referenceNumber: transferNumber ?? "", // Fixed typo from 'refrenceNumber'
                exchangeRate: exchangeRate ?? undefined,
                amountFC: amountFC ?? undefined,
                amountBase: paymentAmount ?? 0,
                paymentMethod: paymentMethod || "",
                paymentId: supplierPaymentId ?? "",
                currency_code: currency_code,
              },
            },
            processed: false,
          },
        });
        // Record activity log
        const activityLogPromise = tx.activityLogs.create({
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

        // Execute final operations in parallel
        await Promise.all([
          stockMovementPromise,
          activityLogPromise,
          journalEvent,
        ]);

        return {
          updatedInventory,
          purchase,
        };
      },
      {
        timeout: 20000,
        maxWait: 5000,
      },
    );

    // Fire non-blocking operations
    revalidatePath("/manageStocks");

    return { success: true, data: result.updatedInventory };
  } catch (error) {
    console.error("خطأ في تحديث المخزون:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تحديث المخزون",
    };
  }
}
interface InventoryUpdateData {
  productId: string;
  warehouseId: string;
  updateType: "manual" | "supplier";
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  supplierId?: string;
  quantity?: number;
  unitCost?: number;
  paymentMethod?: string;
  paymentAmount?: number;

  payment?: PaymentState;
  notes?: string;
  reason?: string;
  lastStockTake?: Date;
}

export async function fetchAllFormDatas(companyId: string) {
  try {
    const [products, warehouses, suppliers, inventories] = await Promise.all([
      // Products
      prisma.product.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          name: true,
          sku: true,
          costPrice: true,
          supplierId: true,
          sellingUnits: true,
          warehouseId: true,
        },
        orderBy: { name: "asc" },
      }),

      // Warehouses
      prisma.warehouse.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          name: true,
          location: true,
        },
        orderBy: { name: "asc" },
      }),

      // Suppliers
      prisma.supplier.findMany({
        where: { companyId, isActive: true },
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: "asc" },
      }),

      // Inventories - NEW!
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
          product: {
            select: {
              name: true,
              sku: true,
              costPrice: true,
              supplierId: true,
              // type: true,
              unitsPerPacket: true,
              packetsPerCarton: true,
              sellingUnits: true,
            },
          },
          warehouse: {
            select: {
              name: true,
              location: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
    ]);
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
    // const convertedInventory = inventories.map((item) => {
    //   const availableUnits = item.availableQuantity ?? 0;

    //   const { availablePackets, availableCartons } = convertFromBaseUnit(
    //     item.product,
    //     item.availableQuantity,
    //   );

    //   const { availablePackets: stockPackets, availableCartons: stockCartons } =
    //     convertFromBaseUnit(item.product, item.stockQuantity);

    //   const {
    //     availablePackets: reservedPackets,
    //     availableCartons: reservedCartons,
    //   } = convertFromBaseUnit(item.product, item.reservedQuantity);

    //   let finalAvailableUnits = 0;
    //   let finalAvailablePackets = 0;
    //   let finalAvailableCartons = 0;

    //   let finalStockUnits = 0;
    //   let finalStockPackets = 0;
    //   let finalStockCartons = 0;

    //   let finalReservedUnits = 0;
    //   let finalReservedPackets = 0;
    //   let finalReservedCartons = 0;

    //   if (item.product.type === "full") {
    //     finalAvailableUnits = availableUnits;
    //     finalAvailablePackets = availablePackets;
    //     finalAvailableCartons = availableCartons;

    //     finalStockUnits = availableUnits;
    //     finalStockPackets = stockPackets;
    //     finalStockCartons = stockCartons;

    //     finalReservedUnits = availableUnits;
    //     finalReservedPackets = reservedPackets;
    //     finalReservedCartons = reservedCartons;
    //   } else if (item.product.type === "cartonUnit") {
    //     finalAvailableUnits = availableUnits;
    //     finalAvailableCartons = availableCartons;
    //     finalAvailablePackets = 0;

    //     finalStockUnits = availableUnits;
    //     finalStockCartons = stockCartons;
    //     finalStockPackets = 0;

    //     finalReservedUnits = availableUnits;
    //     finalReservedCartons = reservedCartons;
    //     finalReservedPackets = 0;
    //   } else if (item.product.type === "cartonOnly") {
    //     finalAvailableCartons = availableCartons;
    //     finalAvailableUnits = 0;
    //     finalAvailablePackets = 0;

    //     finalStockCartons = stockCartons;
    //     finalStockUnits = 0;
    //     finalStockPackets = 0;

    //     finalReservedCartons = reservedCartons;
    //     finalReservedUnits = 0;
    //     finalReservedPackets = 0;
    //   } else if (item.product.type === "unit") {
    //     finalAvailableUnits = availableUnits;
    //     finalAvailablePackets = 0;
    //     finalAvailableCartons = 0;

    //     finalStockUnits = availableUnits;
    //     finalStockPackets = 0;
    //     finalStockCartons = 0;

    //     finalReservedUnits = availableUnits;
    //     finalReservedPackets = 0;
    //     finalReservedCartons = 0;
    //   } else if (item.product.type === "packetUnit") {
    //     finalAvailableUnits = availableUnits;
    //     finalAvailablePackets = availablePackets;
    //     finalAvailableCartons = 0;

    //     finalStockUnits = availableUnits;
    //     finalStockPackets = stockPackets;
    //     finalStockCartons = 0;

    //     finalReservedUnits = availableUnits;
    //     finalReservedPackets = reservedPackets;
    //     finalReservedCartons = 0;
    //   }

    //   return {
    //     ...item,
    //     availableUnits: finalAvailableUnits,
    //     availablePackets: finalAvailablePackets,
    //     availableCartons: finalAvailableCartons,

    //     stockUnits: finalStockUnits,
    //     stockPackets: finalStockPackets,
    //     stockCartons: finalStockCartons,

    //     reservedUnits: finalReservedUnits,
    //     reservedPackets: finalReservedPackets,
    //     reservedCartons: finalReservedCartons,
    //   };
    // });
    const items = serializeData(products);
    const inventoriesData = serializeData(inventories);
    return {
      products: items,
      warehouses,
      suppliers,
      inventories: inventoriesData, // Include inventories in response
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
        // 1. Get original purchase and item
        const originalPurchase = await tx.invoice.findUnique({
          where: { id: purchaseId, companyId },
          include: {
            items: {
              where: { id: purchaseItemId },
              include: {
                product: {
                  select: {
                    id: true,
                    sellingUnits: true, // 🆕 Get selling units
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
          throw new Error("الشراء الأصلي غير موجود");
        }

        if (originalPurchase.items.length === 0) {
          throw new Error("عنصر الشراء غير موجود");
        }

        const purchaseItem = originalPurchase.items[0];
        const product = purchaseItem.product;
        const supplier = originalPurchase.supplier;
        const productId = product.id;
        const supplierId = supplier?.id;

        // 2. Get inventory
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

        // 3. Convert return quantity to base units

        const sellingUnits = (product.sellingUnits as any[]) || [];
        const selectedUnit = sellingUnits.find(
          (u: any) => u.name === returnUnit,
        );
        const returnQuantityInUnits = convertToBaseUnits(
          returnQuantity,
          selectedUnit,
          sellingUnits,
        );

        // Validate: Can't return more than what's in stock
        if (returnQuantityInUnits > inventory.stockQuantity) {
          throw new Error(
            `لا يمكن إرجاع كمية أكبر من المخزون الحالي (${inventory.stockQuantity})`,
          );
        }

        // Validate: Can't return more than originally purchased
        // const originalPurchasedInUnits = convertToBaseUnits(
        //   purchaseItem.quantity,
        //   returnUnit,
        //   product.unitsPerPacket || 1,
        //   product.packetsPerCarton || 1,
        // );

        // if (returnQuantityInUnits > originalPurchasedInUnits) {
        //   throw new Error(
        //     `لا يمكن إرجاع كمية أكبر من الكمية المشتراة الأصلية (${purchaseItem.quantity})`,
        //   );
        // }

        // 4. Calculate return cost (ALWAYS POSITIVE)
        const returnTotalCost = returnQuantity * unitCost;

        // 5. Calculate outstanding balance adjustments
        const amountDue = Number(originalPurchase.amountDue || 0);
        let outstandingDecrease = 0;
        if (refundAmount > 0) {
          outstandingDecrease = Math.min(amountDue, refundAmount);
        } else {
          // If no refund, reduce outstanding by return cost
          outstandingDecrease = Math.min(amountDue, returnTotalCost);
        }

        // 6. Create purchase return record (POSITIVE VALUES)
        purchaseReturn = await tx.invoice.update({
          where: { id: purchaseId },
          data: {
            companyId,
            supplierId,
            sale_type: "RETURN_PURCHASE",
            totalAmount: returnTotalCost,
            amountPaid: refundAmount,
            amountDue: 0,
            status: "completed",
            // Link to original purchase
          },
        });

        // 7. Create purchase item for return (POSITIVE QUANTITY)
        await tx.invoiceItem.update({
          where: { id: purchaseItemId, companyId },
          data: {
            quantity: returnQuantity,
            price: unitCost,
            unit: returnUnit,
            totalPrice: returnTotalCost,
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
          const aggregate = await tx.financialTransaction.aggregate({
            where: {
              companyId: companyId,
              type: "RECEIPT",
            },
            _max: {
              voucherNumber: true,
            },
          });

          // 2. حساب الرقم التالي
          const lastNumber = aggregate._max.voucherNumber || 0;
          const nextNumber = lastNumber + 1;
          await tx.financialTransaction.create({
            data: {
              companyId,
              supplierId,
              currencyCode: "",
              invoiceId: originalPurchase.id,
              branchId,
              type: "PAYMENT",
              purchaseId: purchaseReturn.id,
              voucherNumber: nextNumber,
              userId: userId,
              status: "paid",
              amount: refundAmount,
              paymentMethod,
              notes: reason || `استرداد مبلغ من المورد - فاتورة ${purchaseId}`,
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
                Number(supplier?.outstandingBalance) - outstandingDecrease,
              ),
            },
          },
        });
        await tx.journalEvent.create({
          data: {
            companyId: companyId,
            eventType: "purchase",
            status: "pending",
            entityType: "return-purchase",
            payload: {
              companyId,
              branchId,
              supplierId,
              purchase: purchaseReturn,
              userId,
              type: "return-purchase",
              paymentDetails: {
                exchangeRate: exchangeRate,
                amountFC: refundAmount,
                amountBase: baseAmount,

                paymentMethod: paymentMethod,
                currency_code: currency,
                refrenceNumber: transferNumber,
                baseCurrency: baseCurrency,
              },
            },
            processed: false,
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
    // 1️⃣ Fetch Purchase + Supplier + Items + Product
    const purchase = await prisma.invoice.findFirst({
      where: { id: purchaseId, companyId },
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
                costPrice: true,
                sellingUnits: true,
                // unitsPerPacket: true,
                // packetsPerCarton: true,
                type: true,
                warehouseId: true,
                supplier: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!purchase) {
      return { success: false, message: "لم يتم العثور على المشتريات" };
    }

    const item = purchase.items[0];

    if (!item) {
      return { success: false, message: "لا توجد منتجات في هذه المشتريات" };
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
    // 2️⃣ Fetch inventory for the product
    const inventory = await prisma.inventory.findFirst({
      where: {
        companyId,
        productId: item.productId,
        warehouseId: item.product.warehouseId || undefined,
      },
    });
    const currentStock = inventory ? Number(inventory.availableQuantity) : 0;

    const sellingUnits = (item.product.sellingUnits as any[]) || [];
    const stockByUnit = calculateStockByUnit(currentStock, sellingUnits);

    // التحقق من حالة البيع:
    // إذا كانت الكمية في المخزن أقل من الكمية التي تم شراؤها في هذا الفاتورة
    // فهذا يعني أن جزءاً منها قد تم بيعه (أو تم التصرف فيه)
    const originalPurchaseQty = Number(item.quantity); // الكمية عند الشراء
    const hasBeenSold = currentStock < originalPurchaseQty; // 3️⃣ Get available quantity (base unit)

    const supplierdata = serializeData(purchase.supplier);
    const products = serializeData(item.product);
    // 6️⃣ Final Return Object
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
          maxReturnableQty: Math.min(currentStock, originalPurchaseQty), // لا يمكن إرجاع أكثر مما هو موجود فعلياً
        },
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
      revalidatePath("/manageStocks");
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
            sellingUnits: true, // 🆕
            supplier: { select: { id: true, name: true } },
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

    // 🆕 Convert base units to all selling units
    const convertedInventory = inventory.map((item) => {
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
  // Supplier fields
  supplierId?: string;
  unitCost?: number;
  unit: string;
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
            error: `التحديث ${i + 1}: المورد وسعر الوحدة مطلوبان للتحديثات من المورد`,
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

    console.log(
      `Updating ${updatesData.length} inventory records for company:`,
      companyId,
    );

    // Process all updates in a transaction
    const result = await prisma.$transaction(
      async (tx) => {
        const updatedInventories = [];
        const createdPurchases = [];
        const stockMovements = [];
        let totalCost = 0;
        for (const updateData of updatesData) {
          // Fetch product and current inventory
          const [product, currentInventory] = await Promise.all([
            tx.product.findUnique({
              where: { id: updateData.productId },
              select: {
                id: true,
                name: true,
                sku: true,
                sellingUnits: true, // 🆕 Get selling units
                supplierId: true,
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
          // Generate receipt number
          const nextNumber = currentInventory?.receiptNo
            ? parseInt(currentInventory.receiptNo.match(/(\d+)$/)?.[1] || "0") +
              1
            : 1;
          const receiptNo = `مشتريات-${new Date().getFullYear()}-${String(nextNumber).padStart(5, "0")}`;

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

          // Create purchase if from supplier
          if (
            updateData.updateType === "supplier" &&
            updateData.unitCost &&
            updateData.supplierId
          ) {
            const paid = updateData.payment?.amountBase || 0;
            const due = totalCost - paid;
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
            });

            // await tx.invoiceItem.create({
            //   data: {
            //     companyId,
            //     invoiceId: purchase.id,
            //     productId: product.id,
            //     quantity: stockUnits,
            //     price: updateData.unitCost,
            //     totalPrice: totalCost,
            //     unit: selectedUnit.name,
            //     // 🆕 Store unit information
            //     // unitId: selectedUnit.id,
            //     // unitName: selectedUnit.name,
            //   },
            // });

            purchaseId = purchase.id;
            createdPurchases.push(purchase);
            let supplierPaymentId: string | null = null;

            // Create supplier payment if applicable
            // if (updateData.payment?.paymentMethod && paid > 0) {
            //   const voucherNumber = await getNextVoucherNumber(
            //     companyId,
            //     "PAYMENT",
            //     tx,
            //   );
            //   const supplierPayment = await tx.financialTransaction.create({
            //     data: {
            //       companyId,
            //       currencyCode: "",
            //       voucherNumber,
            //       supplierId: updateData.supplierId,
            //       userId,
            //       branchId: updateData.branchId,
            //       invoiceId: purchase.id,
            //       amount: paid,
            //       type: "PAYMENT",
            //       status: "paid",
            //       paymentMethod: updateData.payment.paymentMethod,
            //       notes: updateData.notes || "دفعة مشتريات",
            //     },
            //   });
            //   supplierPaymentId = supplierPayment.id;
            // }

            // Update supplier totals
            const outstanding = totalCost - paid;
            await tx.supplier.update({
              where: { id: updateData.supplierId, companyId },
              data: {
                totalPurchased: { increment: totalCost },
                totalPaid: { increment: paid },
                outstandingBalance: { increment: outstanding },
              },
            });

            // Create journal event
            await tx.journalEvent.create({
              data: {
                companyId,
                eventType: "purchase",
                status: "pending",
                entityType: "purchase",
                payload: {
                  companyId,
                  supplierId: updateData.supplierId,
                  purchase: purchase,
                  userId,
                  branchId: updateData.branchId,
                  type: "purchase",
                  paymentDetails: {
                    exchangeRate: updateData.payment?.exchangeRate,
                    amountFC: updateData.payment?.amountFC,
                    bankId: updateData.payment?.accountId,
                    amountBase: updateData.payment?.amountBase,
                    paymentId: supplierPaymentId,
                    paymentMethod: updateData.payment?.paymentMethod,
                    currency_code: updateData.payment?.selectedCurrency || "",
                    refrenceNumber: updateData.payment?.transferNumber,
                    baseCurrency: updateData.baseCurrency,
                  },
                },
                processed: false,
              },
            });
          }

          // Update inventory
          const updatedInventory = await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              availableQuantity: finalAvailableQty,
              stockQuantity: finalStockQty,
              reservedQuantity:
                updateData.reservedQuantity || inventory.reservedQuantity,
              receiptNo,
              status: calculatedStatus,
              lastStockTake: updateData.lastStockTake || new Date(),
            },
            include: {
              product: { select: { name: true, sku: true } },
              warehouse: { select: { name: true } },
            },
          });

          updatedInventories.push(updatedInventory);

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
                // 🆕 Store unit information
                // unitId: selectedUnit.id,
                // unitName: selectedUnit.name,
              },
            });
            stockMovements.push(movement);
          }

          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Create activity log for batch
        const totalUnits = updatesData.reduce((sum, u) => sum + u.quantity, 0);
        await tx.activityLogs.create({
          data: {
            userId,
            companyId,
            action: "تحديث_مخزون_متعدد",
            details: `تم تحديث ${updatesData.length} سجل مخزون. إجمالي الوحدات: ${totalUnits}`,
          },
        });

        return {
          updatedInventories,
          createdPurchases,
          stockMovements,
        };
      },
      {
        timeout: 30000,
        maxWait: 10000,
      },
    );

    revalidatePath("/manageStocks");

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
