import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma"; // Adjust the import path based on your setup

type SortState = Array<{
  id: string;
  desc: boolean;
}>;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const query = searchParams.get("query") || "";
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const sort = searchParams.get("sort");
    const supplierId = searchParams.get("supplierId");
    const warehouseId = searchParams.get("warehouseId");
    const categoryId = searchParams.get("categoryId");

    const pageIndex = Number(page) - 1;
    const pageSize = Number(limit);

    // Construct the WHERE clause
    const where: Prisma.ProductWhereInput = {};

    if (supplierId) where.supplierId = supplierId;
    if (warehouseId) where.warehouseId = warehouseId;
    if (categoryId) where.categoryId = categoryId;

    const formatDate = from ? new Date(from).toISOString() : undefined;
    const toDate = to ? new Date(to).toISOString() : undefined;

    // Add global search query
    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { sku: { contains: query, mode: "insensitive" } },
        { barcode: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ];
    }

    // Add date range filtering
    if (formatDate || toDate) {
      where.createdAt = {
        ...(formatDate && { gte: formatDate }),
        ...(toDate && { lte: toDate }),
      };
    }

    // Parse sorting
    const parsedSort: SortState = sort
      ? [
          {
            id: sort.split(".")[0],
            desc: sort.split(".")[1] === "desc",
          },
        ]
      : [];

    // Construct the ORDER BY clause
    const orderBy: Prisma.ProductOrderByWithRelationInput[] = parsedSort.map(
      (s) => ({
        [s.id]: s.desc ? "desc" : "asc",
      })
    );

    // Fetch total count for pagination
    const totalCount = await prisma.product.count({
      where,
    });

    // Fetch products with pagination and sorting
    const products = await prisma.product.findMany({
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
        createdAt: true,
      },
      where,
      orderBy: orderBy.length > 0 ? orderBy : undefined,
      skip: pageIndex * pageSize,
      take: pageSize,
    });

    // Convert Decimal objects to numbers for client components
    const formattedProducts = products.map((product) => ({
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
    }));

    return NextResponse.json({
      products: formattedProducts,
      totalCount,
      pagination: {
        page: Number(page),
        limit: pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
