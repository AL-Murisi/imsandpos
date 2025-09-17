// app/actions/sales/getTopSellingProducts.ts
"use server";
import prisma from "@/lib/prisma";
import {
  subDays,
  startOfWeek,
  startOfMonth,
  startOfDay,
  endOfDay,
  format,
} from "date-fns";

export async function getTopSellingProducts(
  limit = 5,

  from?: string,
  to?: string,
  categoryId?: string
) {
  let dateFilter: any = {}; // Object to hold date filtering conditions

  if (from) {
    // For a date range, query from the very beginning of the start day
    dateFilter.gte = startOfDay(from); // Greater than or equal to
  }

  if (to) {
    // For a date range, query up to the very end of the end day
    dateFilter.lte = endOfDay(to); // Less than or equal to
  }

  const saleItems = await prisma.saleItem.findMany({
    where: {
      createdAt: {
        ...dateFilter,
      },
      ...(categoryId && {
        product: {
          is: {
            categoryId,
          },
        },
      }),
    },
    select: {
      productId: true,
      quantity: true,
      product: {
        select: {
          name: true,
          categoryId: true,
        },
      },
    },
  });

  const grouped = saleItems.reduce<
    Record<string, { name: string; quantity: number }>
  >((acc, item) => {
    const name = item.product.name ?? "Unknown";
    acc[item.productId] = acc[item.productId] || { name, quantity: 0 };
    acc[item.productId].quantity += item.quantity;
    return acc;
  }, {});

  const sorted = Object.values(grouped)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);

  return sorted;
}

// app/actions/sales/getTopSellingProducts.ts

export async function fetchrevnu(from?: string, to?: string, groupBy?: string) {
  let dateFilter: any = {};

  if (from) {
    dateFilter.gte = startOfDay(new Date(from));
  }

  if (to) {
    dateFilter.lte = endOfDay(new Date(to));
  }

  // Fetch payments
  const payments = await prisma.payment.findMany({
    where: {
      createdAt: {
        ...dateFilter,
      },
    },
    select: {
      amount: true, // Prisma.Decimal
      createdAt: true,
    },
  });

  // Group by day or month
  const grouped = payments.reduce<
    Record<string, { date: string; total: number }>
  >((acc, payment) => {
    const key =
      groupBy === "month"
        ? format(payment.createdAt, "MM").toLocaleString()
        : format(payment.createdAt, "yyyy-MM");
    const formattedDate = new Date(key).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    if (!acc[key]) {
      acc[key] = { date: formattedDate, total: 0 };
    }

    // Convert Prisma.Decimal → number
    acc[key].total += Number(payment.amount);

    return acc;
  }, {});

  // Instead of returning the object
  const sort = Object.values(grouped).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return sort;
}
