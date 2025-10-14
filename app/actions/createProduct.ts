// actions/products.ts
"use server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { availableMemory } from "process";
import { logActivity } from "./activitylogs";
import { CreateProductSchema } from "@/lib/zod";

export async function CreateProduct(data: any, userId: string) {
  const parsed = CreateProductSchema.safeParse(data);
  const initialStock = 0;

  if (!parsed.success) {
    console.error(parsed.error.format());
    throw new Error("Invalid product data");
  }

  const {
    name,
    sku,
    barcode,
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
    weight,
    dimensions,
    supplierId,
    warehouseId,
    status,
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
          barcode,
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
          weight,
          dimensions,
          supplierId,
          warehouseId,
          status,
        },
      });
      const logs = await tx.activityLogs.create({
        data: {
          userId,
          action,
          details,
        },
      });
      console.log(product);

      const inventory = await tx.inventory.create({
        data: {
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

    console.log();
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
export async function deleteProduct(id: string) {
  if (!id) {
    throw new Error("Product ID is required.");
  }

  // 1. Delete all inventory records associated with the product ID.

  // 2. Delete the product itself.
  const deletedProduct = await prisma.product.deleteMany({
    where: {
      id: id,
    },
  });
  revalidatePath("/products");
  return deletedProduct;
}
// export async function getAllactiveproductsForSale(
//   where: Prisma.ProductWhereInput,
//   searchQuery?: string,
// ) {
//   let isActive: boolean;
//   isActive = true;
//   const combinedWhere: Prisma.ProductWhereInput = {
//     ...where, // Existing filters (category, warehouse, etc.)
//   };
//   console.log(searchQuery);
//   if (searchQuery) {
//     combinedWhere.OR = [
//       { name: { contains: searchQuery, mode: "insensitive" } },

//       { sku: { contains: searchQuery, mode: "insensitive" } },
//       { barcode: { contains: searchQuery, mode: "insensitive" } },

//       { description: { contains: searchQuery, mode: "insensitive" } },
//     ];
//   }

//   combinedWhere.inventory = {
//     some: {
//       availableQuantity: {
//         gt: 0,
//       },
//     },
//   };
//   if (isActive) {
//     combinedWhere.isActive = true;
//   }

//   const activeProducts = await prisma.product.findMany({
//     where: combinedWhere,

//     orderBy: {
//       name: "asc",
//     },
//     select: {
//       id: true,
//       name: true,
//       sku: true,
//       pricePerUnit: true,
//       pricePerPacket: true,
//       pricePerCarton: true,
//       packetsPerCarton: true,
//       unitsPerPacket: true,
//       warehouseId: true,
//       inventory: {
//         select: {
//           availableQuantity: true,
//         },
//       },
//     },
//   });
//   const warehouse = await prisma.warehouse.findMany({
//     select: {
//       id: true,
//       name: true,
//     },
//   });

//   return activeProducts.map((product) => {
//     const available = product.inventory[0].availableQuantity ?? 0;
//     const packets = available * product.packetsPerCarton;
//     const units = packets * product.unitsPerPacket;
//     let name: string = "";
//     warehouse.forEach((w) => {
//       w.id == product.warehouseId ? (name = w.name) : "";
//     }) ?? "";
//     console.log(name);
//     return {
//       ...product,
//       warehousename: name,
//       pricePerUnit: product.pricePerUnit ? Number(product.pricePerUnit) : 0,
//       pricePerPacket: product.pricePerPacket
//         ? Number(product.pricePerPacket)
//         : 0,
//       pricePerCarton: product.pricePerCarton
//         ? Number(product.pricePerCarton)
//         : 0,
//       availableCartons: available,
//       availablePackets: packets,
//       availableUnits: units,
//     };
//   });
// }
// export async function getAllActiveProductsForSale(
//   where: Prisma.ProductWhereInput,
//   searchQuery?: string,
// ) {
//   const combinedWhere: Prisma.ProductWhereInput = {
//     ...where,
//     isActive: true,
//     inventory: {
//       some: {
//         availableQuantity: { gt: 0 },
//       },
//     },
//   };

//   if (searchQuery) {
//     combinedWhere.OR = [
//       { name: { contains: searchQuery, mode: "insensitive" } },
//       { sku: { contains: searchQuery, mode: "insensitive" } },
//       { barcode: { contains: searchQuery, mode: "insensitive" } },
//       { description: { contains: searchQuery, mode: "insensitive" } },
//     ];
//   }

//   const [activeProducts, warehouses] = await Promise.all([
//     prisma.product.findMany({
//       where: combinedWhere,
//       orderBy: { name: "asc" },
//       select: {
//         id: true,
//         name: true,
//         sku: true,
//         pricePerUnit: true,
//         pricePerPacket: true,
//         pricePerCarton: true,
//         packetsPerCarton: true,
//         unitsPerPacket: true,
//         warehouseId: true,
//         inventory: {
//           select: { availableQuantity: true },
//           take: 1,
//         },
//       },
//       take: 100,
//     }),
//     prisma.warehouse.findMany({
//       select: { id: true, name: true },
//     }),
//   ]);

//   const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

//   // 🧮 Convert base unit (unit) to other units
//   function convertFromBaseUnit(
//     product: {
//       unitsPerPacket?: number;
//       packetsPerCarton?: number;
//     },
//     availableUnits: number,
//   ) {
//     const unitsPerPacket = product.unitsPerPacket || 1;
//     const packetsPerCarton = product.packetsPerCarton || 1;

//     const availablePackets = Number(
//       (availableUnits / unitsPerPacket).toFixed(2),
//     );
//     const availableCartons = Number(
//       (availablePackets / packetsPerCarton).toFixed(2),
//     );

//     return { availablePackets, availableCartons };
//   }

//   return activeProducts.map((product) => {
//     const availableUnits = product.inventory[0]?.availableQuantity ?? 0;
//     const { availablePackets, availableCartons } = convertFromBaseUnit(
//       product,
//       availableUnits,
//     );

//     return {
//       id: product.id,
//       name: product.name,
//       sku: product.sku,
//       warehouseId: product.warehouseId,
//       warehousename: warehouseMap.get(product.warehouseId) ?? "",
//       pricePerUnit: Number(product.pricePerUnit) || 0,
//       pricePerPacket: Number(product.pricePerPacket) || 0,
//       pricePerCarton: Number(product.pricePerCarton) || 0,
//       unitsPerPacket: product.unitsPerPacket,
//       packetsPerCarton: product.packetsPerCarton,
//       availableUnits,
//       availablePackets,
//       availableCartons,
//     };
//   });
// }
import { unstable_cache, revalidateTag } from "next/cache";

export const getAllActiveProductsForSale = unstable_cache(
  async (where: Prisma.ProductWhereInput, searchQuery?: string) => {
    const combinedWhere: Prisma.ProductWhereInput = {
      ...where,
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
  },
  ["products-for-sale"], // ✅ cache key
  { tags: ["products-for-sale"] }, // ✅ tag for revalidation
);
