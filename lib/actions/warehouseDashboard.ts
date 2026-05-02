"use server";

import { Prisma } from "@prisma/client";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

function serializeData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item)) as T;
  }

  const plainObj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Prisma.Decimal) {
      plainObj[key] = value.toNumber();
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

  return plainObj as T;
}

const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

export async function getWarehouseDashboardData() {
  const session = await getSession();

  if (!session?.companyId) {
    return {
      success: false as const,
      error: "Unauthorized",
    };
  }

  const [
    warehouses,
    inventories,
    recentMovements,
    activeSuppliers,
    purchaseSummary,
    recentPurchaseCount,
  ] = await Promise.all([
    prisma.warehouse.findMany({
      where: {
        companyId: session.companyId,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
      include: {
        inventory: {
          select: {
            stockQuantity: true,
            availableQuantity: true,
            reorderLevel: true,
            maxStockLevel: true,
            lastStockTake: true,
            batches: {
              select: {
                expiredAt: true,
              },
            },
          },
        },
      },
    }),
    prisma.inventory.findMany({
      where: { companyId: session.companyId },
      select: {
        id: true,
        stockQuantity: true,
        availableQuantity: true,
        reorderLevel: true,
        maxStockLevel: true,
        updatedAt: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        batches: {
          select: {
            expiredAt: true,
            supplier: {
              select: {
                name: true,
              },
            },
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ availableQuantity: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.stockMovement.findMany({
      where: {
        companyId: session.companyId,
      },
      select: {
        id: true,
        movementType: true,
        quantity: true,
        createdAt: true,
        warehouse: { select: { name: true } },
        product: { select: { name: true, sku: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.supplier.count({
      where: {
        companyId: session.companyId,
        isActive: true,
      },
    }),
    prisma.invoice.aggregate({
      where: {
        companyId: session.companyId,
        sale_type: "PURCHASE",
      },
      _sum: {
        totalAmount: true,
        amountDue: true,
      },
    }),
    prisma.invoice.count({
      where: {
        companyId: session.companyId,
        sale_type: "PURCHASE",
        invoiceDate: {
          gte: thirtyDaysAgo,
        },
      },
    }),
  ]);

  return {
    success: true as const,
    data: serializeData({
      warehouses,
      inventories,
      recentMovements,
      activeSuppliers,
      purchaseSummary,
      recentPurchaseCount,
    }),
  };
}
