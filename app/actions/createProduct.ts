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
  const action = "created product";
  const details = "";
  const ip = "";
  const userAgent = "";
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create product
      const product = await tx.product.create({
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
      const logs = await tx.activityLogs.create({
        data: {
          userId,
          companyId,
          action,
          details,
        },
      });

      const inventory = await tx.inventory.create({
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

      // 3. Optional: create initial stock movement if stock > 0
      if (initialStock > 0) {
        await tx.stockMovement.create({
          data: {
            companyId,
            productId: product.id,
            warehouseId,
            userId: "system", // replace with real user ID
            movementType: "in",
            quantity: initialStock,
            reason: "initial_stock",
            quantityBefore: 0,
            quantityAfter: initialStock,
            notes: `Initial stock for product ${name}`,
          },
        });
      }

      // 4. Revalidate path for Next.js cache
      revalidatePath("/products/ProductClient");

      return { product, inventory, logs };
    });

    return {
      ...result.product,
      costPrice: Number(result.product.costPrice),
      pricePerUnit: result.product.pricePerUnit
        ? Number(result.product.pricePerUnit)
        : null,
      pricePerPacket: Number(result.product.pricePerPacket),
      pricePerCarton: Number(result.product.pricePerCarton),
      wholesalePrice: Number(result.product.wholesalePrice),
      weight: result.product.weight ? Number(result.product.weight) : null,
      inventory: result.inventory,
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

  return activeProducts.map((product) => {
    const availableUnits = product.inventory[0]?.availableQuantity ?? 0;
    const { availablePackets, availableCartons } = convertFromBaseUnit(
      product,
      availableUnits,
    );

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
      availableUnits,
      availablePackets,
      availableCartons,
    };
  });
}
