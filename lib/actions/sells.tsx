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
  sale_type: string;
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
import { InvoiceType, Prisma } from "@prisma/client";
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
  where?: Prisma.InvoiceWhereInput,
  sale_type: string = "SALE", // only returns

  searchQuery: string = "",
  from?: string,
  to?: string,
  page: number = 1, // 0-indexed page number
  pageSize: number = 13,
  sort?: SortingState,
) {
  const combinedWhere: Prisma.InvoiceWhereInput = {
    ...where, // Existing filters (category, warehouse, etc.)
    companyId,
    sale_type: sale_type as InvoiceType, // only returns
  };

  const orderBy = sort?.length
    ? { [sort[0].id]: sort[0].desc ? "desc" : "asc" }
    : { invoiceDate: "desc" as const };

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
      { invoiceNumber: { contains: searchQuery, mode: "insensitive" } },
      { status: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  if (fromatDate || toDate) {
    combinedWhere.invoiceDate = {
      ...(fromatDate && {
        gte: fromatDate,
      }),
      ...(toDate && {
        lte: toDate,
      }),
    };
  }

  const debts = await prisma.invoice.findMany({
    select: {
      id: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      invoiceDate: true,

      customerId: true,
      sale_type: true,
      invoiceNumber: true,

      customer: {
        select: {
          name: true,
          outstandingBalance: true,
          phoneNumber: true,
          customerType: true,
        },
      },
      transactions: {
        select: { notes: true, status: true, paymentMethod: true },
      },
      items: {
        select: {
          productId: true,
          unit: true,
          quantity: true,
          price: true,
          product: {
            select: {
              name: true,
              warehouseId: true,
              sellingUnits: true,
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
  const total = await prisma.invoice.count({ where: { companyId } });

  // await prisma.payment
  const serializedDebts = debts.map((sale) => ({
    ...sale,
    saleItems: sale.items.map((item) => ({
      ...item,
      quantity: Prisma.Decimal(item.quantity),
      unitPrice: Number(item.price),
      totalPrice: Number(item.price),
    })),
    saleNumber: sale.invoiceNumber,
    status: sale.transactions.find((p) => p.status)?.status || null,
    reason: sale.transactions.find((p) => p.notes)?.notes || null, // ✅ FIXED
    totalAmount: Number(sale.totalAmount),
    amountPaid: Number(sale.amountPaid),
    amountDue: Number(sale.amountDue),
    payments: sale.transactions,
    saleDate: sale.invoiceDate.toISOString(),
    createdAt: sale.invoiceDate.toISOString(),
    customer: sale.customer
      ? {
          ...sale.customer,
          outstandingBalance: Number(sale.customer.outstandingBalance),
        }
      : null,
  }));
  const serilaz = serializeData(serializedDebts);
  return { serilaz, total }; // Return the transformed data
}

// export async function FetchDebtSale(
//   companyId: string,
//   where?: Prisma.SaleWhereInput,
//   searchQuery: string = "",
//   from?: string,
//   to?: string,
//   page: number = 1,
//   pageSize: number = 7,
//   sort?: SortingState,
// ) {
//   const combinedWhere: Prisma.SaleWhereInput = {
//     ...where,
//     companyId,
//   };

//   // 🔍 Search
//   if (searchQuery) {
//     combinedWhere.OR = [
//       { customer: { name: { contains: searchQuery, mode: "insensitive" } } },
//       {
//         customer: {
//           phoneNumber: { contains: searchQuery, mode: "insensitive" },
//         },
//       },
//     ];
//   }

//   // 📅 Date filter
//   const fromDate = from ? new Date(from) : undefined;
//   const toDate = to ? new Date(to) : undefined;
//   if (fromDate || toDate) {
//     combinedWhere.createdAt = {
//       ...(fromDate && { gte: fromDate }),
//       ...(toDate && { lte: toDate }),
//     };
//   }

//   // 🧮 Group by customer and sum totals
//   const groupedSales = await prisma.sale.groupBy({
//     by: ["customerId"],
//     where: combinedWhere,
//     _sum: {
//       totalAmount: true,
//       amountPaid: true,
//       amountDue: true,
//     },
//     orderBy: {
//       _sum: { totalAmount: "desc" }, // sort by biggest total
//     },
//     skip: page * pageSize,
//     take: pageSize,
//   });

//   // 🧾 Fetch customer details for each group
//   const customerIds = groupedSales.map((g) => g.customerId).filter(Boolean);

//   const customers = await prisma.customer.findMany({
//     where: {
//       id: { in: customerIds as string[] },
//       companyId,
//     },
//     select: {
//       id: true,
//       name: true,
//       phoneNumber: true,
//       customerType: true,
//       outstandingBalance: true,
//     },
//   });
//   const total = await prisma.sale.count({ where: { companyId } });

//   // 🔗 Combine sales + customer info
//   const result = groupedSales.map((group) => {
//     const customer = customers.find((c) => c.id === group.customerId);
//     return {
//       customerId: group.customerId,
//       name: customer?.name || "غير معروف",

//       phoneNumber: customer?.phoneNumber || "-",
//       customerType: customer?.customerType || "-",
//       totalAmount: Number(group._sum.totalAmount || 0),
//       amountPaid: Number(group._sum.amountPaid || 0),
//       amountDue: Number(group._sum.amountDue || 0),
//       outstandingBalance: Number(customer?.outstandingBalance || 0),
//     };
//   });

//   return { result, total };
// }
// export async function fetchAllReturnItems(companyId: string) {
//   // Fetch all sales of type "return" for this company
//   const returnSales = await prisma.sale.findMany({
//     where: {
//       companyId,
//       sale_type: "sale", // only returns
//     },
//     select: {
//       sale_type: true,
//       saleDate: true,
//       // originalSaleId: true,
//       saleItems: {
//         select: {
//           productId: true,
//           quantity: true,
//           sellingUnit: true,
//           unitPrice: true,
//           product: { select: { name: true } },
//         },
//       },

//       customer: {
//         select: { id: true, name: true },
//       },
//     },
//     orderBy: { saleDate: "desc" },
//   });

//   // Flatten all items into a single array
//   const returnItems = returnSales.flatMap((sale) =>
//     sale.saleItems.map((item) => ({
//       // returnSaleId: sale.originalSaleId,
//       sale_type: sale.sale_type,
//       customerId: sale.customer?.id,
//       customerName: sale.customer?.name || "غير معروف",
//       productId: item.productId,
//       name: item.product.name,
//       sellingUnit: item.sellingUnit,
//       quantityReturned: Number(item.quantity),
//       unitPrice: Number(item.unitPrice),
//       saleDate: sale.saleDate,
//     })),
//   );

//   return returnItems;
// }

export async function FetchCustomerDebtReport(
  customerId: string,
  companyId: string,
) {
  const sales = await prisma.invoice.findMany({
    where: {
      customerId,
      companyId,
      sale_type: { not: "RETURN_SALE" },
    },
    select: {
      id: true,
      invoiceNumber: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      invoiceDate: true,
      status: true,
      items: {
        select: {
          id: true,
          product: { select: { name: true, sku: true } },
          quantity: true,
          unit: true,
          price: true,
          totalPrice: true,
        },
      },
    },
    orderBy: { invoiceDate: "desc" },
  });

  return sales.map((sale) => ({
    ...sale,
    totalAmount: sale.totalAmount.toString(),
    amountPaid: sale.amountPaid.toString(),
    amountDue: sale.amountDue.toString(),
    saleDate: sale.invoiceDate.toISOString(),
    saleItems: sale.items.map((item) => ({
      ...item,
      sellingUnit: item.unit.toString(),
      unitPrice: item.price.toString(),
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
    prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      _count: { id: true },
      where: {
        invoiceDate: { gte: startOfToday, lte: endOfToday },
        status: "completed",
        cashierId,
        companyId,
      },
    }),
    prisma.financialTransaction.aggregate({
      _sum: { amount: true },
      _count: { id: true },
      where: {
        createdAt: { gte: startOfToday, lte: endOfToday },
        type: "RECEIPT",
        status: "completed",
        userId: cashierId,
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

// export async function fetchReceipt(saleId: string, companyId: string) {
//   const result = await prisma.$queryRawUnsafe<ReceiptResult[]>(
//     `
//     WITH sale_data AS (
//       SELECT
//         s.id AS sale_id,
//         s.sale_number,
//         s.subtotal,
//         s.total_amount,
//         s.amount_paid,
//         s.cashier_id,
//         s.customer_id,
//         s.company_id,
//         s.discount_amount,
//         s.sale_type,
//         c.name AS customer_name,
//         c.outstanding_balance,
//         u.name AS cashier_name
//       FROM invoices s
//       LEFT JOIN customers c ON s.customer_id = c.id
//       LEFT JOIN users u ON s.cashier_id = u.id
//       WHERE s.sale_number = $1 AND s.company_id = $2
//     ),
//     invoice_items AS (
//       SELECT
//         si.invoice_id,
//         si.product_id,
//         si.quantity,
//         si.selling_unit,
//         si.unit_price,
//         p.name AS product_name,
//         p.warehouse_id,
//         w.name AS warehouse_name
//       FROM invoice_items si
//       JOIN products p ON si.product_id = p.id
//       LEFT JOIN warehouses w ON p.warehouse_id = w.id
//     ),
//     payments AS (
//       SELECT
//         p.sale_id,
//         json_agg(
//           json_build_object(
//             'id', p.id,
//             'amount', p.amount,
//             'method', p.payment_method,
//             'date', p.created_at
//           )
//         ) AS payment_list
//       FROM payments p
//       GROUP BY p.sale_id
//     )
//     SELECT
//       s.sale_number,
//       s.subtotal::numeric AS total_before,
//       s.total_amount::numeric AS total_after,
//       s.discount_amount::numeric AS discount_amount,
//       COALESCE(s.amount_paid, 0)::numeric AS received_amount,
//       (COALESCE(s.amount_paid, 0)::numeric - s.total_amount::numeric) AS calculated_change,
//       s.cashier_name AS user_name,
//       s.customer_name,
//       s.sale_type,
//       s.outstanding_balance::numeric AS customer_debt,
//       (COALESCE(s.amount_paid, 0)::numeric >= s.total_amount::numeric) AS is_cash,
//       (
//         SELECT json_agg(
//           json_build_object(
//             'id', si.product_id,
//             'name', si.product_name,
//             'warehousename', si.warehouse_name,
//             'selectedQty', si.quantity,
//             'sellingUnit', si.selling_unit,
//             'pricePerUnit', si.unit_price
//           )
//         )
//         FROM sale_items si
//         WHERE si.sale_id = s.sale_id
//       ) AS items,
//       p.payment_list
//     FROM sale_data s
//     LEFT JOIN payments p ON p.sale_id = s.sale_id;
//     `,
//     saleId,
//     companyId,
//   );

//   const receipt = result[0];
//   if (!receipt) return null;

//   // Convert decimals safely
//   const safeReceipt = JSON.parse(
//     JSON.stringify(receipt, (_key, value) => {
//       if (typeof value === "object" && value !== null && "toNumber" in value) {
//         return Number(value.toNumber());
//       }
//       if (typeof value === "bigint") return Number(value);
//       return value;
//     }),
//   );

//   return safeReceipt;
// }
// export async function fetchReceipt(invoiceId: string, companyId: string) {
//   const result = await prisma.$queryRawUnsafe<any[]>(
//     `
//     WITH invoice_data AS (
//       SELECT
//         i.id,
//         i.invoice_number,
//         i.total_amount,
//         i.amount_paid,
//         i.amount_due,
//         i.sale_type,
//         i.cashier_id,
//         i.customer_id,
//         c.name AS customer_name,
//         u.name AS cashier_name
//       FROM invoices i
//       LEFT JOIN customers c ON i.customer_id = c.id
//       LEFT JOIN users u ON i.cashier_id = u.id
//       WHERE i.id = $1 AND i.company_id = $2
//     ),
//     invoice_items AS (
//       SELECT
//         ii.invoice_id,
//         ii.product_id,
//         ii.quantity,
//         ii.unit,
//         ii.price,
//         ii."totalPrice",
//         ii."discountAmount",
//         p.name AS product_name
//       FROM invoice_items ii
//       JOIN products p ON ii.product_id = p.id
//       WHERE ii.invoice_id = $1
//     ),
//     payments AS (
//       SELECT
//         ft.invoice_id,
//         json_agg(
//           json_build_object(
//             'id', ft.id,
//             'amount', ft.amount,
//             'method', ft.payment_method,
//             'date', ft.created_at
//           )
//         ) AS payment_list
//       FROM financial_transactions ft
//       WHERE ft.invoice_id = $1
//       GROUP BY ft.invoice_id
//     )
//     SELECT
//       i.invoice_number,
//       i.total_amount::numeric      AS "totalAmount",
//       i.amount_paid::numeric       AS "amountPaid",
//       i.amount_due::numeric        AS "amountDue",
//       i.cashier_name,
//       i.customer_name,
//       i.sale_type,
//       (
//         SELECT json_agg(
//           json_build_object(
//             'productId', ii.product_id,
//             'name', ii.product_name,
//             'qty', ii.quantity,
//             'unit', ii.unit,
//             'price', ii.price,
//             'total', ii."totalPrice",
//             'discount', ii."discountAmount"
//           )
//         )
//         FROM invoice_items ii
//         WHERE ii.invoice_id = i.id
//       ) AS items,
//       p.payment_list
//     FROM invoice_data i
//     LEFT JOIN payments p ON p.invoice_id = i.id;
//   `,
//     invoiceId,
//     companyId,
//   );

//   return result[0];
// }
export async function fetchReceipt(invoiceId: string, companyId: string) {
  console.log(
    "Fetching receipt for invoice ID:",
    invoiceId,
    "Company ID:",
    companyId,
  );
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phoneNumber: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
      cashier: {
        select: {
          name: true,
        },
      },
      warehouse: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
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
          createdAt: true,
          status: true,
        },
      },
    },
  });

  if (!invoice) throw new Error("Invoice not found");

  // 🔹 Format it for your receipt UI
  const receipt = {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    date: invoice.invoiceDate.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long", // Use 'numeric' for 1, 'short' for abbreviated, or 'long' for full name
      day: "numeric",
    }),
    saleType: invoice.sale_type,

    customer: invoice.customer
      ? {
          id: invoice.customer.id,
          name: invoice.customer.name,
          phone: invoice.customer.phoneNumber,
        }
      : null,

    branch: invoice.branch,

    cashierName: invoice.cashier?.name || "غير معروف",

    totalAmount: invoice.totalAmount,
    amountPaid: invoice.amountPaid,
    amountDue: invoice.amountDue,

    items: invoice.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      warehousename: invoice.warehouse?.name,

      name: i.product.name,
      selectedQty: i.quantity,
      sellingUnit: i.unit,
      pricePerUnit: i.price,
      discount: i.discountAmount,
      total: i.totalPrice,
    })),

    payments: invoice.transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      method: t.paymentMethod,
      date: t.createdAt.toLocaleDateString("ar-EG", {
        year: "numeric",
        month: "long", // Use 'numeric' for 1, 'short' for abbreviated, or 'long' for full name
        day: "numeric",
      }),
      status: t.status,
    })),
  };

  const serilazed = serializeData(receipt);
  console.log("Serialized receipt data:", serilazed);
  return serilazed;
}
