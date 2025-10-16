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
    },
    where: combinedWhere,
    skip: page * pageSize,
    take: pageSize,
    orderBy,
  });
  // await prisma.payment
  const serializedDebts = debts.map((sale) => ({
    ...sale,
    totalAmount: sale.totalAmount.toString(), // Convert Decimal to string
    amountPaid: sale.amountPaid.toString(), // Convert Decimal to string
    amountDue: sale.amountDue.toString(), // Convert Decimal to string
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

  console.log(userId);
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
        paymentType: "outstanding_payment",
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

export async function Fetchusers(isActive: boolean, companyId: string) {
  // let totalUser;
  const users = await prisma.user.aggregate({
    _count: { id: true },
    where: {
      isActive: isActive,
      companyId,
    },
  });
  return {
    users: users._count.id,
  };
}
