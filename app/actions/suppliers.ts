// ============================================
// 1. FETCH PURCHASES BY SUPPLIER
"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidate } from "../dashboard/page";
import { revalidatePath } from "next/cache";
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
// ============================================
export async function getPurchasesByCompany(
  companyId: string,
  {
    productQuery,
    where,
    from,
    to,
    pageIndex = 0,
    pageSize = 10,
    parsedSort,
  }: {
    productQuery?: string;
    where?: string;
    from?: string;
    to?: string;
    pageIndex?: number;
    pageSize?: number;
    parsedSort?: { id: string; desc: boolean }[];
  } = {},
) {
  try {
    const filters: any = { companyId };

    // Status filter
    if (where && where !== "all") {
      filters.status = where;
    }

    // Date range filter
    if (from || to) {
      filters.createdAt = {};
      if (from) filters.createdAt.gte = new Date(from);
      if (to) filters.createdAt.lte = new Date(to);
    }

    // Product name/SKU filter
    if (productQuery) {
      const items = await prisma.purchaseItem.findMany({
        where: {
          companyId,
          product: {
            OR: [
              { name: { contains: productQuery, mode: "insensitive" } },
              { sku: { contains: productQuery, mode: "insensitive" } },
            ],
          },
        },
        select: { purchaseId: true },
        distinct: ["purchaseId"],
      });

      const purchaseIds = items.map((i) => i.purchaseId);
      if (purchaseIds.length === 0) return { data: [], total: 0 };
      filters.id = { in: purchaseIds };
    }

    // Count total
    const total = await prisma.purchase.count({ where: filters });

    // Sorting

    // Fetch data
    const purchases = await prisma.purchase.findMany({
      where: filters,
      include: {
        purchaseItems: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, costPrice: true },
            },
          },
        },
        supplier: true,
      },

      skip: pageIndex * pageSize,
      take: pageSize,
    });
    const serialized = serializeData(purchases);
    return { data: serialized, total, pageIndex, pageSize };
  } catch (error) {
    console.error("Error fetching company purchases:", error);
    throw error;
  }
}

export async function getSupplierPaymentsByCompany(
  companyId: string,
  {
    from,
    to,
    pageIndex = 0,
    pageSize = 10,
    parsedSort,
  }: {
    from?: string;
    to?: string;
    pageIndex?: number;
    pageSize?: number;
    parsedSort?: { id: string; desc: boolean }[];
  } = {},
) {
  try {
    const filters: any = { companyId };

    // Date range
    if (from || to) {
      filters.paymentDate = {};
      if (from) filters.paymentDate.gte = new Date(from);
      if (to) filters.paymentDate.lte = new Date(to);
    }

    // Count total
    const total = await prisma.supplierPayment.count({ where: filters });

    // Sort

    // Fetch
    const payments = await prisma.supplierPayment.findMany({
      where: filters,
      include: {
        supplier: true,
        company: true,
      },

      skip: pageIndex * pageSize,
      take: pageSize,
    });
    const serialized = serializeData(payments);
    return { data: serialized, total, pageIndex, pageSize };
  } catch (error) {
    console.error("Error fetching company payments:", error);
    throw error;
  }
}

