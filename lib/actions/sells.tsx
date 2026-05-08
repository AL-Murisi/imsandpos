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
  sale_type?: string,
  searchQuery: string = "",
  from?: string,
  to?: string,
  page: number = 1,
  pageSize: number = 13,
  sort?: SortingState,
) {
  const combinedWhere: Prisma.InvoiceWhereInput = {
    ...where,
    companyId,
    sale_type: { in: [InvoiceType.SALE, InvoiceType.RETURN_SALE] },
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
      ...(fromatDate && { gte: fromatDate }),
      ...(toDate && { lte: toDate }),
    };
  }

  // ── Single query — no StockMovement join needed ──────────────────────────
  const [debts, total] = await Promise.all([
    prisma.invoice.findMany({
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
            id: true,
            productId: true,
            unit: true,
            quantity: true,
            price: true,
            totalPrice: true,
            warehouseId: true, // ← direct from InvoiceItem
            warehouse: {
              // ← direct relation, no movement needed
              select: { id: true, name: true },
            },
            product: {
              select: { name: true, sellingUnits: true },
            },
          },
        },
      },
      where: combinedWhere,
      skip: page * pageSize, // ← fixed: was page * pageSize but page is 1-indexed
      take: pageSize,
      orderBy,
    }),
    // ← fixed: was counting without combinedWhere so pagination total was wrong
    prisma.invoice.count({ where: combinedWhere }),
  ]);

  // ── Return detection ─────────────────────────────────────────────────────
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

  const returnedBaseNumbers = new Set(
    existingReturns.map((inv) =>
      inv.invoiceNumber.replace("-مرتجع", "").replace("-بيع", "").trim(),
    ),
  );

  // ── Serialize ────────────────────────────────────────────────────────────
  const serializedDebts = debts.map((sale) => {
    const currentBaseNumber = sale.invoiceNumber
      .replace("-مرتجع", "")
      .replace("-بيع", "")
      .trim();

    return {
      ...sale,
      saleItems: sale.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.product.name,
        unit: item.unit,
        quantity: Number(item.quantity),
        unitPrice: Number(item.price),
        totalPrice: Number(item.totalPrice),
        warehouseId: item.warehouseId ?? null,
        warehouse: item.warehouse?.name ?? "بدون مستودع", // ← from item directly
        sellingUnits: item.product.sellingUnits,
      })),
      saleNumber: sale.invoiceNumber,
      reason: sale.transactions.find((p) => p.notes)?.notes ?? null,
      totalAmount: Number(sale.totalAmount),
      amountPaid: Number(sale.amountPaid),
      amountDue: Number(sale.amountDue),
      payments: sale.transactions,
      saleDate: sale.invoiceDate.toISOString(),
      createdAt: sale.invoiceDate.toISOString(),
      hasReturnSale: returnedBaseNumbers.has(currentBaseNumber),
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
  return { serilaz: serializeData(serializedDebts), total };
}
// type SaleItemExpanded = {
//   productId: string;
//   product: {
//     name: string;
//     sellingUnits: any;
//   };

//   quantity: number;
//   price: number;
//   totalPrice: number;

//   unit: string;
//   sellingUnit: string;

//   warehouse: string;
//   warehouseId: string | null;

//   batchId: string | null;
//   supplier: string | null;
//   supplierId: string | null;
// };
// export async function FetchDebtSales(
//   companyId: string,
//   where?: Prisma.InvoiceWhereInput,
//   sale_type?: string,
//   searchQuery: string = "",
//   from?: string,
//   to?: string,
//   page: number = 1,
//   pageSize: number = 13,
//   sort?: SortingState,
// ) {
//   const combinedWhere: Prisma.InvoiceWhereInput = {
//     ...where,
//     companyId,
//     sale_type: sale_type as InvoiceType,
//   };

//   const orderBy = sort?.length
//     ? { [sort[0].id]: sort[0].desc ? "desc" : "asc" }
//     : { invoiceDate: "desc" as const };

//   const today = new Date();
//   const startOfToday = new Date(today.setHours(0, 0, 0, 0));
//   const endOfToday = new Date(today.setHours(23, 59, 59, 999));

//   const fromDate = from ? new Date(from) : startOfToday;
//   const toDate = to ? new Date(to) : endOfToday;

//   if (searchQuery) {
//     combinedWhere.OR = [
//       { customerName: { contains: searchQuery, mode: "insensitive" } },
//       { invoiceNumber: { contains: searchQuery, mode: "insensitive" } },
//       { status: { contains: searchQuery, mode: "insensitive" } },
//     ];
//   }

//   combinedWhere.invoiceDate = {
//     gte: fromDate,
//     lte: toDate,
//   };

//   // -----------------------------
//   // 1. FETCH INVOICES
//   // -----------------------------
//   const debts = await prisma.invoice.findMany({
//     where: combinedWhere,
//     skip: page * pageSize,
//     take: pageSize,
//     orderBy,
//     select: {
//       id: true,
//       totalAmount: true,
//       amountPaid: true,
//       amountDue: true,
//       invoiceDate: true,
//       status: true,
//       customerName: true,
//       invoiceNumber: true,
//       sale_type: true,

//       customer: {
//         select: {
//           name: true,
//           outstandingBalance: true,
//           phoneNumber: true,
//           customerType: true,
//         },
//       },

//       transactions: {
//         select: {
//           notes: true,
//           status: true,
//           paymentMethod: true,
//         },
//       },

