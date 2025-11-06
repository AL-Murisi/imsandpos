"use server";
type ReceiptItem = {
  id: string;
  name: string;
  warehousename: string;
  selectedQty: number;
  sellingUnit: "unit" | "packet" | "carton";
  pricePerUnit: number;
  pricePerPacket: number;
  pricePerCarton: number;
};

type ReceiptResult = {
  sale_number: string;
  total_before: number;
  total_after: number;
  received_amount: number;
  discount_amount: string;
  calculated_change: number;
  user_name: string | null;
  customer_name: string | null;
  customer_debt: number | null;
  is_cash: boolean;
  items: ReceiptItem[];
  payment_list: any[] | null;
};
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
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
export async function FetchDebtSales(
  companyId: string,
  where?: Prisma.SaleWhereInput,
  searchQuery: string = "",
  from?: string,
  to?: string,
  page: number = 1, // 0-indexed page number
  pageSize: number = 7,
  sort?: SortingState,
) {
  const combinedWhere: Prisma.SaleWhereInput = {
    ...where, // Existing filters (category, warehouse, etc.)
    companyId,
  };

  const orderBy = sort?.length
    ? { [sort[0].id]: sort[0].desc ? "desc" : "asc" }
    : { createdAt: "desc" as const };

  const fromatDate = from ? new Date(from).toISOString() : undefined;
  const toDate = to ? new Date(to).toISOString() : undefined;
  if (searchQuery) {
    combinedWhere.OR = [
      { customer: { name: { contains: searchQuery, mode: "insensitive" } } },
      {
        customer: {
          phoneNumber: { contains: searchQuery, mode: "insensitive" },
        },
      },
      { saleNumber: { contains: searchQuery, mode: "insensitive" } },
      { paymentStatus: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  if (fromatDate || toDate) {
    combinedWhere.createdAt = {
      ...(fromatDate && {
        gte: fromatDate,
      }),
      ...(toDate && {
        lte: toDate,
      }),
    };
  }
  const debts = await prisma.sale.findMany({
    select: {
      id: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      saleDate: true,
      createdAt: true,
      paymentStatus: true,
      customerId: true,

      saleNumber: true,
      customer: {
        select: {
          name: true,
          outstandingBalance: true,
          phoneNumber: true,
          customerType: true,
        },
      },

      saleItems: {
        select: {
          productId: true,
          sellingUnit: true,
          quantity: true,
          unitPrice: true,
          product: {
            select: {
              name: true,
              warehouseId: true,
            },
          },
        },
      },
    },
    where: combinedWhere,
    skip: page * pageSize,
    take: pageSize,
    orderBy,
  });

  // await prisma.payment
  const serializedDebts = debts.map((sale) => ({
    ...sale,
    saleItems: sale.saleItems.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
    })),
    totalAmount: Number(sale.totalAmount), // Convert Decimal to string
    amountPaid: Number(sale.amountPaid), // Convert Decimal to string
    amountDue: Number(sale.amountDue), // Convert Decimal to string
    saleDate: sale.saleDate.toISOString(),
    createdAt: sale.createdAt.toISOString(),
    customer: sale.customer
      ? {
          ...sale.customer,
          outstandingBalance: Number(sale.customer.outstandingBalance), // ✅ converts nested Decimal
        }
      : null,
  }));
  return serializedDebts; // Return the transformed data
}

export async function FetchDebtSale(
  companyId: string,
  where?: Prisma.SaleWhereInput,
  searchQuery: string = "",
  from?: string,
  to?: string,
  page: number = 1,
  pageSize: number = 7,
  sort?: SortingState,
) {
  const combinedWhere: Prisma.SaleWhereInput = {
    ...where,
    companyId,
  };

  // 🔍 Search
  if (searchQuery) {
    combinedWhere.OR = [
      { customer: { name: { contains: searchQuery, mode: "insensitive" } } },
      {
        customer: {
          phoneNumber: { contains: searchQuery, mode: "insensitive" },
        },
      },
    ];
  }

  // 📅 Date filter
  const fromDate = from ? new Date(from) : undefined;
  const toDate = to ? new Date(to) : undefined;
  if (fromDate || toDate) {
    combinedWhere.createdAt = {
      ...(fromDate && { gte: fromDate }),
      ...(toDate && { lte: toDate }),
    };
  }

  // 🧮 Group by customer and sum totals
  const groupedSales = await prisma.sale.groupBy({
    by: ["customerId"],
    where: combinedWhere,
    _sum: {
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
    },
    orderBy: {
      _sum: { totalAmount: "desc" }, // sort by biggest total
    },
    skip: page * pageSize,
    take: pageSize,
  });

  // 🧾 Fetch customer details for each group
  const customerIds = groupedSales.map((g) => g.customerId).filter(Boolean);

  const customers = await prisma.customer.findMany({
    where: {
      id: { in: customerIds as string[] },
      companyId,
    },
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      customerType: true,
      outstandingBalance: true,
    },
  });

  // 🔗 Combine sales + customer info
  const result = groupedSales.map((group) => {
    const customer = customers.find((c) => c.id === group.customerId);
    return {
      customerId: group.customerId,
      name: customer?.name || "غير معروف",

      phoneNumber: customer?.phoneNumber || "-",
      customerType: customer?.customerType || "-",
      totalAmount: Number(group._sum.totalAmount || 0),
      amountPaid: Number(group._sum.amountPaid || 0),
      amountDue: Number(group._sum.amountDue || 0),
      outstandingBalance: Number(customer?.outstandingBalance || 0),
    };
  });

  return result;
}

