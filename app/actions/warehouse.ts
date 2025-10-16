// app/actions/warehouse.ts
"use server";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
import { CashierSchema, InventoryUpdateWithTrackingSchema } from "@/lib/zod";

export type InventoryUpdateWithTrackingInput = z.infer<
  typeof InventoryUpdateWithTrackingSchema
>;

// 1. Update inventory record (for form submissions)
export async function updateInventory(
  data: InventoryUpdateWithTrackingInput,
  userid: string,
  companyId: string,
) {
  try {
    const {
      id,
      userId = userid,
      reason = "manual_update",
      notes,
      availableQuantity: inputCartons,
      stockQuantity: inputCartonsStock,
      ...updateData
    } = data;

    return await prisma.$transaction(async (tx) => {
      // ✅ 1. Fetch current inventory with product + warehouse details
      const currentInventory = await tx.inventory.findUnique({
        where: { id, companyId },
        include: { product: true, warehouse: true },
      });

      if (!currentInventory) throw new Error("Inventory record not found");

      // ✅ 2. Conversion helpers
      const unitsPerPacket = currentInventory.product.unitsPerPacket || 1;
      const packetsPerCarton = currentInventory.product.packetsPerCarton || 1;

      const cartonToUnits = (cartons: number) =>
        cartons * packetsPerCarton * unitsPerPacket;

      // ✅ 3. Convert to base unit (units)
      const availableQuantityInUnits = inputCartons
        ? cartonToUnits(inputCartons)
        : undefined;

      const stockQuantityInUnits = inputCartonsStock
        ? cartonToUnits(inputCartonsStock)
        : undefined;

      // ✅ 4. Combine new + old available quantity (accumulate)
      const finalAvailableQty =
        (availableQuantityInUnits ?? 0) + currentInventory.availableQuantity;

      const finalStockQty =
        (stockQuantityInUnits ?? 0) + currentInventory.stockQuantity;

      const finalReorderLevel =
        data.reorderLevel ?? currentInventory.reorderLevel;

      // ✅ 5. Calculate inventory status with decimals supported
      let calculatedStatus: "available" | "low" | "out_of_stock" | undefined;

      if (finalAvailableQty <= 0) {
        calculatedStatus = "out_of_stock";
      } else if (finalAvailableQty < finalReorderLevel) {
        calculatedStatus = "low";
      } else {
        calculatedStatus = "available";
      }

      // ✅ 6. Update inventory record
      const updatedInventory = await tx.inventory.update({
        where: { id },
        data: {
          ...updateData,
          availableQuantity: finalAvailableQty,
          stockQuantity: finalStockQty,
          ...(calculatedStatus && { status: calculatedStatus }),
          ...(data.lastStockTake && {
            lastStockTake: new Date(data.lastStockTake),
          }),
        },
        include: {
          product: { select: { name: true, sku: true } },
          warehouse: { select: { name: true, location: true } },
        },
      });

      // ✅ 7. Log stock movement if changed
      const stockDifference = finalStockQty - currentInventory.stockQuantity;
      if (stockDifference !== 0) {
        await tx.stockMovement.create({
          data: {
            companyId,
            productId: currentInventory.productId,
            warehouseId: currentInventory.warehouseId,
            userId: userId,
            movementType: stockDifference > 0 ? "in" : "out",
            quantity: Math.abs(stockDifference),
            reason,
            quantityBefore: currentInventory.stockQuantity,
            quantityAfter: finalStockQty,
            notes:
              notes ||
              `Manual inventory update: ${
                stockDifference > 0 ? "+" : ""
              }${stockDifference}`,
          },
        });
      }

      // ✅ 8. Revalidate paths
      revalidatePath("/manageinvetory");
      revalidatePath("/cashiercontrol");

      return { success: true, data: updatedInventory };
    });
  } catch (error) {
    console.error("Error updating inventory:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update inventory",
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
            unitsPerPacket: true,
            packetsPerCarton: true,
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
        item.stockQuantity,
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

    return { inventory: convertedInventory, totalCount };
  } catch (error) {
    console.error("Error getting inventory by ID:", error);
    throw error;
  }
}
