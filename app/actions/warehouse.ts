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
    console.log(data);
    // 1️⃣ جلب السجل الحالي للمخزون
    const currentInventory = await prisma.inventory.findUnique({
      where: { id, companyId },
      include: { product: true, warehouse: true },
    });
    if (!currentInventory) throw new Error("سجل المخزون غير موجود");

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

    // 5️⃣ إنشاء عملية شراء إذا كانت الكمية من المورد
    let purchaseId: string | null = null;
    if (updateType === "supplier" && inputCartons && unitCost) {
      const totalCost = inputCartons * unitCost;

      const purchase = await prisma.purchase.create({
        data: {
          companyId,
          supplierId,
          totalAmount: totalCost,
          amountDue: totalCost,
          status: "pending",
        },
      });

      await prisma.purchaseItem.create({
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
    }

    // 6️⃣ تحديث المخزون النهائي
    const updatedInventory = await prisma.inventory.update({
      where: { id: inventoryTarget.id },
      data: {
        ...updateData,
        availableQuantity: finalAvailableQty,
        stockQuantity: finalStockQty,
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
            `${supplierId ? "Stock from supplier" : "Inventory update"}: ...`,
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

    revalidatePath("/manageinvetory");
    return { success: true, data: updatedInventory };
  } catch (error) {
    console.error("خطأ في تحديث المخزون:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تحديث المخزون",
    };
  }
}

// export async function updateInventory(
//   data: ExtendedInventoryUpdateData,
//   userId: string,
//   companyId: string,
// ) {
//   try {
//     const {
//       id,
//       reason = "تحديث_يدوي",
//       notes,
//       updateType,
//       availableQuantity: inputCartons,
//       stockQuantity: inputCartonsStock,
//       quantity: purchaseQty,
//       unitCost,
//       paymentMethod,
//       paymentAmount,
//       supplierId: providedSupplierId,
//       warehouseId: targetWarehouseId,
//       ...updateData
//     } = data;

//     const currentInventory = await prisma.inventory.findUnique({
//       where: { id, companyId },
//       include: { product: true, warehouse: true },
//     });
//     if (!currentInventory) throw new Error("سجل المخزون غير موجود");

//     const product = currentInventory.product;
//     const unitsPerPacket = product.unitsPerPacket || 1;
//     const packetsPerCarton = product.packetsPerCarton || 1;
//     const supplierId = providedSupplierId || product.supplierId;
//     if (!supplierId) throw new Error("يجب تحديد المورد");

//     const supplierExists = await prisma.supplier.findUnique({
//       where: { id: supplierId },
//     });
//     if (!supplierExists) throw new Error("المورد غير موجود");

//     const cartonToUnits = (cartons: number) =>
//       cartons * packetsPerCarton * unitsPerPacket;

//     const availableUnits = inputCartons ? cartonToUnits(inputCartons) : 0;
//     const stockUnits = inputCartonsStock ? cartonToUnits(inputCartonsStock) : 0;

//     // 👇 Determine which inventory record to update
//     let inventoryTarget =
//       targetWarehouseId === currentInventory.warehouseId
//         ? currentInventory
//         : await prisma.inventory.upsert({
//             where: {
//               companyId_productId_warehouseId: {
//                 companyId,
//                 productId: product.id,
//                 warehouseId: targetWarehouseId!,
//               },
//             },
//             update: {},
//             create: {
//               companyId,
//               productId: product.id,
//               warehouseId: targetWarehouseId!,
//               availableQuantity: 0,
//               stockQuantity: 0,
//               reorderLevel: currentInventory.reorderLevel,
//               maxStockLevel: currentInventory.maxStockLevel,
//               status: "متوفر",
//               lastStockTake: new Date(),
//             },
//           });

//     const finalAvailableQty =
//       inventoryTarget.availableQuantity + availableUnits;
//     const finalStockQty = inventoryTarget.stockQuantity + stockUnits;

//     let calculatedStatus: "available" | "low" | "out_of_stock" = "available";
//     if (finalAvailableQty <= 0) calculatedStatus = "out_of_stock";
//     else if (finalAvailableQty < inventoryTarget.reorderLevel)
//       calculatedStatus = "low";

//     // ✅ 1. Create purchase record if supplier update
//     let purchaseId: string | null = null;
//     if (updateType === "supplier" && inputCartons && unitCost) {
//       const totalCost = inputCartons * unitCost;

//       const purchase = await prisma.purchase.create({
//         data: {
//           companyId,
//           supplierId,
//           totalAmount: totalCost,
//           amountDue: totalCost,
//           status: "pending",
//         },
//       });

//       await prisma.purchaseItem.create({
//         data: {
//           companyId,
//           purchaseId: purchase.id,
//           productId: product.id,
//           quantity: inputCartons,
//           unitCost,
//           totalCost,
//         },
//       });

//       purchaseId = purchase.id;

//       // ✅ 2. If payment exists, record payment + journal entries
//       if (paymentMethod && paymentAmount && paymentAmount > 0) {
//         await recordSupplierPaymentWithJournalEntries(
//           {
//             supplierId,
//             amount: paymentAmount,
//             paymentMethod,
//             note: notes,
//           },
//           userId,
//           companyId,
//         );

//         await prisma.purchase.update({
//           where: { id: purchase.id },
//           data: {
//             amountPaid: paymentAmount,
//             amountDue: Math.max(0, totalCost - paymentAmount),
//             status: paymentAmount >= totalCost ? "paid" : "partial",
//           },
//         });
//       }
//     }

//     // ✅ 3. Update final inventory
//     const updatedInventory = await prisma.inventory.update({
//       where: { id: inventoryTarget.id },
//       data: {
//         ...updateData,
//         availableQuantity: finalAvailableQty,
//         stockQuantity: finalStockQty,
//         status: calculatedStatus,
//         ...(data.lastStockTake && {
//           lastStockTake: new Date(data.lastStockTake),
//         }),
//       },
//       include: {
//         product: { select: { name: true, sku: true } },
//         warehouse: { select: { name: true, location: true } },
//       },
//     });

//     // ✅ 4. Record stock movement
//     const stockDifference = finalStockQty - inventoryTarget.stockQuantity;
//     if (stockDifference !== 0) {
//       await prisma.stockMovement.create({
//         data: {
//           companyId,
//           productId: product.id,
//           warehouseId: inventoryTarget.warehouseId,
//           userId,
//           movementType: stockDifference > 0 ? "وارد" : "صادر",
//           quantity: Math.abs(stockDifference),
//           reason: supplierId ? "تم_استلام_المورد" : reason,
//           quantityBefore: inventoryTarget.stockQuantity,
//           quantityAfter: finalStockQty,
//           notes:
//             notes ||
//             `${supplierId ? "Stock from supplier" : "Inventory update"}: ${
//               stockDifference > 0 ? "+" : ""
//             }${stockDifference}`,
//         },
//       });
//     }

//     // ✅ 5. Log activity
//     await prisma.activityLogs.create({
//       data: {
//         userId,
//         companyId,
//         action:
//           updateType === "supplier"
//             ? "تم_استلام_مخزون_المورد"
//             : "تم_تحديث_المخزون",
//         details: `المنتج: ${product.name}, المخزون النهائي: ${finalStockQty}${
//           paymentAmount ? `, الدفع: ${paymentAmount}` : ""
//         }`,
//       },
//     });

//     revalidatePath("/manageinvetory");
//     return { success: true, data: updatedInventory };
//   } catch (error) {
//     console.error("خطأ في تحديث المخزون:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "فشل تحديث المخزون",
//     };
//   }
// }

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
      where,
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
  page: number = 0,
  pageSize: number = 5,
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

    const totalCount = await prisma.inventory.count({ where });

    const inventory = await prisma.inventory.findMany({
      select: {
        id: true,
        product: {
          select: {
            name: true,
            sku: true,
            costPrice: true,
            unitsPerPacket: true,
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
      const { availableCartons } = convertFromBaseUnit(
        item.product,
        item.availableQuantity,
      );
      const { availableCartons: stockCartons } = convertFromBaseUnit(
        item.product,
        item.availableQuantity,
      );
      const { availableCartons: reservedCartons } = convertFromBaseUnit(
        item.product,
        item.reservedQuantity,
      );

      return {
        ...item,

        availableQuantity: availableCartons, // 👈 show in cartons
        stockQuantity: stockCartons,
        reservedQuantity: reservedCartons,
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
