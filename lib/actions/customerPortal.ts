"use server";

import { getCustomerStatement } from "@/lib/actions/test";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Prisma } from "@prisma/client";

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

export async function requireCustomerPortalContext() {
  const session = await getSession();
  if (!session?.userId || !session.companyId) {
    throw new Error("Unauthorized");
  }

  if (!(session.roles ?? []).includes("customer")) {
    throw new Error("Unauthorized");
  }

  const customer = await prisma.customer.findFirst({
    where: {
      companyId: session.companyId,
      isActive: true,
      OR: [
        { userId: session.userId },
        ...(session.email
          ? [
              {
                email: {
                  equals: session.email.trim().toLowerCase(),
                  mode: "insensitive" as const,
                },
              },
            ]
          : []),
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      address: true,
      city: true,
      balance: true,
      outstandingBalance: true,
      createdAt: true,
    },
  });

  if (!customer) {
    throw new Error("Customer record not found");
  }

  return { session, customer: serializeData(customer) };
}

export async function getCustomerPortalDashboard() {
  const { session, customer } = await requireCustomerPortalContext();

  const [invoiceAgg, voucherAgg, latestInvoices, latestVouchers] =
    await Promise.all([
      prisma.invoice.aggregate({
        _count: { id: true },
        _sum: {
          totalAmount: true,
          amountPaid: true,
          amountDue: true,
        },
        where: {
          companyId: session.companyId,
          customerId: customer.id,
          sale_type: { in: ["SALE", "RETURN_SALE"] },
        },
      }),
      prisma.financialTransaction.aggregate({
        _count: { id: true },
        _sum: { amount: true },
        where: {
          companyId: session.companyId,
          customerId: customer.id,
        },
      }),
      prisma.invoice.findMany({
        where: {
          companyId: session.companyId,
          customerId: customer.id,
          sale_type: { in: ["SALE", "RETURN_SALE"] },
        },
        orderBy: { invoiceDate: "desc" },
        take: 5,
        select: {
          id: true,
          invoiceNumber: true,
          sale_type: true,
          status: true,
          invoiceDate: true,
          totalAmount: true,
          amountPaid: true,
          amountDue: true,
        },
      }),
      prisma.financialTransaction.findMany({
        where: {
          companyId: session.companyId,
          customerId: customer.id,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          type: true,
          voucherNumber: true,
          amount: true,
          paymentMethod: true,
          status: true,
          createdAt: true,
          notes: true,
        },
      }),
    ]);

  return serializeData({
    customer,
    stats: {
      invoiceCount: invoiceAgg._count.id ?? 0,
      voucherCount: voucherAgg._count.id ?? 0,
      totalSales: invoiceAgg._sum.totalAmount ?? 0,
      totalPaid: invoiceAgg._sum.amountPaid ?? 0,
      totalDue: invoiceAgg._sum.amountDue ?? 0,
      voucherTotal: voucherAgg._sum.amount ?? 0,
      currentBalance: customer.balance ?? 0,
      outstandingBalance: customer.outstandingBalance ?? 0,
    },
    latestInvoices,
    latestVouchers,
  });
}

export async function getCustomerPortalReceipts() {
  const { session, customer } = await requireCustomerPortalContext();

  const invoices = await prisma.invoice.findMany({
    where: {
      companyId: session.companyId,
      customerId: customer.id,
      sale_type: { in: ["SALE", "RETURN_SALE"] },
    },
    orderBy: { invoiceDate: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      sale_type: true,
      status: true,
      invoiceDate: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      currencyCode: true,
      items: {
        select: {
          id: true,
          quantity: true,
          unit: true,
          price: true,
          totalPrice: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  return serializeData({ customer, invoices });
}

export async function getCustomerPortalReceipt(invoiceId: string) {
  const { session, customer } = await requireCustomerPortalContext();

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId: session.companyId,
      customerId: customer.id,
      sale_type: { in: ["SALE", "RETURN_SALE"] },
    },
    select: {
      id: true,
      invoiceNumber: true,
      sale_type: true,
      status: true,
      invoiceDate: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      customerName: true,
      cashier: {
        select: { name: true },
      },
      branch: {
        select: { name: true },
      },
      warehouse: {
        select: { name: true },
      },
      items: {
        select: {
          id: true,
          quantity: true,
          unit: true,
          price: true,
          discountAmount: true,
          totalPrice: true,
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
      },
      transactions: {
        select: {
          id: true,
          amount: true,
          paymentMethod: true,
          status: true,
          createdAt: true,
          voucherNumber: true,
          type: true,
        },
      },
    },
  });

  if (!invoice) {
    throw new Error("Receipt not found");
  }

  return serializeData({ customer, invoice });
}

export async function getCustomerPortalVouchers() {
  const { session, customer } = await requireCustomerPortalContext();

  const vouchers = await prisma.financialTransaction.findMany({
    where: {
      companyId: session.companyId,
      customerId: customer.id,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      voucherNumber: true,
      amount: true,
      paymentMethod: true,
      referenceNumber: true,
      status: true,
      notes: true,
      createdAt: true,
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
        },
      },
    },
  });

  return serializeData({ customer, vouchers });
}

export async function getCustomerPortalStatement(from?: string, to?: string) {
  const { session, customer } = await requireCustomerPortalContext();

  const dateFrom =
    from ||
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
  const dateTo = to || new Date().toISOString().split("T")[0];

  const statement = await getCustomerStatement(
    customer.id,
    session.companyId,
    dateFrom,
    dateTo,
  );

  if (!statement?.success) {
    throw new Error(statement?.error || "Statement not available");
  }

  return serializeData({
    customer,
    statement: statement.data,
  });
}