//       items: {
//         select: {
//           productId: true,
//           unit: true,
//           quantity: true,
//           price: true,
//           totalPrice: true,
//           product: {
//             select: {
//               name: true,
//               sellingUnits: true,
//             },
//           },
//         },
//       },
//     },
//   });

//   const invoiceIds = debts.map((d) => d.id);

//   // -----------------------------
//   // 2. FETCH MOVEMENTS
//   // -----------------------------
//   const movements = await prisma.stockMovement.findMany({
//     where: { referenceId: { in: invoiceIds } },
//     select: {
//       id: true,
//       productId: true,
//       quantity: true,
//       referenceId: true,

//       warehouse: { select: { id: true, name: true } },

//       inventoryBatch: {
//         select: {
//           id: true,
//           supplier: {
//             select: { id: true, name: true },
//           },
//         },
//       },
//     },
//   });

//   // -----------------------------
//   // 3. GROUP MOVEMENTS (FAST LOOKUP)
//   function groupMovements(movements: any[]) {
//     const map = new Map<string, any>();

//     for (const m of movements) {
//       const key = `${m.referenceId}_${m.productId}_${m.warehouse?.id ?? "no_wh"}_${m.inventoryBatch?.id ?? "no_batch"}`;

//       if (!map.has(key)) {
//         map.set(key, {
//           productId: m.productId,
//           referenceId: m.referenceId,

//           quantity: 0,

//           warehouse: m.warehouse?.name || "بدون مستودع",
//           warehouseId: m.warehouse?.id || null,

//           batchId: m.inventoryBatch?.id || null,
//           supplier: m.inventoryBatch?.supplier?.name || null,
//           supplierId: m.inventoryBatch?.supplier?.id || null,
//         });
//       }

//       map.get(key).quantity += Number(m.quantity);
//     }

//     return Array.from(map.values());
//   }

//   const movementMap = new Map<string, any[]>();

//   for (const m of movements) {
//     const key = `${m.referenceId}_${m.productId}`;

//     if (!movementMap.has(key)) movementMap.set(key, []);
//     movementMap.get(key)!.push(m);
//   }
//   // -----------------------------
//   // 4. BUILD ITEMS PER INVOICE
//   // -----------------------------
//   const itemsByInvoice = new Map<string, SaleItemExpanded[]>();

//   for (const d of debts) {
//     const items: SaleItemExpanded[] = d.items.flatMap((i) => {
//       const key = `${d.id}_${i.productId}`;
//       const related = movementMap.get(key) || [];

//       // fallback
//       if (related.length === 0) {
//         return [
//           {
//             productId: i.productId,
//             product: i.product,

//             quantity: Number(i.quantity),
//             price: Number(i.price),
//             totalPrice: Number(i.totalPrice),

//             unit: i.unit,
//             sellingUnit: i.unit.toString(),

//             warehouse: "بدون مستودع",
//             warehouseId: null,

//             batchId: null,
//             supplier: null,
//             supplierId: null,
//           },
//         ];
//       }

//       // 🔥 GROUP instead of duplicate rows
//       const grouped = groupMovements(related);

//       return grouped.map((m) => ({
//         productId: i.productId,
//         product: i.product,

//         quantity: m.quantity,
//         price: Number(i.price),
//         totalPrice: m.quantity * Number(i.price),

//         unit: i.unit,
//         sellingUnit: i.unit.toString(),

//         warehouse: m.warehouse,
//         warehouseId: m.warehouseId,

//         batchId: m.batchId,
//         supplier: m.supplier,
//         supplierId: m.supplierId,
//       }));
//     });

//     itemsByInvoice.set(d.id, items);
//   }

//   // -----------------------------
//   // 5. RETURNS CHECK
//   // -----------------------------
//   const baseSaleNumbers = debts
//     .filter((s) => s.sale_type === "SALE")
//     .map((s) => s.invoiceNumber.replace("-بيع", "").trim());

//   const existingReturns =
//     baseSaleNumbers.length > 0
//       ? await prisma.invoice.findMany({
//           where: {
//             companyId,
//             sale_type: "RETURN_SALE",
//             OR: baseSaleNumbers.map((b) => ({
//               invoiceNumber: { contains: b },
//             })),
//           },
//           select: { invoiceNumber: true },
//         })
//       : [];

//   const returnedSet = new Set(
//     existingReturns.map((i) =>
//       i.invoiceNumber.replace("-مرتجع", "").replace("-بيع", "").trim(),
//     ),
//   );

//   // -----------------------------
//   // 6. SERIALIZE RESPONSE
//   // -----------------------------
//   const result = debts.map((sale) => {
//     const base = sale.invoiceNumber
//       .replace("-مرتجع", "")
//       .replace("-بيع", "")
//       .trim();

//     return {
//       ...sale,

//       saleItems: itemsByInvoice.get(sale.id) || [],
//       saleNumber: sale.invoiceNumber,

//       totalAmount: Number(sale.totalAmount),
//       amountPaid: Number(sale.amountPaid),
//       amountDue: Number(sale.amountDue),

//       saleDate: sale.invoiceDate.toISOString(),

//       hasReturnSale: returnedSet.has(base),

//       customer: sale.customer
//         ? {
//             ...sale.customer,
//             outstandingBalance: Number(sale.customer.outstandingBalance),
//           }
//         : null,
//     };
//   });

//   return {
//     serilaz: serializeData(result),
//     total: await prisma.invoice.count({ where: combinedWhere }),
//   };
// }
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