export async function FetchCustomerDebtReport(
  customerId: string,
  companyId: string,
) {
  const sales = await prisma.sale.findMany({
    where: {
      customerId,
      companyId,
      paymentStatus: { in: ["pending", "partial"] },
    },
    select: {
      id: true,
      saleNumber: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      saleDate: true,
      paymentStatus: true,
      saleItems: {
        select: {
          id: true,
          product: { select: { name: true, sku: true } },
          quantity: true,
          sellingUnit: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return sales.map((sale) => ({
    ...sale,
    totalAmount: sale.totalAmount.toString(),
    amountPaid: sale.amountPaid.toString(),
    amountDue: sale.amountDue.toString(),
    saleDate: sale.saleDate.toISOString(),
    saleItems: sale.saleItems.map((item) => ({
      ...item,
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
    })),
  }));
}

// app/actions/sells.ts

export async function fetchSalesSummary(
  companyId: string,
  role: string,
  userId: string,
) {
  // Role-based filter

  // Today's date range
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));
  const endOfToday = new Date(today.setHours(23, 59, 59, 999));
  const cashierId = userId;
  // Fetch today's sales and debt payments
  const [todaySales, todayDebtPayments] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { totalAmount: true },
      _count: { id: true },
      where: {
        saleDate: { gte: startOfToday, lte: endOfToday },
        status: "completed",
        cashierId,
        companyId,
      },
    }),
    prisma.payment.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        payment_type: "outstanding_payment",
        status: "completed",
        cashierId,
        companyId,
      },
    }),
  ]);

  // Fetch product stock info
  const productStatsAgg = await prisma.inventory.aggregate({
    _sum: { stockQuantity: true },
    _count: { id: true },
    where: { companyId },
  });

  return {
    cashierSalesToday: todaySales._sum.totalAmount?.toNumber() || 0,
    cashierTransactionsToday: todaySales._count.id || 0,
    cashierDebtPaymentsToday: todayDebtPayments._sum.amount?.toNumber() || 0,
    cashierDebtPaymentsCountToday: todayDebtPayments._count.id || 0,
    productStats: {
      totalStockQuantity: productStatsAgg._sum.stockQuantity?.toString() || 0,
      lowStockProducts: 0, // you can calculate separately if needed
    },
  };
}

export async function fetchReceipt(saleId: string, companyId: string) {
  const result = await prisma.$queryRawUnsafe<ReceiptResult[]>(
    `
    WITH sale_data AS (
      SELECT 
        s.id AS sale_id,
        s.sale_number,
        s.subtotal,
        s.total_amount,
        s.amount_paid,
        s.cashier_id,
        s.customer_id,
        s.company_id,
        s.discount_amount,
        c.name AS customer_name,
        c.outstanding_balance,
        u.name AS cashier_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE s.sale_number = $1 AND s.company_id = $2
    ),
    sale_items AS (
      SELECT 
        si.sale_id,
        si.product_id,
        si.quantity,
        si.selling_unit,
        p.name AS product_name,
        p.price_per_unit,
        p.price_per_packet,
        p.price_per_carton,
        p.warehouse_id,
        w.name AS warehouse_name
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      LEFT JOIN warehouses w ON p.warehouse_id = w.id
    ),
    payments AS (
      SELECT 
        p.sale_id,
        json_agg(
          json_build_object(
            'id', p.id,
            'amount', p.amount,
            'method', p.payment_method,
            'date', p.created_at
          )
        ) AS payment_list
      FROM payments p
      GROUP BY p.sale_id
    )
    SELECT 
      s.sale_number,
      s.subtotal::numeric AS total_before,
      s.total_amount::numeric AS total_after,
      s.discount_amount::numeric AS discount_amount,
      COALESCE(s.amount_paid, 0)::numeric AS received_amount,
      (COALESCE(s.amount_paid, 0)::numeric - s.total_amount::numeric) AS calculated_change,
      s.cashier_name AS user_name,
      s.customer_name,
      s.outstanding_balance::numeric AS customer_debt,
      (COALESCE(s.amount_paid, 0)::numeric >= s.total_amount::numeric) AS is_cash,
      (
        SELECT json_agg(
          json_build_object(
            'id', si.product_id,
            'name', si.product_name,
            'warehousename', si.warehouse_name,
            'selectedQty', si.quantity,
            'sellingUnit', si.selling_unit,
            'pricePerUnit', si.price_per_unit,
            'pricePerPacket', si.price_per_packet,
            'pricePerCarton', si.price_per_carton
          )
        )
        FROM sale_items si
        WHERE si.sale_id = s.sale_id
      ) AS items,
      p.payment_list
    FROM sale_data s
    LEFT JOIN payments p ON p.sale_id = s.sale_id;
    `,
    saleId,
    companyId,
  );

  const receipt = result[0];
  if (!receipt) return null;

  // Convert decimals safely
  const safeReceipt = JSON.parse(
    JSON.stringify(receipt, (_key, value) => {
      if (typeof value === "object" && value !== null && "toNumber" in value) {
        return Number(value.toNumber());
      }
      if (typeof value === "bigint") return Number(value);
      return value;
    }),
  );

  return safeReceipt;
}