export async function updateSupplierPayment(
  paymentId: string,
  data: {
    amount?: number;
    paymentMethod?: string;
    note?: string;
    paymentDate?: Date;
  },
  userId: string,
  companyId: string,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current payment
      const currentPayment = await tx.supplierPayment.findUnique({
        where: { id: paymentId },
        include: { supplier: true },
      });

      if (!currentPayment) {
        throw new Error("Payment not found");
      }

      if (currentPayment.companyId !== companyId) {
        throw new Error("Unauthorized");
      }

      // 2. If amount changed, recalculate purchase status
      let purchaseUpdate = null;
      if (data.amount && data.amount !== Number(currentPayment.amount)) {
        const amountDifference = data.amount - Number(currentPayment.amount);

        // Find purchases with this supplier to update totals
        const purchases = await tx.purchase.findMany({
          where: {
            companyId,
            supplierId: currentPayment.supplierId,
            status: { in: ["pending", "partial"] },
          },
        });

        if (purchases.length > 0) {
          // Update the most recent purchase
          const latestPurchase = purchases[purchases.length - 1];
          const newAmountPaid =
            Number(latestPurchase.amountPaid) + amountDifference;
          const newAmountDue =
            Number(latestPurchase.totalAmount) - newAmountPaid;

          purchaseUpdate = await tx.purchase.update({
            where: { id: latestPurchase.id },
            data: {
              amountPaid: Math.max(0, newAmountPaid),
              amountDue: Math.max(0, newAmountDue),
              status:
                newAmountDue <= 0
                  ? "paid"
                  : newAmountPaid > 0
                    ? "partial"
                    : "pending",
            },
          });
        }
      }

      // 3. Update payment
      const updatedPayment = await tx.supplierPayment.update({
        where: { id: paymentId },
        data: {
          ...(data.amount && { amount: data.amount }),
          ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
          ...(data.note && { note: data.note }),
          ...(data.paymentDate && { paymentDate: data.paymentDate }),
        },
        include: {
          supplier: true,
        },
      });

      // 4. Log activity
      await tx.activityLogs.create({
        data: {
          userId,
          companyId,
          action: "updated supplier payment",
          details: `Payment updated for ${currentPayment.supplier.name}: ${updatedPayment.amount}`,
        },
      });
      revalidatePath("/suppliers");
      return {
        success: true,
        payment: updatedPayment,
        purchaseUpdate,
      };
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
}
// ============================================
// Create Supplier Payment and Apply to Purchases
// ============================================
export async function createSupplierPaymentFromPurchases(
  userId: string,
  companyId: string,
  data: {
    supplierId: string;
    amount: number;
    paymentMethod: string;
    note?: string;
    paymentDate?: Date;
  },
) {
  try {
    const { supplierId, amount, paymentMethod, note, paymentDate } = data;

    if (!supplierId || !amount || amount <= 0) {
      throw new Error("Supplier ID and valid payment amount are required");
    }

    // 1. Fetch purchases (outside transaction)
    const purchases = await prisma.purchase.findMany({
      where: {
        companyId,
        supplierId,
        status: { in: ["pending", "partial"] },
      },
      orderBy: { createdAt: "asc" },
    });

    if (!purchases.length) {
      throw new Error(
        "No pending or partial purchases found for this supplier",
      );
    }

    // 2. Calculate payment allocation (in memory)
    let remainingAmount = amount;
    const purchaseUpdates: Array<{
      id: string;
      amountPaid: number;
      amountDue: number;
      status: "pending" | "partial" | "paid";
    }> = [];

    for (const purchase of purchases) {
      if (remainingAmount <= 0) break;

      const amountDue = Number(purchase.amountDue);
      const amountToApply = Math.min(amountDue, remainingAmount);

      const newAmountPaid = Number(purchase.amountPaid) + amountToApply;
      const newAmountDue = Math.max(0, amountDue - amountToApply);

      purchaseUpdates.push({
        id: purchase.id,
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status:
          newAmountDue <= 0
            ? "paid"
            : amountToApply > 0
              ? "partial"
              : "pending",
      });

      remainingAmount -= amountToApply;
    }

    // 3. Quick transaction - only update purchases
    const updatedPurchases = await prisma.$transaction(
      async (tx) => {
        return Promise.all(
          purchaseUpdates.map((update) =>
            tx.purchase.update({
              where: { id: update.id },
              data: {
                amountPaid: update.amountPaid,
                amountDue: update.amountDue,
                status: update.status,
              },
            }),
          ),
        );
      },
      { timeout: 5000 },
    );

    // 4. Create payment record (separate operation)
    const supplierPayment = await prisma.supplierPayment.create({
      data: {
        companyId,
        supplierId,
        amount,
        paymentMethod,
        note,
        paymentDate: paymentDate ?? new Date(),
      },
      include: { supplier: true },
    });

    // 5. Log activity (separate operation)
    await prisma.activityLogs.create({
      data: {
        userId,
        companyId,
        action: "created supplier payment",
        details: `Supplier: ${supplierPayment.supplier.name}, Payment: ${amount}, Applied to ${updatedPurchases.length} purchase(s).`,
      },
    });

    revalidatePath("/suppliers");

    return {
      success: true,
      payment: supplierPayment,
      updatedPurchases,
      remainingAmount,
    };
  } catch (error) {
    console.error("Error creating supplier payment:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create supplier payment",
    };
  }
}

// ============================================
// 4. GET SUPPLIER SUMMARY (Purchases + Payments)
// ============================================
export async function getSupplierSummary(
  supplierId: string,
  companyId: string,
) {
  try {
    const [purchases, payments, totalPurchases] = await Promise.all([
      prisma.purchase.findMany({
        where: { companyId, supplierId },
        select: {
          totalAmount: true,
          amountPaid: true,
          amountDue: true,
          status: true,
        },
      }),
      prisma.supplierPayment.findMany({
        where: { companyId, supplierId },
        select: { amount: true },
      }),
      prisma.purchase.count({
        where: { companyId, supplierId },
      }),
    ]);

    const totalAmount = purchases.reduce(
      (sum, p) => sum + Number(p.totalAmount),
      0,
    );
    const totalPaid = purchases.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0,
    );
    const totalDue = purchases.reduce((sum, p) => sum + Number(p.amountDue), 0);

    return {
      totalPurchases,
      totalAmount,
      totalPaid,
      totalDue,
      balance: totalDue,
      purchaseCount: purchases.length,
      paymentCount: payments.length,
      statusBreakdown: {
        pending: purchases.filter((p) => p.status === "pending").length,
        partial: purchases.filter((p) => p.status === "partial").length,
        paid: purchases.filter((p) => p.status === "paid").length,
        received: purchases.filter((p) => p.status === "received").length,
      },
    };
  } catch (error) {
    console.error("Error fetching supplier summary:", error);
    throw error;
  }
}
