// actions/products.ts
"use server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

import { revalidatePath } from "next/cache";
import { availableMemory } from "process";
import { logActivity } from "./activitylogs";
import {
  CreateProductInput,
  CreateProductInputs,
  CreateProductSchema,
  CreateProductSchemas,
  UpdateProductFormValues,
} from "@/lib/zod";
import { success } from "zod";

export async function CreateProduct(
  data: any,
  userId: string,
  companyId: string,
) {
  const parsed = CreateProductSchemas.safeParse(data);
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
    sellingUnits,
    costPrice,
    expiredAt,
    wholesalePrice,
    minWholesaleQty,
    dimensions,
    supplierId,
    warehouseId,
  } = parsed.data;

  try {
    const date = new Date(data.expiredAt).toISOString() as any;

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
        unitsPerPacket: 0,
        packetsPerCarton: 0,
        costPrice,
        sellingUnits,
        pricePerUnit: 0,
        expiredAt: date,
        pricePerPacket: 0,
        pricePerCarton: 0,
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
  try {
    const deletedProduct = await prisma.product.deleteMany({
      where: {
        id: id,
        companyId,
      },
    });

    revalidatePath("/products");
    return { success: true, deletedProduct, message: "تم حذف الحساب بنجاح" };
  } catch (error) {
    return { success: false, error: "فشل في حذف " };
  }
}
export async function fetchProductBySku(sku: string) {
  const product = await prisma.product.findFirst({
    where: {
      sku,
    },
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      description: true,
      categoryId: true,
      brandId: true,
      type: true,
      unitsPerPacket: true,
      packetsPerCarton: true,
      costPrice: true,
      pricePerUnit: true,
      pricePerPacket: true,
      pricePerCarton: true,
      wholesalePrice: true,
      minWholesaleQty: true,
      weight: true,
      dimensions: true,
      supplierId: true,
      warehouseId: true,
      status: true,
      isActive: true,
    },
  });

  if (!product) return null; // ✅ handle not found

  return {
    ...product,
    costPrice: product.costPrice ? Number(product.costPrice) : null,
    pricePerUnit: product.pricePerUnit ? Number(product.pricePerUnit) : null,
    pricePerPacket: product.pricePerPacket
      ? Number(product.pricePerPacket)
      : null,
    pricePerCarton: product.pricePerCarton
      ? Number(product.pricePerCarton)
      : null,
    wholesalePrice: product.wholesalePrice
      ? Number(product.wholesalePrice)
      : null,
    weight: product.weight ? Number(product.weight) : null,
  };
}
type SortState = {
  id: string;
  desc: boolean;
}[];
export async function fetchProduct(
  companyId: string,
  searchQuery: string = "",
  where: Prisma.ProductWhereInput = {},
  from?: string,
  to?: string,
  page: number = 1,
  pageSize: number = 7,
  sort: SortState = [],
) {
  // Allow caching (no-store → no-cache)
  // This ensures bfcache can work
  const cacheOption: RequestCache = "no-cache"; // instead of "no-store"

  const combinedWhere: Prisma.ProductWhereInput = { ...where, companyId };

  const fromDate = from ? new Date(from).toISOString() : undefined;
  const toDate = to ? new Date(to).toISOString() : undefined;

  if (searchQuery) {
    combinedWhere.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { sku: { contains: searchQuery, mode: "insensitive" } },
      { barcode: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  if (fromDate || toDate) {
    combinedWhere.createdAt = {
      ...(fromDate && { gte: fromDate }),
      ...(toDate && { lte: toDate }),
    };
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] = sort.map((s) => ({
    [s.id]: s.desc ? "desc" : "asc",
  }));

  try {
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        sku: true,
        barcode: true,
        description: true,
        categoryId: true,

        type: true,
        // unitsPerPacket: true,
        // packetsPerCarton: true,
        costPrice: true,
        // pricePerUnit: true,
        sellingUnits: true,
        expiredAt: true,
        // pricePerPacket: true,
        // pricePerCarton: true,
        wholesalePrice: true,
        minWholesaleQty: true,
        category: true,
        weight: true,
        dimensions: true,
        supplier: {
          select: {
            name: true,
          },
        },
        supplierId: true,
        warehouse: {
          select: {
            name: true,
          },
        },
        warehouseId: true,
        status: true,
        isActive: true,
        createdAt: true,
      },
      where: combinedWhere,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
      skip: page * pageSize,
      take: pageSize,
    });

    const formattedProducts = products.map((product) => ({
      ...product,
      costPrice: product.costPrice ? Number(product.costPrice) : null,
      sellingUnits: Array.isArray(product.sellingUnits)
        ? product.sellingUnits.map((u: any) => ({
            ...u,
            price: Number(u.price),
          }))
        : [],
      sellingUnitsQty: Array.isArray(product.sellingUnits)
        ? product.sellingUnits.map((u: any) => ({
            ...u,
            qty: Number(u.unitsPerParent),
          }))
        : [],
      wholesalePrice: product.wholesalePrice
        ? Number(product.wholesalePrice)
        : null,
      weight: product.weight ? Number(product.weight) : null,
    }));

    return {
      products: formattedProducts,
      totalCount: formattedProducts.length,
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { products: [], totalCount: 0 };
  }
}
export async function fetchProductStats(role: string, companyId: string) {
  if (!companyId) return;

  let totalStockQuantity = 0;
  if (role === "admin") {
    const stock = await prisma.inventory.aggregate({
      _sum: { stockQuantity: true },
      where: { companyId },
    });
    totalStockQuantity = stock._sum.stockQuantity || 0;
  }

  // ✅ Count low stock products
  const result = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*) as count
    FROM "inventory"
    WHERE "reorder_level" >= "stock_quantity" AND "company_id" = ${companyId}
  `;

  // ✅ Count zero stock products
  const finished = await prisma.$queryRaw<{ count: number }[]>`
    SELECT COUNT(*) as count
    FROM "inventory"
    WHERE "stock_quantity" = 0 AND "company_id" = ${companyId}
  `;

  // ✅ Low stock details
  const lowStockDetails = await prisma.$queryRaw<
    Array<{
      product_id: string;
      stock_quantity: number;
      reorder_level: number;
      product_name: string;
    }>
  >`
    SELECT 
      i."product_id",
      i."stock_quantity",
      i."reorder_level",
      p."name" as product_name
    FROM "inventory" i
    JOIN "products" p ON i."product_id" = p."id"
    WHERE i."reorder_level" >= i."stock_quantity" AND i."company_id" = ${companyId}
    ORDER BY i."stock_quantity" ASC
  `;

  return {
    totalStockQuantity,
    lowStockProducts: result[0]?.count || 0,
    zeroProducts: finished[0]?.count || 0,
    lowStockDetails,
  };
}

export async function UpdateProduct(
  data: UpdateProductFormValues,
  companyId: string,
  userId: string,
) {
  const parsed = CreateProductSchemas.safeParse(data);
  if (!parsed.success) {
    console.error(parsed.error.format());
    throw new Error("Invalid product data");
  }

  const {
    sku,
    name,
    description,
    categoryId,
    // brandId,
    // type,
    // unitsPerPacket,
    // packetsPerCarton,
    costPrice,
    // pricePerUnit,
    expiredAt,
    sellingUnits,
    // pricePerPacket,
    // pricePerCarton,
    wholesalePrice,
    minWholesaleQty,
    dimensions,
    supplierId,
    warehouseId,
  } = parsed.data;

  try {
    console.log(expiredAt);
    // ✅ Find product with inventory array
    const existing = await prisma.product.findUnique({
      where: {
        companyId_sku: {
          companyId,
          sku,
        },
      },
      include: {
        inventory: true,
      },
    });

    if (!existing) {
      throw new Error(`Product with SKU ${sku} not found`);
    }

    // ✅ Use first inventory record (if exists)
    const existingInventory = existing.inventory[0];

    // ✅ Update product details
    const updatedProduct = await prisma.product.update({
      where: {
        companyId_sku: {
          companyId,
          sku,
        },
      },
      data: {
        name,
        description,
        categoryId,
        // brandId,
        // type,
        // unitsPerPacket,
        // packetsPerCarton,
        costPrice,
        // pricePerUnit,
        sellingUnits,
        expiredAt: new Date(expiredAt).toISOString() as any,
        // pricePerPacket,
        // pricePerCarton,

        wholesalePrice,
        minWholesaleQty,
        dimensions,
        supplierId,
        warehouseId,
      },
    });

    // ✅ Update inventory (if it exists)
    let updatedInventory = null;
    if (existingInventory) {
      updatedInventory = await prisma.inventory.update({
        where: { id: existingInventory.id },
        data: {
          warehouseId,

          reorderLevel: existingInventory.reorderLevel ?? 10,
          status:
            existingInventory.availableQuantity > 0
              ? "in_stock"
              : "out_of_stock",
        },
      });
    }

    // ✅ Record stock movement if warehouse changed
    if (existingInventory && existingInventory.warehouseId !== warehouseId) {
      await prisma.stockMovement.create({
        data: {
          companyId,
          productId: existing.id,
          warehouseId,
          userId,
          movementType: "transfer",
          quantity: 0,
          reason: "warehouse_change",
          quantityBefore: existingInventory.stockQuantity,
          quantityAfter: existingInventory.stockQuantity,
          notes: `Warehouse changed for product ${name}`,
        },
      });
    }

    // ✅ Log activity
    await prisma.activityLogs.create({
      data: {
        userId,
        companyId,
        action: "updated product",
        details: `Updated product: ${name}, SKU: ${sku}`,
      },
    });

    // ✅ Revalidate cache
    revalidatePath("/products/ProductClient");

    return {
      ...updatedProduct,
      costPrice: Number(updatedProduct.costPrice),
      pricePerUnit: updatedProduct.pricePerUnit
        ? Number(updatedProduct.pricePerUnit)
        : null,
      pricePerPacket: Number(updatedProduct.pricePerPacket),
      pricePerCarton: Number(updatedProduct.pricePerCarton),
      wholesalePrice: Number(updatedProduct.wholesalePrice),
      inventory: updatedInventory,
    };
  } catch (error) {
    console.error("❌ Failed to update product:", error);
    throw error;
  }
}
