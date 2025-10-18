// actions/products.ts
"use server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { availableMemory } from "process";
import { logActivity } from "./activitylogs";
import { CreateProductSchema } from "@/lib/zod";

export async function CreateProduct(
  data: any,
  userId: string,
  companyId: string,
) {
  const parsed = CreateProductSchema.safeParse(data);
  const initialStock = 0;

  if (!parsed.success) {
    console.error(parsed.error.format());
    throw new Error("Invalid product data");
  }

  const {
    name,
    sku,
    description,
    categoryId,
    brandId,
    type,
    unitsPerPacket,
    packetsPerCarton,
    costPrice,
    pricePerUnit,
    pricePerPacket,
    pricePerCarton,
    wholesalePrice,
    minWholesaleQty,
    dimensions,
    supplierId,
    warehouseId,
  } = parsed.data;

  try {
    // ✅ Create product FIRST (outside transaction to avoid issues)
    const product = await prisma.product.create({
      data: {
        name,
        sku,
        companyId,
        description,
        categoryId,
        brandId,
        type,
        unitsPerPacket,
        packetsPerCarton,
        costPrice,
        pricePerUnit,
        pricePerPacket,
        pricePerCarton,
        wholesalePrice,
        minWholesaleQty,
        dimensions,
        supplierId,
        warehouseId,
      },
    });

    // ✅ Create inventory in separate call
    const inventory = await prisma.inventory.create({
      data: {
        companyId,
        productId: product.id,
        warehouseId,
        stockQuantity: 0,
        reservedQuantity: 0,
        availableQuantity: 0,
        reorderLevel: 10,
        maxStockLevel: 0,
        status: "out_of_stock",
      },
    });

    // ✅ Log activity separately
    const logs = await prisma.activityLogs.create({
      data: {
        userId,
        companyId,
        action: "created product",
        details: `Product: ${name}, SKU: ${sku}`,
      },
    });

    // ✅ Create initial stock movement if needed
    if (initialStock > 0) {
      await prisma.stockMovement.create({
        data: {
          companyId,
          productId: product.id,
          warehouseId,
          userId,
          movementType: "in",
          quantity: initialStock,
          reason: "initial_stock",
          quantityBefore: 0,
          quantityAfter: initialStock,
          notes: `Initial stock for product ${name}`,
        },
      });
    }

    // ✅ Revalidate cache
    revalidatePath("/products/ProductClient");

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      costPrice: Number(product.costPrice),
      pricePerUnit: product.pricePerUnit ? Number(product.pricePerUnit) : null,
      pricePerPacket: Number(product.pricePerPacket),
      pricePerCarton: Number(product.pricePerCarton),
      wholesalePrice: Number(product.wholesalePrice),
      inventory,
    };
  } catch (error) {
    console.error("Failed to create product:", error);
    throw error;
  }
}
export async function deleteProduct(id: string, companyId: string) {
  if (!id) {
    throw new Error("Product ID is required.");
  }

  const deletedProduct = await prisma.product.deleteMany({
    where: {
      id: id,
      companyId,
    },
  });
  revalidatePath("/products");
  return deletedProduct;
}

import { unstable_cache, revalidateTag } from "next/cache";

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

  // ✅ Determine product selling mode
  function getSellingMode(product: any) {
    const hasUnit = product.pricePerUnit && product.pricePerUnit > 0;
    const hasPacket = product.pricePerPacket && product.pricePerPacket > 0;
    const hasCarton = product.pricePerCarton && product.pricePerCarton > 0;

    // full: unit + packet + carton
    if (hasUnit && hasPacket && hasCarton) return "full";
    // cartonUnit: unit + carton (no packet)
    if (hasUnit && !hasPacket && hasCarton) return "cartonUnit";
    // cartonOnly: carton only
    if (!hasUnit && !hasPacket && hasCarton) return "cartonOnly";
    // fallback
    return "full";
  }

  return activeProducts.map((product) => {
    const availableUnits = product.inventory[0]?.availableQuantity ?? 0;
    const { availablePackets, availableCartons } = convertFromBaseUnit(
      product,
      availableUnits,
    );

    const sellingMode = getSellingMode(product);

    // ✅ Only return quantities that are actually sold
    let finalAvailableUnits = 0;
    let finalAvailablePackets = 0;
    let finalAvailableCartons = 0;

    if (sellingMode === "full") {
      // Sell all three levels
      finalAvailableUnits = availableUnits;
      finalAvailablePackets = availablePackets;
      finalAvailableCartons = availableCartons;
    } else if (sellingMode === "cartonUnit") {
      // Only sell units and cartons, hide packets
      finalAvailableUnits = availableUnits;
      finalAvailableCartons = availableCartons;
      finalAvailablePackets = 0; // ✅ Don't show packets
    } else if (sellingMode === "cartonOnly") {
      // Only sell cartons, hide units and packets
      finalAvailableCartons = availableCartons;
      finalAvailableUnits = 0; // ✅ Don't show units
      finalAvailablePackets = 0; // ✅ Don't show packets
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      warehouseId: product.warehouseId,
      warehousename: warehouseMap.get(product.warehouseId) ?? "",
      pricePerUnit: Number(product.pricePerUnit) || 0,
      pricePerPacket: Number(product.pricePerPacket) || 0,
      pricePerCarton: Number(product.pricePerCarton) || 0,
      unitsPerPacket: product.unitsPerPacket,
      packetsPerCarton: product.packetsPerCarton,
      availableUnits: finalAvailableUnits,
      availablePackets: finalAvailablePackets,
      availableCartons: finalAvailableCartons,
      sellingMode, // ✅ Optional: helpful for debugging
    };
  });
}
