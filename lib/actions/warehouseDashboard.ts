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
    warehousesRaw,
    inventoriesRaw,
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
      select: {
        id: true,
        name: true,
        location: true,
        inventory: {
          select: {
            stockQuantity: true,
            reservedQuantity: true,
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
        reorderLevel: true,
        reservedQuantity: true,

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
      orderBy: [{ stockQuantity: "asc" }, { updatedAt: "desc" }],
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
  const inventories = inventoriesRaw
    .map((item) => ({
      ...item,
      availableQuantity:
        (item.stockQuantity || 0) - (item.reservedQuantity || 0),
    }))
    .sort((a, b) => a.availableQuantity - b.availableQuantity); // إعادة الترتيب حسب الكمية المتوفرة

  // 2. معالجة المستودعات (Warehouses) لضمان أن بيانات الـ inventory داخلها دقيقة أيضاً
  const warehouses = warehousesRaw.map((warehouse) => ({
    ...warehouse,
    inventory: warehouse.inventory.map((inv) => ({
      ...inv,
      availableQuantity: (inv.stockQuantity || 0) - (inv.reservedQuantity || 0),
    })),
  }));
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
