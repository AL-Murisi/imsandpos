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
  currency_code?: "YER" | "USD" | "SAR" | "EUR" | "KWD";
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
      currency_code,
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

        // Create purchase if from supplier
        if (updateType === "supplier" && inputCartons && unitCost) {
          const totalCost = inputCartons * unitCost;
          const paid = paymentAmount ?? 0;
          const due = totalCost - paid;

          purchase = await tx.purchase.create({
            data: {
              companyId,
              supplierId: supplierId!,
              totalAmount: totalCost,
              amountPaid: paid,
              purchaseType: "purchases",
              amountDue: due,
              status:
                paid >= totalCost ? "paid" : paid > 0 ? "partial" : "pending",
            },
          });

          const purchaseItem = await tx.purchaseItem.create({
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
          purchaseItemId = purchaseItem.id;

          // Prepare batch operations
          const operations = [];

          // Create supplier payment if applicable
          if (paymentMethod && paymentAmount && paymentAmount > 0) {
            operations.push(
              tx.supplierPayment.create({
                data: {
                  companyId,
                  supplierId: supplierId!,
                  createdBy: userId,
                  purchaseId: purchase.id,
                  amount: paymentAmount,
                  paymentMethod,
                  note: notes || "دفعة مشتريات",
                },
              }),
            );
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
              paymentMethod: paymentMethod || "",
              currencyCode: currency_code,
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
  currency_code?: string;
  bankId?: string;
  referenceNumber?: string;

  notes?: string;
  reason?: string;
  lastStockTake?: Date;
}

export async function updateMultipleInventory(
  updatesData: InventoryUpdateData[],
  userId: string,
  companyId: string,
) {
  try {
    // Validate required fields
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

      if (!update.stockQuantity || update.stockQuantity <= 0) {
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

        const totalCost = update.stockQuantity * update.unitCost;
        if ((update.paymentAmount || 0) > totalCost) {
          return {
            success: false,
            error: `التحديث ${i + 1}: مبلغ الدفع أكبر من التكلفة الإجمالية`,
          };
        }
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

        for (const updateData of updatesData) {
          // Fetch product and current inventory
          const [product, currentInventory] = await Promise.all([
            tx.product.findUnique({
              where: { id: updateData.productId },
              select: {
                id: true,
                name: true,
                sku: true,
                unitsPerPacket: true,
                packetsPerCarton: true,
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

          // Helper functions
          const unitsPerPacket = product.unitsPerPacket || 1;
          const packetsPerCarton = product.packetsPerCarton || 1;
          const cartonToUnits = (cartons: number) =>
            cartons * packetsPerCarton * unitsPerPacket;

          const stockUnits = cartonToUnits(updateData.stockQuantity);
          const availableUnits = cartonToUnits(updateData.availableQuantity);

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

          // Calculate final quantities
          const finalStockQty = inventory.stockQuantity + stockUnits;
          const finalAvailableQty =
            inventory.availableQuantity + availableUnits;
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
            const totalCost = updateData.stockQuantity * updateData.unitCost;
            const paid = updateData.paymentAmount || 0;
            const due = totalCost - paid;

            const purchase = await tx.purchase.create({
              data: {
                companyId,
                supplierId: updateData.supplierId,
                totalAmount: totalCost,
                amountPaid: paid,
                purchaseType: "purchases",
                amountDue: due,
                status:
                  paid >= totalCost ? "paid" : paid > 0 ? "partial" : "pending",
              },
            });

            await tx.purchaseItem.create({
              data: {
                companyId,
                purchaseId: purchase.id,
                productId: product.id,
                quantity: updateData.stockQuantity,
                unitCost: updateData.unitCost,
                totalCost,
              },
            });

            purchaseId = purchase.id;
            createdPurchases.push(purchase);

            // Create supplier payment if applicable
            if (updateData.paymentMethod && paid > 0) {
              await tx.supplierPayment.create({
                data: {
                  companyId,
                  supplierId: updateData.supplierId,
                  createdBy: userId,
                  purchaseId: purchase.id,
                  amount: paid,
                  paymentMethod: updateData.paymentMethod,
                  note: updateData.notes || "دفعة مشتريات",
                },
              });
            }

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
                  type: "purchase",
                  paymentDetails: {
                    bankId: updateData.bankId ?? "",
                    refrenceNumber: updateData.referenceNumber ?? "",
                  },
                  paymentMethod: updateData.paymentMethod,
                  currencyCode: updateData.currency_code || "YER",
                },
                processed: false,
              },
            });
          }

          // Update inventory
          const updatedInventory = await tx.inventory.update({
            where: { id: inventory.id },
            data: {
              lastPurchaseId: purchaseId,
              availableQuantity: finalAvailableQty,
              stockQuantity: finalStockQty,
              reservedQuantity: updateData.reservedQuantity,
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
                movementType: stockDifference > 0 ? "وارد" : "صادر",
                quantity: Math.abs(stockDifference),
                reason:
                  updateData.updateType === "supplier"
                    ? "تم_استلام_المورد"
                    : updateData.reason || "تحديث_يدوي",
                notes:
                  updateData.notes ||
                  `${updateData.updateType === "supplier" ? "المخزون من المورد" : "تحديث المخزون"}`,
                quantityBefore: inventory.stockQuantity,
                quantityAfter: finalStockQty,
              },
            });
            stockMovements.push(movement);
          }

          // Small delay to ensure unique timestamps
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Create activity log for batch
        const totalUnits = updatesData.reduce(
          (sum, u) => sum + u.stockQuantity,
          0,
        );
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

    console.log(
      `✅ Successfully updated ${result.updatedInventories.length} inventory records`,
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
                product: {
                  select: {
                    id: true,
                    unitsPerPacket: true,
                    packetsPerCarton: true,
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
        await tx.journalEvent.create({
          data: {
            companyId: companyId,
            eventType: "purchase",
            status: "pending",
            entityType: "return-purchase",
            payload: {
              companyId,

              supplierId,
              purchase: purchaseReturn,
              userId,
              type: "return-purchase",
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
  returnUnit: "unit" | "packet" | "carton";
  unitCost: number;
  paymentMethod?: string;
  refundAmount?: number;
  reason?: string;
}

export async function getPurchaseReturnData(
  purchaseId: string,
  companyId: string,
) {
  try {
    // 1️⃣ Fetch Purchase + Supplier + Items + Product
    const purchase = await prisma.purchase.findFirst({
      where: { id: purchaseId, companyId },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        purchaseItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                costPrice: true,
                unitsPerPacket: true,
                packetsPerCarton: true,
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

    const item = purchase.purchaseItems[0];

    if (!item) {
      return { success: false, message: "لا توجد منتجات في هذه المشتريات" };
    }

    // 2️⃣ Fetch inventory for the product
    const inventory = await prisma.inventory.findFirst({
      where: {
        companyId,
        productId: item.productId,
        warehouseId: item.product.warehouseId || undefined,
      },
    });

    // 3️⃣ Get available quantity (base unit)

    // 4️⃣ Convert base units to packets and cartons based on product type
    function convertFromBaseUnit(product: any, availableCartons: number) {
      const unitsPerPacket = product.unitsPerPacket || 1;
      const packetsPerCarton = product.packetsPerCarton || 1;

      // 1 carton → packetsPerCarton packets
      const availablePackets = Number(
        (availableCartons * packetsPerCarton).toFixed(2),
      );

      // 1 packet → unitsPerPacket units
      const availableUnits = Number(
        (availablePackets * unitsPerPacket).toFixed(2),
      );

      return {
        availableCartons,
        availablePackets,
        availableUnits,
      };
    }

    const calculatedInventory = convertFromBaseUnit(
      item.product,
      item.quantity,
    );

    // 5️⃣ Filter available quantities based on product type
    let inventoryByType: any = {};

    switch (item.product.type) {
      case "full":
        // Full products have all three: units, packets, cartons
        inventoryByType = {
          availableUnits: calculatedInventory.availableUnits,
          availablePackets: calculatedInventory.availablePackets,
          availableCartons: calculatedInventory.availableCartons,
        };
        break;

      case "cartonOnly":
        // Only cartons available
        inventoryByType = {
          availableCartons: calculatedInventory.availableCartons,
        };
        break;

      case "cartonUnit":
        // Only cartons and units (no packets)
        inventoryByType = {
          availableUnits: calculatedInventory.availableUnits,
          availableCartons: calculatedInventory.availableCartons,
        };
        break;

      case "unit":
      default:
        // Only units available
        inventoryByType = {
          availableUnits: calculatedInventory.availableUnits,
        };
        break;
    }
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
          createdAt: purchase.createdAt,
        },

        supplier: supplierdata,

        product: products,

        purchaseItem: {
          id: item.id,
          quantity: item.quantity,
          unitCost: Number(item.unitCost),
          totalCost: Number(item.totalCost),
        },

        inventory: inventoryByType,
      },
    };
  } catch (error) {
    console.error("Error loading purchase return data", error);
    return { success: false, message: "حدث خطأ في الخادم" };
  }
}

// Helper function to determine allowed units based on product type
function getUnitsByProductType(type: string): ("unit" | "packet" | "carton")[] {
  switch (type) {
    case "full":
      return ["unit", "packet", "carton"];
    case "cartonOnly":
      return ["carton"];
    case "cartonUnit":
      return ["carton", "unit"];
    default:
      return ["unit"];
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
