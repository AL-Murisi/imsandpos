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
  sale_type?: string, // only returns

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
  const today = new Date();
  const startOfToday = new Date(today.setHours(0, 0, 0, 0));
  const endOfToday = new Date(today.setHours(23, 59, 59, 999));
  const fromatDate = from ? new Date(from).toISOString() : startOfToday;
  const toDate = to ? new Date(to).toISOString() : endOfToday;
  if (searchQuery) {
    combinedWhere.OR = [
      { customer: { name: { contains: searchQuery, mode: "insensitive" } } },
      { customerName: { contains: searchQuery, mode: "insensitive" } },
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
      status: true,
      customerId: true,
      customerName: true,
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
          totalPrice: true,
          product: {
            select: {
              name: true,
              warehouse: { select: { id: true, name: true } },
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
  const baseSaleNumbers = debts
    .filter((sale) => sale.sale_type === "SALE")
    .map((sale) => sale.invoiceNumber.replace("-بيع", "").trim());

  const existingReturns =
    baseSaleNumbers.length > 0
      ? await prisma.invoice.findMany({
          where: {
            companyId,
            sale_type: "RETURN_SALE",
            OR: baseSaleNumbers.map((base) => ({
              invoiceNumber: { contains: base },
            })),
          },
          select: { invoiceNumber: true },
        })
      : [];

  // 3. Normalize the found returns to their base IDs for easy lookup
  const returnedBaseNumbers = new Set(
    existingReturns.map((invoice) =>
      invoice.invoiceNumber.replace("-مرتجع", "").replace("-بيع", "").trim(),
    ),
  );

  const total = await prisma.invoice.count({ where: { companyId } });

  const serializedDebts = debts.map((sale) => {
    // 1. Clean the current sale's invoice number inside the map
    const currentBaseNumber = sale.invoiceNumber
      .replace("-مرتجع", "")
      .replace("-بيع", "")
      .trim();

    // 2. Check if THIS specific invoice exists in the returns set
    const hasAlreadyBeenReturned = returnedBaseNumbers.has(currentBaseNumber);

    return {
      ...sale,
      saleItems: sale.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.price),
        unit: item.unit,
        warehouse: item.product.warehouse?.name || "بدون مستودع",
        totalPrice: Number(item.totalPrice),
      })),
      saleNumber: sale.invoiceNumber,
      status: sale.status,
      reason: sale.transactions.find((p) => p.notes)?.notes || null,
      totalAmount: Number(sale.totalAmount),
      amountPaid: Number(sale.amountPaid),
      amountDue: Number(sale.amountDue),
      payments: sale.transactions,
      saleDate: sale.invoiceDate.toISOString(),
      createdAt: sale.invoiceDate.toISOString(),
      // 3. Assign the result here
      hasReturnSale: hasAlreadyBeenReturned,
      customer: sale.customer
        ? {
            ...sale.customer,
            outstandingBalance: Number(sale.customer.outstandingBalance),
          }
        : sale.customerName
          ? {
              name: sale.customerName,
              outstandingBalance: 0,
              phoneNumber: null,
              customerType: "",
            }
          : null,
    };
  });

  const serilaz = serializeData(serializedDebts);
  return { serilaz, total };
}

export async function FetchCustomerDebtReport(
  customerId: string,
  companyId: string,
) {
  const sales = await prisma.invoice.findMany({
    where: {
      customerId,
      companyId,
      sale_type: "SALE",
      status: { in: ["partial", "unpaid"] },
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

  return serializeData(
    sales.map((sale) => ({
      ...sale,
      saleNumber: sale.invoiceNumber,
      totalAmount: Number(sale.totalAmount),
      amountPaid: Number(sale.amountPaid),
      amountDue: Number(sale.amountDue),
      saleDate: sale.invoiceDate.toISOString(),
      saleItems: sale.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        price: Number(item.price),
        sellingUnit: item.unit.toString(),
        unitPrice: Number(item.price),
        totalPrice: Number(item.totalPrice),
      })),
    })),
  );
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
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const endOfYesterday = new Date(endOfToday);
  endOfYesterday.setDate(endOfYesterday.getDate() - 1);
  // Fetch today's sales and debt payments
  const [todaySales, yesterdaySales, todayDebtPayments, todayProductsCount] =
    await Promise.all([
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        _count: { id: true },
        where: {
          invoiceDate: { gte: startOfToday, lte: endOfToday },
          status: "paid",
          cashierId,
          companyId,
        },
      }),
      prisma.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          invoiceDate: { gte: startOfYesterday, lte: endOfYesterday },
          status: "paid",
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
          status: "paid",
          userId: cashierId,
          companyId,
        },
      }),
      prisma.invoiceItem.aggregate({
        _count: { productId: true },
        where: {
          invoice: {
            sale_type: "SALE",
            companyId,
            cashierId,
            invoiceDate: { gte: startOfToday, lte: endOfToday },
          },
        },
      }),
    ]);

  // Fetch product stock info
  const salesToday = todaySales._sum.totalAmount?.toNumber() || 0;
  const salesYesterday = yesterdaySales._sum.totalAmount?.toNumber() || 0;

  // Calculate Percentage Change
  let percentageChange = 0;
  if (salesYesterday > 0) {
    percentageChange = ((salesToday - salesYesterday) / salesYesterday) * 100;
  } else if (salesToday > 0) {
    percentageChange = 100; // If yesterday was 0 and today is > 0, it's 100% growth
  }
  return {
    cashierSalesToday: todaySales._sum.totalAmount?.toNumber() || 0,
    cashierTransactionsToday: todaySales._count.id || 0,
    avrageSaleValueToday:
      todaySales._count.id > 0
        ? todaySales._sum.totalAmount?.toNumber()! / todaySales._count.id
        : 0,
    cashierDebtPaymentsToday: todayDebtPayments._sum.amount?.toNumber() || 0,
    cashierDebtPaymentsCountToday: todayDebtPayments._count.id || 0,
    cashierProductsCountToday: todayProductsCount._count.productId || 0,
    percentageChange,
  };
}

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
    customerName: invoice.customerName,
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
      : invoice.customerName
        ? {
            id: null,
            name: invoice.customerName,
            phone: null,
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
