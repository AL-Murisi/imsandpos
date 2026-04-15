"use server";

import prisma from "@/lib/prisma"; // تأكد من مسار prisma client الصحيح
import { Prisma } from "@prisma/client";
import { Currency } from "lucide-react";

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

export async function getCustomerStatement(
  customerId: string,
  companyId: string,

  dateFrom: string,
  dateTo: string,
) {
  try {
    const mappings = await prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
      select: { mapping_type: true, account_id: true },
    });
    const arAccount = mappings.find(
      (m) => m.mapping_type === "accounts_receivable",
    )?.account_id;
    if (!arAccount) {
      return {
        success: false,
        error: "حساب العملاء (المدينون) غير مربوط",
      };
    }

    const fiscalYear = await prisma.fiscal_periods.findFirst({
      where: {
        company_id: companyId,
        is_closed: false,
      },
      select: { start_date: true, end_date: true },
    });
    const fromDate = dateFrom
      ? new Date(dateFrom)
      : fiscalYear
        ? new Date(fiscalYear.start_date)
        : null;
    const toDate = dateTo
      ? new Date(dateTo)
      : fiscalYear
        ? new Date(fiscalYear.end_date)
        : null;

    if (!fromDate || !toDate) {
      return {
        success: false,
        error: "تعذر تحديد الفترة المالية",
      };
    }

    fromDate.setHours(0, 0, 0, 0); // Start of day
    toDate.setHours(23, 59, 59, 999); // End of day

    // 1️⃣ جلب حساب المدينون

    const customer = await prisma.customer.findUnique({
      where: { id: customerId, companyId },
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        city: true,
        phoneNumber: true,
        balance: true,
        outstandingBalance: true,
      },
    });

    if (!customer) {
      return { success: false, error: "العميل غير موجود" };
    }

    const invoiceIds = await prisma.invoice.findMany({
      where: { companyId, customerId },
      select: { id: true },
    });
    const invoiceIdList = invoiceIds.map((i) => i.id);
    const paymentIds = await prisma.financialTransaction.findMany({
      where: {
        companyId,
        customerId,
      },
      select: { id: true },
    });
    const paymentIdList = paymentIds.map((p) => p.id);
    const customerReferenceIds = [
      customerId,
      ...invoiceIdList,
      ...paymentIdList,
    ];

    // 2️⃣ الرصيد الافتتاحي قبل الفترة
    const openingLines = await prisma.journalLine.findMany({
      where: {
        companyId,
        accountId: arAccount,
        header: {
          referenceId: { in: customerReferenceIds },
          entryDate: { lt: fromDate },
        },
      },
      select: {
        debit: true,
        credit: true,
      },
    });

    const openingBalance = openingLines.reduce(
      (sum, e) => sum + Number(e.debit) - Number(e.credit),
      0,
    );

    // 3️⃣ قيود الفترة
    const lines = await prisma.journalLine.findMany({
      where: {
        companyId,
        accountId: arAccount,
        header: {
          referenceId: { in: customerReferenceIds },
          entryDate: { gte: fromDate, lte: toDate },
        },
      },
      orderBy: { header: { entryDate: "asc" } },
      include: {
        header: true,
      },
    });

    const combinedEntries = [
      ...lines.map((entry) => ({
        date: entry.header.entryDate,
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        description: entry.memo ?? entry.header.description,
        docNo: entry.header.entryNumber,
        typeName: mapType(entry.header.referenceType),
      })),
    ].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return aTime - bTime;
    });

    // 4️⃣ بناء كشف الحساب
    let runningBalance = openingBalance;
    const transactions = combinedEntries.map((entry) => {
      runningBalance =
        runningBalance + Number(entry.debit) - Number(entry.credit);

      return {
        date: entry.date,
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        balance: runningBalance,
        description: entry.description,
        docNo: entry.docNo,
        typeName: entry.typeName,
      };
    });
    const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
    const periodDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const periodCredit = transactions.reduce((s, t) => s + t.credit, 0);

    // المنطق للعميل:
    // إذا كان الافتتاحي موجب (مدين) يضاف للمدين، وإذا كان سالب (دائن) يضاف للدائن
    const finalTotalDebit =
      openingBalance > 0 ? periodDebit + openingBalance : periodDebit;
    const finalTotalCredit =
      openingBalance < 0
        ? periodCredit + Math.abs(openingBalance)
        : periodCredit;
    return {
      success: true,
      data: {
        customer: serializeData(customer),
        openingBalance,
        closingBalance: openingBalance + totalDebit - totalCredit,
        totalDebit: finalTotalDebit,
        totalCredit: finalTotalCredit,
        transactions,
        period: {
          from:
            fromDate instanceof Date
              ? fromDate.toLocaleDateString("ar-EG")
              : fromDate,
          to:
            toDate instanceof Date
              ? toDate.toLocaleDateString("ar-EG")
              : toDate,
        },
      },
    };
  } catch (error) {
    console.error("Error loading journal-based statement:", error);
    return { success: false, error: "خطأ في جلب كشف الحساب" };
  }
}
export async function getEmployeerStatement(
  employeer: string,
  companyId: string,

  dateFrom: string,
  dateTo: string,
) {
  try {
    const mappings = await prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
      select: { mapping_type: true, account_id: true },
    });
    const prAccount = mappings.find(
      (m) => m.mapping_type === "payroll_expenses",
    )?.account_id;
    if (!prAccount) {
      return {
        success: false,
        error: "حساب العملاء (المدينون) غير مربوط",
      };
    }

    const fiscalYear = await prisma.fiscal_periods.findFirst({
      where: {
        company_id: companyId,
        is_closed: false,
      },
      select: { start_date: true, end_date: true },
    });
    const fromDate = dateFrom
      ? new Date(dateFrom)
      : fiscalYear
        ? new Date(fiscalYear.start_date)
        : null;
    const toDate = dateTo
      ? new Date(dateTo)
      : fiscalYear
        ? new Date(fiscalYear.end_date)
        : null;

    if (!fromDate || !toDate) {
      return {
        success: false,
        error: "تعذر تحديد الفترة المالية",
      };
    }

    fromDate.setHours(0, 0, 0, 0); // Start of day
    toDate.setHours(23, 59, 59, 999); // End of day

    // 1️⃣ جلب حساب المدينون

    const customer = await prisma.employee.findUnique({
      where: { id: employeer, companyId },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!customer) {
      return { success: false, error: "العميل غير موجود" };
    }

    // const invoiceIds = await prisma.invoice.findMany({
    //   where: { companyId, customerId },
    //   select: { id: true },
    // });
    const paymentIds = await prisma.financialTransaction.findMany({
      where: {
        companyId,
        employeeId: employeer,
      },
      select: { id: true },
    });
    const paymentIdList = paymentIds.map((p) => p.id);
    const customerReferenceIds = [employeer, ...paymentIdList];

    // 2️⃣ الرصيد الافتتاحي قبل الفترة
    const [openingLines] = await Promise.all([
      prisma.journalLine.findMany({
        where: {
          companyId,
          accountId: prAccount,
          header: {
            referenceId: { in: customerReferenceIds },
            entryDate: { lt: fromDate },
          },
        },
        select: {
          debit: true,
          credit: true,
        },
      }),
    ]);

    const openingBalance = openingLines.reduce(
      (sum, e) => sum + Number(e.debit) - Number(e.credit),
      0,
    );

    // 3️⃣ قيود الفترة
    const [lines] = await Promise.all([
      prisma.journalLine.findMany({
        where: {
          companyId,
          accountId: prAccount,
          header: {
            referenceId: { in: customerReferenceIds },
            entryDate: { gte: fromDate, lte: toDate },
          },
        },
        orderBy: { header: { entryDate: "asc" } },
        include: {
          header: true,
        },
      }),
    ]);

    const combinedEntries = [
      ...lines.map((entry) => ({
        date: entry.header.entryDate,
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        description: entry.memo ?? entry.header.description,
        docNo: entry.header.entryNumber,
        typeName: mapType(entry.header.referenceType),
      })),
    ].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return aTime - bTime;
    });

    // 4️⃣ بناء كشف الحساب
    let runningBalance = openingBalance;
    const transactions = combinedEntries.map((entry) => {
      runningBalance = Math.abs(
        runningBalance + Number(entry.debit) - Number(entry.credit),
      );

      return {
        date: entry.date,
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        balance: runningBalance,
        description: entry.description,
        docNo: entry.docNo,
        typeName: entry.typeName,
      };
    });
    const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
    const periodDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const periodCredit = transactions.reduce((s, t) => s + t.credit, 0);

    // المنطق للعميل:
    // إذا كان الافتتاحي موجب (مدين) يضاف للمدين، وإذا كان سالب (دائن) يضاف للدائن
    const finalTotalDebit =
      openingBalance > 0 ? periodDebit + openingBalance : periodDebit;
    const finalTotalCredit =
      openingBalance < 0
        ? periodCredit + Math.abs(openingBalance)
        : periodCredit;
    return {
      success: true,
      data: {
        customer: serializeData(customer),
        openingBalance,
        closingBalance: openingBalance + totalCredit - totalDebit,
        totalDebit: finalTotalDebit,
        totalCredit: finalTotalCredit,
        transactions,
        period: {
          from:
            fromDate instanceof Date
              ? fromDate.toLocaleDateString("ar-EG")
              : fromDate,
          to:
            toDate instanceof Date
              ? toDate.toLocaleDateString("ar-EG")
              : toDate,
        },
      },
    };
  } catch (error) {
    console.error("Error loading journal-based statement:", error);
    return { success: false, error: "خطأ في جلب كشف الحساب" };
  }
}
// 🔍 لتحسين أسماء العمليات حسب نوع القيد
function mapType(ref: string | null) {
  if (!ref) return "عملية";
  if (ref.includes("مدفوع")) return "دفعة";
  if (ref.includes("غير مدفوع")) return "فاتورة غير مدفوعة";
  if (ref.includes("تكلفة")) return "قيد مخزون";
  if (ref.includes("مرتجع")) return "مرتجع";
  return ref;
}

// ===============================
// 5. تصدير كشف الحساب إلى PDF (اختياري)
// ===============================
export async function exportStatementToPDF(
  customerId: string,
  companyId: string,
  dateFrom: string,
  dateTo: string,
) {
  try {
    // يمكنك استخدام مكتبة مثل @react-pdf/renderer أو puppeteer
    // هذا مثال بسيط يرجع البيانات، ويمكنك توليد PDF في الـ frontend
    const statement = await getCustomerStatement(
      customerId,
      companyId,
      dateFrom,
      dateTo,
    );

    // if (!statement.success) {
    //   return statement;
    // }

    // هنا يمكنك إضافة منطق توليد PDF
    // مثال: استخدام puppeteer لتوليد PDF من HTML

    return {
      success: true,
      message: "جاري تحضير ملف PDF...",
      // data: statement.data,
    };
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    return { success: false, error: "فشل في تصدير الملف" };
  }
}

// ===============================
// 6. جلب ملخص حساب العميل
// ===============================
// export async function getCustomerAccountSummary(
//   customerId: string,
//   companyId: string,
// ) {
//   try {
//     // إجمالي المبيعات
//     const totalSalesResult = await prisma.sale.aggregate({
//       where: {
//         customerId,
//         companyId,
//         status: { not: "cancelled" },
//       },
//       _sum: {
//         totalAmount: true,
//         amountPaid: true,
//         amountDue: true,
//       },
//       _count: true,
//     });

//     // إجمالي الدفعات
//     const totalPaymentsResult = await prisma.payment.aggregate({
//       where: {
//         customerId,
//         companyId,
//         status: "completed",
//       },
//       _sum: {
//         amount: true,
//       },
//       _count: true,
//     });

//     // آخر عملية
//     const lastSale = await prisma.sale.findFirst({
//       where: {
//         customerId,
//         companyId,
//         status: { not: "cancelled" },
//       },
//       orderBy: { saleDate: "desc" },
//       select: {
//         saleNumber: true,
//         saleDate: true,
//         totalAmount: true,
//       },
//     });

//     const lastPayment = await prisma.payment.findFirst({
//       where: {
//         customerId,
//         companyId,
//         status: "completed",
//       },
//       orderBy: { createdAt: "desc" },
//       select: {
//         amount: true,
//         createdAt: true,
//         paymentMethod: true,
//       },
//     });

//     return {
//       success: true,
//       data: {
//         totalSales: Number(totalSalesResult._sum.totalAmount || 0),
//         totalPaid: Number(totalPaymentsResult._sum.amount || 0),
//         totalDue: Number(totalSalesResult._sum.amountDue || 0),
//         salesCount: totalSalesResult._count,
//         paymentsCount: totalPaymentsResult._count,
//         lastSale,
//         lastPayment,
//         currentBalance:
//           Number(totalSalesResult._sum.totalAmount || 0) -
//           Number(totalPaymentsResult._sum.amount || 0),
//       },
//     };
//   } catch (error) {
//     console.error("Error fetching account summary:", error);
//     return { success: false, error: "فشل في جلب ملخص الحساب" };
//   }
// }

// ===============================
// 7. جلب أفضل العملاء (Top Customers)
// ===============================
// export async function getTopCustomers(
//   companyId: string,
//   limit: number = 10,
//   dateFrom?: string,
//   dateTo?: string,
// ) {
//   try {
//     const whereClause: any = {
//       companyId,
//       status: { not: "cancelled" },
//     };

//     if (dateFrom && dateTo) {
//       whereClause.saleDate = {
//         gte: new Date(dateFrom),
//         lte: new Date(dateTo),
//       };
//     }

//     const topCustomers = await prisma.sale.groupBy({
//       by: ["customerId"],
//       where: whereClause,
//       _sum: {
//         totalAmount: true,
//       },
//       _count: true,
//       orderBy: {
//         _sum: {
//           totalAmount: "desc",
//         },
//       },
//       take: limit,
//     });

//     // جلب بيانات العملاء
//     const customerIds = topCustomers
//       .map((c) => c.customerId)
//       .filter((id): id is string => id !== null);

//     const customers = await prisma.customer.findMany({
//       where: {
//         id: { in: customerIds },
//         companyId,
//       },
//       select: {
//         id: true,
//         name: true,
//         phoneNumber: true,
//         email: true,
//         outstandingBalance: true,
//       },
//     });

//     const result = topCustomers.map((tc) => {
//       const customer = customers.find((c) => c.id === tc.customerId);
//       return {
//         customer,
//         totalSales: Number(tc._sum.totalAmount || 0),
//         salesCount: tc._count,
//       };
//     });

//     return { success: true, data: result };
//   } catch (error) {
//     console.error("Error fetching top customers:", error);
//     return { success: false, error: "فشل في جلب أفضل العملاء" };
//   }
// }

// Helper: Calculate opening balance for supplier
// async function calculateSupplierOpeningBalance(
//   supplierId: string,
//   companyId: string,
//   dateFrom: Date,
// ) {
//   try {
//     // Get all purchases before the start date
//     const purchasesBeforeDate = await prisma.purchase.findMany({
//       where: {
//         supplierId,
//         companyId,
//         createdAt: { lt: dateFrom },
//         status: { not: "cancelled" },
//       },
//       select: {
//         totalAmount: true,
//         amountPaid: true,
//         amountDue: true,
//         purchaseType: true,
//       },
//     });

//     // Get all supplier payments before the start date
//     const paymentsBeforeDate = await prisma.supplierPayment.findMany({
//       where: {
//         supplierId,
//         companyId,
//         createdAt: { lt: dateFrom },
//       },
//       select: {
//         amount: true,
//       },
//     });

//     // Calculate total purchases (subtract returns)
//     const totalPurchases = purchasesBeforeDate.reduce((sum, purchase) => {
//       const amount = Number(purchase.totalAmount);
//       return purchase.purchaseType === "return" ? sum - amount : sum + amount;
//     }, 0);

//     // Calculate total payments
//     const totalPayments = paymentsBeforeDate.reduce(
//       (sum, payment) => sum + Number(payment.amount),
//       0,
//     );
//     console.log(totalPayments, totalPurchases);

//     // Opening balance = Purchases - Payments (what we owe the supplier)
//     return totalPurchases - totalPayments;
//   } catch (error) {
//     console.error("Error calculating supplier opening balance:", error);
//     return 0;
//   }
// }

// Main function: Get supplier statement
export async function getSupplierStatement(
  supplierId: string,
  companyId: string,
  dateFrom: string,
  dateTo: string,
) {
  try {
    const mappings = await prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
      select: { mapping_type: true, account_id: true },
    });
    const apAccount = mappings.find(
      (m) => m.mapping_type === "accounts_payable",
    )?.account_id;
    if (!apAccount) {
      return {
        success: false,
        error: "حساب الموردين (الدائنون) غير مربوط",
      };
    }

    const fiscalYear = await prisma.fiscal_periods.findFirst({
      where: {
        company_id: companyId,
        is_closed: false,
      },
      select: { start_date: true, end_date: true },
    });
    const fromDate = fiscalYear?.start_date ?? "";
    const toDate = fiscalYear?.end_date ?? "";

    // 1️⃣ جلب حساب المدينون

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId, companyId },
      select: {
        id: true,
        name: true,
        email: true,
        address: true,
        city: true,
        phoneNumber: true,
        totalPurchased: true,
        totalPaid: true,
        outstandingBalance: true,
      },
    });

    if (!supplier) {
      return { success: false, error: "المورد غير موجود" };
    }

    // 2️⃣ الرصيد الافتتاحي قبل الفترة
    const supplierInvoiceIds = await prisma.invoice.findMany({
      where: { companyId, supplierId, sale_type: "PURCHASE" },
      select: { id: true },
    });

    const supplierPaymentIds = await prisma.financialTransaction.findMany({
      where: { companyId, supplierId },
      select: { id: true },
    });

    const supplierReferenceIds = [
      supplierId,
      ...supplierInvoiceIds.map((invoice) => invoice.id),
      ...supplierPaymentIds.map((payment) => payment.id),
    ];

    const openingEntries = await prisma.journalLine.findMany({
      where: {
        companyId,
        accountId: apAccount,
        header: {
          referenceId: { in: supplierReferenceIds },
          entryDate: { lt: fromDate },
        },
      },
      select: {
        debit: true,
        credit: true,
      },
    });

    const openingBalance = openingEntries.reduce(
      (sum, e) => sum + Number(e.credit) - Number(e.debit),
      0,
    );

    // 3️⃣ قيود الفترة
    const entries = await prisma.journalLine.findMany({
      where: {
        companyId,
        accountId: apAccount,
        header: {
          referenceId: { in: supplierReferenceIds },
          entryDate: { gte: fromDate, lte: toDate },
        },
      },
      orderBy: { header: { entryDate: "asc" } },
      include: {
        header: true,
      },
    });

    const combinedEntries = [
      ...entries.map((entry) => ({
        date: entry.header.entryDate,
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        description: entry.memo ?? entry.header.description,
        docNo: entry.header.entryNumber,
        Currency: entry.currencyCode,
        typeName: mapType(entry.header.referenceType),
      })),
    ].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return aTime - bTime;
    });

    // 4?????? ???????? ?????? ????????????
    let runningBalance = openingBalance;
    const transactions = combinedEntries.map((entry) => {
      runningBalance =
        runningBalance + Number(entry.credit) - Number(entry.debit);

      return {
        date: entry.date,
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        balance: runningBalance,
        description: entry.description,
        docNo: entry.docNo,
        Currency: entry.Currency,
        typeName: entry.typeName,
      };
    });
    const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
    const periodDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const periodCredit = transactions.reduce((s, t) => s + t.credit, 0);

    // المنطق المطلوب: إضافة الرصيد الافتتاحي للإجمالي المناسب بناءً على حالته
    // إذا كان الرصيد الافتتاحي موجب (Credit) يضاف للدائن، وإذا كان سالب (Debit) يضاف للمدين
    const finalTotalDebit =
      openingBalance < 0 ? periodDebit + Math.abs(openingBalance) : periodDebit;
    const finalTotalCredit =
      openingBalance > 0 ? periodCredit + openingBalance : periodCredit;
    return {
      success: true,
      data: {
        supplier: serializeData(supplier),
        openingBalance,
        closingBalance: openingBalance + totalCredit - totalDebit,
        totalDebit: finalTotalDebit,
        totalCredit: finalTotalCredit,
        transactions,
        period: { from: dateFrom, to: dateTo },
      },
    };
  } catch (error) {
    console.error("Error loading journal-based statement:", error);
    return { success: false, error: "خطأ في جلب كشف الحساب" };
  }
}
export async function getBankStatement(
  id: string,
  companyId: string,
  dateFrom: string,
  dateTo: string,
) {
  try {
    const fiscalYear = await prisma.fiscal_periods.findFirst({
      where: {
        company_id: companyId,
        is_closed: false,
      },
      select: { start_date: true, end_date: true },
    });
    if (!fiscalYear) return;
    console.log(fiscalYear.start_date, fiscalYear.end_date);
    const fromDate = new Date(fiscalYear.start_date);
    fromDate.setHours(0, 0, 0, 0); // Start of day

    const toDate = new Date(fiscalYear.end_date);
    toDate.setHours(23, 59, 59, 999); // End of day

    // 1️⃣ جلب حساب المدينون

    const bank = await prisma.bank.findFirst({
      where: { accountId: id, companyId },
      select: {
        id: true,
        name: true,
        accountNumber: true,
        account: { select: { opening_balance: true } },
      },
    });
    const openingEntries = await prisma.journalLine.findMany({
      where: {
        companyId,
        accountId: id,
        header: {
          entryDate: { lt: fromDate },
        },
      },
      select: {
        debit: true,
        credit: true,
      },
    });
    const openingBalance = openingEntries.reduce(
      (sum, e) => sum + Number(e.debit) - Number(e.credit),
      0,
    );
    if (!bank) {
      return { success: false, error: "المورد غير موجود" };
    }

    // 2️⃣ الرصيد الافتتاحي قبل الفترة

    // 3️⃣ قيود الفترة
    const entries = await prisma.journalLine.findMany({
      where: {
        companyId,
        accountId: id,
        header: {
          entryDate: { gte: fromDate, lte: toDate },
        },
      },
      orderBy: { header: { entryDate: "asc" } },
      include: {
        header: true,
      },
    });

    // 4️⃣ بناء كشف الحساب
    let runningBalance = openingBalance;
    const transactions = entries.map((entry) => {
      runningBalance =
        runningBalance + Number(entry.debit) - Number(entry.credit);

      return {
        date: entry.header.entryDate,
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        balance: runningBalance,
        description: entry.memo ?? entry.header.description,
        docNo: entry.header.entryNumber,
        typeName: mapType(entry.header.referenceType),
      };
    });
    const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
    const periodDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const periodCredit = transactions.reduce((s, t) => s + t.credit, 0);

    return {
      success: true,
      data: {
        bank: serializeData(bank),
        openingBalance,
        closingBalance: openingBalance + totalDebit - totalCredit,
        totalDebit: periodDebit,
        totalCredit: periodCredit,
        transactions,
        period: { from: dateFrom, to: dateTo },
      },
    };
  } catch (error) {
    console.error("Error loading journal-based statement:", error);
    return { success: false, error: "خطأ في جلب كشف الحساب" };
  }
}

// ============================================
// 1️⃣ CLOSE FISCAL YEAR
// ============================================

export async function closeFiscalYear(
  companyId: string,
  fiscalYearId: string,
  userId: string,
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get fiscal year details
      const fiscalYear = await tx.fiscal_periods.findUnique({
        where: { id: fiscalYearId },
        select: {
          id: true,
          period_name: true,
          start_date: true,
          end_date: true,
          is_closed: true,
        },
      });

      if (!fiscalYear) {
        throw new Error("السنة المالية غير موجودة");
      }

      if (fiscalYear.is_closed) {
        throw new Error("السنة المالية مغلقة بالفعل");
      }

      // 2. Get all accounts and their current balances
      const accounts = await tx.accounts.findMany({
        where: { company_id: companyId },
        select: {
          id: true,
          account_name_ar: true,
          account_name_en: true,
          account_type: true,
          balance: true,
        },
      });

      // 3. Get all customers with balances
      const customers = await tx.customer.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          outstandingBalance: true,
          balance: true,
        },
      });

      // 4. Get all suppliers with balances
      const suppliers = await tx.supplier.findMany({
        where: { companyId },
        select: {
          id: true,
          name: true,
          outstandingBalance: true,
          totalPaid: true,
          totalPurchased: true,
        },
      });

      // 5. Close current fiscal year
      await tx.fiscal_periods.update({
        where: { id: fiscalYearId },
        data: {
          is_closed: true,
          closed_by: userId,
          closed_at: new Date(),
        },
      });

      // 6. Create closing entries for income statement accounts
      const closingEntries = await createClosingEntries(
        tx,
        companyId,
        accounts,
        fiscalYear.end_date,
        fiscalYear.period_name,
        userId,
      );

      // 7. Store opening balances as journal entries for next year
      const nextYearStart = new Date(fiscalYear.end_date);
      nextYearStart.setDate(nextYearStart.getDate() + 1);

      const openingEntries = await storeOpeningBalancesAsJournalEntries(
        tx,
        companyId,
        accounts,
        customers,
        suppliers,
        nextYearStart,
        userId,
      );

      return {
        success: true,
        message: "تم إغلاق السنة المالية بنجاح",
        closingEntries: closingEntries.length,
        openingEntries: openingEntries.length,
      };
    });

    return result;
  } catch (error: any) {
    console.error("Error closing fiscal year:", error);
    return { success: false, error: error.message };
  }
}

// ============================================
// 2️⃣ CREATE CLOSING ENTRIES
// ============================================
async function createClosingEntries(
  tx: any,
  companyId: string,
  accounts: any[],
  closingDate: Date,
  fiscalPeriod: string,
  userId: string,
) {
  const mappings = await tx.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
  });

  const getAcc = (type: string) =>
    mappings.find((m: any) => m.mapping_type === type)?.account_id;

  const retainedEarningsAcc = getAcc("retained_earnings");
  if (!retainedEarningsAcc) {
    throw new Error("حساب الأرباح المحتجزة غير موجود");
  }

  const entryBase = `CLOSE-${new Date().getFullYear()}-${Date.now()}`;
  const entries: any[] = [];

  // Revenue accounts (credit balance) - close to retained earnings
  const revenueAccounts = accounts.filter((a) => a.account_type === "REVENUE");

  for (const acc of revenueAccounts) {
    const balance = Number(acc.balance);
    if (balance !== 0) {
      // Debit revenue (close it)
      entries.push({
        company_id: companyId,
        account_id: acc.id,
        description: `قيد إقفال حساب ${acc.account_name_ar || acc.account_name_en}`,
        debit: Math.abs(balance),
        credit: 0,
        entry_date: closingDate,
        fiscal_period: fiscalPeriod,
        reference_type: "إقفال سنة مالية - إيرادات",
        entry_number: `${entryBase}-REV-${acc.id.slice(0, 6)}`,
        created_by: userId,
        is_automated: true,
        is_posted: true,
      });

      // Credit retained earnings
      entries.push({
        company_id: companyId,
        account_id: retainedEarningsAcc,
        description: `إقفال إيرادات إلى الأرباح المحتجزة`,
        debit: 0,
        credit: Math.abs(balance),
        entry_date: closingDate,
        fiscal_period: fiscalPeriod,
        reference_type: "إقفال سنة مالية - إيرادات",
        entry_number: `${entryBase}-REV-RE-${acc.id.slice(0, 6)}`,
        created_by: userId,
        is_automated: true,
        is_posted: true,
      });
    }
  }

  // Expense accounts (debit balance) - close to retained earnings
  const expenseAccounts = accounts.filter(
    (a) => a.account_type === "EXPENSE" || a.account_type === "COST_OF_GOODS",
  );

  for (const acc of expenseAccounts) {
    const balance = Number(acc.balance);
    if (balance !== 0) {
      // Credit expense (close it)
      entries.push({
        company_id: companyId,
        account_id: acc.id,
        description: `قيد إقفال حساب ${acc.account_name_ar || acc.account_name_en}`,
        debit: 0,
        credit: Math.abs(balance),
        entry_date: closingDate,
        fiscal_period: fiscalPeriod,
        reference_type: "إقفال سنة مالية - مصروفات",
        entry_number: `${entryBase}-EXP-${acc.id.slice(0, 6)}`,
        created_by: userId,
        is_automated: true,
        is_posted: true,
      });

      // Debit retained earnings
      entries.push({
        company_id: companyId,
        account_id: retainedEarningsAcc,
        description: `إقفال مصروفات من الأرباح المحتجزة`,
        debit: Math.abs(balance),
        credit: 0,
        entry_date: closingDate,
        fiscal_period: fiscalPeriod,
        reference_type: "إقفال سنة مالية - مصروفات",
        entry_number: `${entryBase}-EXP-RE-${acc.id.slice(0, 6)}`,
        created_by: userId,
        is_automated: true,
        is_posted: true,
      });
    }
  }

  // Insert all closing entries
  if (entries.length > 0) {
    await tx.journal_entries.createMany({ data: entries });

    // Reset income statement accounts to zero
    for (const acc of [...revenueAccounts, ...expenseAccounts]) {
      if (Number(acc.balance) !== 0) {
        await tx.accounts.update({
          where: { id: acc.id },
          data: { balance: 0 },
        });
      }
    }
  }

  return entries;
}

// ============================================
// 3️⃣ STORE OPENING BALANCES AS JOURNAL ENTRIES
// ============================================
async function storeOpeningBalancesAsJournalEntries(
  tx: any,
  companyId: string,
  accounts: any[],
  customers: any[],
  suppliers: any[],
  openingDate: Date,
  userId: string,
) {
  const entryBase = `OPEN-${new Date().getFullYear()}-${Date.now()}`;
  const entries: any[] = [];

  // Get account mappings
  const mappings = await tx.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
  });

  const getAcc = (type: string) =>
    mappings.find((m: any) => m.mapping_type === type)?.account_id;

  const arAccount = getAcc("accounts_receivable");
  const apAccount = getAcc("accounts_payable");

  // 1. Store account opening balances (Balance Sheet accounts only)
  const balanceSheetAccounts = accounts.filter(
    (a) =>
      ["ASSET", "LIABILITY", "EQUITY"].includes(a.account_type) &&
      Number(a.balance) !== 0,
  );

  for (const acc of balanceSheetAccounts) {
    const balance = Number(acc.balance);
    const isDebitNormal = ["ASSET"].includes(acc.account_type);

    entries.push({
      company_id: companyId,
      account_id: acc.id,
      description: `رصيد افتتاحي - ${acc.account_name_ar || acc.account_name_en}`,
      debit: isDebitNormal ? Math.abs(balance) : 0,
      credit: !isDebitNormal ? Math.abs(balance) : 0,
      entry_date: openingDate,
      reference_type: "رصيد افتتاحي حساب",
      entry_number: `${entryBase}-ACC-${acc.id.slice(0, 6)}`,
      created_by: userId,
      is_automated: true,
      is_posted: true,
    });
  }

  // 2. Store customer opening balances
  if (arAccount) {
    for (const customer of customers) {
      const outstanding = Number(customer.outstandingBalance || 0);
      const balance = Number(customer.balance || 0);

      // Customer owes us (debit AR)
      if (outstanding > 0) {
        entries.push({
          company_id: companyId,
          account_id: arAccount,
          description: `رصيد افتتاحي عميل - ${customer.name} (مديونية)`,
          debit: outstanding,
          credit: 0,
          entry_date: openingDate,
          reference_type: "opening_customer_balance",
          reference_id: customer.id,
          entry_number: `${entryBase}-CUST-D-${customer.id.slice(0, 6)}`,
          created_by: userId,
          is_automated: true,
          is_posted: true,
        });
      }

      // We owe customer (credit AR - customer credit/advance)
      if (balance > 0) {
        entries.push({
          company_id: companyId,
          account_id: arAccount,
          description: `رصيد افتتاحي عميل - ${customer.name} (رصيد لصالح العميل)`,
          debit: 0,
          credit: balance,
          entry_date: openingDate,
          reference_type: "opening_customer_balance",
          reference_id: customer.id,
          entry_number: `${entryBase}-CUST-C-${customer.id.slice(0, 6)}`,
          created_by: userId,
          is_automated: true,
          is_posted: true,
        });
      }
    }
  }

  // 3. Store supplier opening balances
  if (apAccount) {
    for (const supplier of suppliers) {
      const outstanding = Number(supplier.outstandingBalance || 0);

      // We owe supplier (credit AP)
      if (outstanding > 0) {
        entries.push({
          company_id: companyId,
          account_id: apAccount,
          description: `رصيد افتتاحي مورد - ${supplier.name}`,
          debit: 0,
          credit: outstanding,
          entry_date: openingDate,
          reference_type: "opening_supplier_balance",
          reference_id: supplier.id,
          entry_number: `${entryBase}-SUPP-${supplier.id.slice(0, 6)}`,
          created_by: userId,
          is_automated: true,
          is_posted: true,
        });
      }
    }
  }

  // Insert all opening entries
  if (entries.length > 0) {
    await tx.journal_entries.createMany({ data: entries });
  }

  return entries;
}
// 1. Close 2024 fiscal year
// await closeFiscalYear(
//   companyId,
//   "fiscal-year-2024-id",
//   userId
// );

// // 2. Open 2025 fiscal year
// await openNewFiscalYear(
//   companyId,
//   "2025",
//   new Date("2025-01-01"),
//   new Date("2025-12-31"),
//   userId
// );

// // 3. Get statements (works across fiscal years)
// const customerStatement = await getCustomerStatement(
//   customerId,
//   companyId,
//   "2025-01-01",
//   "2025-12-31"
// );
// ============================================
// 4️⃣ OPEN NEW FISCAL YEAR
// ============================================
export async function openNewFiscalYear(
  companyId: string,
  periodName: string,
  startDate: Date,
  endDate: Date,
  userId: string,
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check if period already exists
      const existing = await tx.fiscal_periods.findUnique({
        where: {
          company_id_period_name: {
            company_id: companyId,
            period_name: periodName,
          },
        },
      });

      if (existing) {
        throw new Error("السنة المالية موجودة بالفعل");
      }

      // Create new fiscal year
      const newFiscalYear = await tx.fiscal_periods.create({
        data: {
          company_id: companyId,
          period_name: periodName,
          start_date: startDate,
          end_date: endDate,
          is_closed: false,
        },
      });

      return {
        success: true,
        message: "تم فتح السنة المالية الجديدة بنجاح",
        fiscalYear: newFiscalYear,
      };
    });

    return result;
  } catch (error: any) {
    console.error("Error opening fiscal year:", error);
    return { success: false, error: error.message };
  }
}

// ============================================
// 5️⃣ FIXED CUSTOMER STATEMENT
// ============================================
// export async function getCustomerStatement(
//   customerId: string,
//   companyId: string,
//   dateFrom: string,
//   dateTo: string
// ) {
//   try {
//     const fromDate = new Date(dateFrom);
//     const toDate = new Date(dateTo);
//     toDate.setHours(23, 59, 59, 999);

//     const customer = await prisma.customer.findUnique({
//       where: { id: customerId, companyId },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         address: true,
//         city: true,
//         phoneNumber: true,
//         balance: true,
//         outstandingBalance: true,
//       },
//     });

//     if (!customer) {
//       return { success: false, error: "العميل غير موجود" };
//     }

//     // Calculate opening balance from journal entries before period
//     const openingEntries = await prisma.journal_entries.findMany({
//       where: {
//         company_id: companyId,
//         reference_id: customerId,
//         entry_date: { lt: fromDate },
//       },
//       select: { debit: true, credit: true },
//     });

//     const openingBalance = openingEntries.reduce(
//       (sum, e) => sum + Number(e.debit) - Number(e.credit),
//       0
//     );

//     // Get period entries
//     const entries = await prisma.journal_entries.findMany({
//       where: {
//         company_id: companyId,
//         reference_id: customerId,
//         entry_date: { gte: fromDate, lte: toDate },
//       },
//       orderBy: { entry_date: "asc" },
//       select: {
//         id: true,
//         entry_date: true,
//         debit: true,
//         credit: true,
//         description: true,
//         entry_number: true,
//         reference_type: true,
//       },
//     });

//     // Build statement with running balance
//     let runningBalance = openingBalance;
//     const transactions = entries.map((entry) => {
//       const debit = Number(entry.debit);
//       const credit = Number(entry.credit);

//       runningBalance = runningBalance + debit - credit;

//       return {
//         date: entry.entry_date,
//         debit,
//         credit,
//         balance: runningBalance,
//         description: entry.description,
//         docNo: entry.entry_number,
//         typeName: mapType(entry.reference_type),
//       };
//     });

//     const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
//     const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
//     const closingBalance = openingBalance + totalDebit - totalCredit;

//     return {
//       success: true,
//       data: {
//         customer: serializeData(customer),
//         openingBalance: Number(openingBalance.toFixed(2)),
//         closingBalance: Number(closingBalance.toFixed(2)),
//         totalDebit: Number(totalDebit.toFixed(2)),
//         totalCredit: Number(totalCredit.toFixed(2)),
//         transactions: transactions.map(t => ({
//           ...t,
//           balance: Number(Number(t.balance).toFixed(2)),
//         })),
//         period: { from: dateFrom, to: dateTo },
//       },
//     };
//   } catch (error) {
//     console.error("Error loading customer statement:", error);
//     return { success: false, error: "خطأ في جلب كشف الحساب" };
//   }
// }

// // ============================================
// // 6️⃣ SUPPLIER STATEMENT
// // ============================================
// export async function getSupplierStatement(
//   supplierId: string,
//   companyId: string,
//   dateFrom: string,
//   dateTo: string
// ) {
//   try {
//     const fromDate = new Date(dateFrom);
//     const toDate = new Date(dateTo);
//     toDate.setHours(23, 59, 59, 999);

//     const supplier = await prisma.supplier.findUnique({
//       where: { id: supplierId, companyId },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         address: true,
//         city: true,
//         phoneNumber: true,
//         totalPurchased: true,
//         totalPaid: true,
//         outstandingBalance: true,
//       },
//     });

//     if (!supplier) {
//       return { success: false, error: "المورد غير موجود" };
//     }

//     // Calculate opening balance from journal entries before period
//     const openingEntries = await prisma.journal_entries.findMany({
//       where: {
//         company_id: companyId,
//         reference_id: supplierId,
//         entry_date: { lt: fromDate },
//       },
//       select: { debit: true, credit: true },
//     });

//     // For suppliers: Credit - Debit (we owe them)
//     const openingBalance = openingEntries.reduce(
//       (sum, e) => sum + Number(e.credit) - Number(e.debit),
//       0
//     );

//     // Get period entries
//     const entries = await prisma.journal_entries.findMany({
//       where: {
//         company_id: companyId,
//         reference_id: supplierId,
//         entry_date: { gte: fromDate, lte: toDate },
//       },
//       orderBy: { entry_date: "asc" },
//       select: {
//         id: true,
//         entry_date: true,
//         debit: true,
//         credit: true,
//         description: true,
//         entry_number: true,
//         currency_code: true,
//         reference_type: true,
//       },
//     });

//     // Build statement
//     let runningBalance = openingBalance;
//     const transactions = entries.map((entry) => {
//       const debit = Number(entry.debit);
//       const credit = Number(entry.credit);

//       runningBalance = runningBalance + credit - debit;

//       return {
//         date: entry.entry_date,
//         debit,
//         credit,
//         balance: runningBalance,
//         description: entry.description,
//         docNo: entry.entry_number,
//         Currency: entry.currency_code || "YER",
//         typeName: mapType(entry.reference_type),
//       };
//     });

//     const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
//     const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
//     const closingBalance = openingBalance + totalCredit - totalDebit;

//     return {
//       success: true,
//       data: {
//         supplier: serializeData(supplier),
//         openingBalance: Number(openingBalance.toFixed(2)),
//         closingBalance: Number(closingBalance.toFixed(2)),
//         totalDebit: Number(totalDebit.toFixed(2)),
//         totalCredit: Number(totalCredit.toFixed(2)),
//         transactions: transactions.map(t => ({
//           ...t,
//           balance: Number(Number(t.balance).toFixed(2)),
//         })),
//         period: { from: dateFrom, to: dateTo },
//       },
//     };
//   } catch (error) {
//     console.error("Error loading supplier statement:", error);
//     return { success: false, error: "خطأ في جلب كشف الحساب" };
//   }
// }

// // ============================================
// // 7️⃣ BANK STATEMENT
// // ============================================
// export async function getBankStatement(
//   accountId: string,
//   companyId: string,
//   dateFrom: string,
//   dateTo: string
// ) {
//   try {
//     const fromDate = new Date(dateFrom);
//     const toDate = new Date(dateTo);
//     toDate.setHours(23, 59, 59, 999);

//     const bank = await prisma.bank.findFirst({
//       where: { accountId, companyId },
//       select: {
//         id: true,
//         name: true,
//         accountNumber: true,
//         accountId: true,
//         account: {
//           select: {
//             opening_balance: true,
//             account_type: true,
//           },
//         },
//       },
//     });

//     if (!bank) {
//       return { success: false, error: "الحساب البنكي غير موجود" };
//     }

//     // Calculate opening balance
//     const openingEntries = await prisma.journal_entries.findMany({
//       where: {
//         company_id: companyId,
//         account_id: accountId,
//         entry_date: { lt: fromDate },
//       },
//       select: { debit: true, credit: true },
//     });

//     const calculatedOpening = openingEntries.reduce(
//       (sum, e) => sum + Number(e.debit) - Number(e.credit),
//       0
//     );

//     const openingBalance =
//       calculatedOpening !== 0
//         ? calculatedOpening
//         : Number(bank.account.opening_balance || 0);

//     // Get period entries
//     const entries = await prisma.journal_entries.findMany({
//       where: {
//         company_id: companyId,
//         account_id: accountId,
//         entry_date: { gte: fromDate, lte: toDate },
//       },
//       orderBy: { entry_date: "asc" },
//       select: {
//         id: true,
//         entry_date: true,
//         debit: true,
//         credit: true,
//         description: true,
//         entry_number: true,
//         reference_type: true,
//       },
//     });

//     // Build statement
//     let runningBalance = openingBalance;
//     const transactions = entries.map((entry) => {
//       const debit = Number(entry.debit);
//       const credit = Number(entry.credit);

//       runningBalance = runningBalance + debit - credit;

//       return {
//         date: entry.entry_date,
//         debit,
//         credit,
//         balance: runningBalance,
//         description: entry.description,
//         docNo: entry.entry_number,
//         typeName: mapType(entry.reference_type),
//       };
//     });

//     const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
//     const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);
//     const closingBalance = openingBalance + totalDebit - totalCredit;

//     return {
//       success: true,
//       data: {
//         bank: serializeData(bank),
//         openingBalance: Number(openingBalance.toFixed(2)),
//         closingBalance: Number(closingBalance.toFixed(2)),
//         totalDebit: Number(totalDebit.toFixed(2)),
//         totalCredit: Number(totalCredit.toFixed(2)),
//         transactions: transactions.map(t => ({
//           ...t,
//           balance: Number(Number(t.balance).toFixed(2)),
//         })),
//         period: { from: dateFrom, to: dateTo },
//       },
//     };
//   } catch (error) {
//     console.error("Error loading bank statement:", error);
//     return { success: false, error: "خطأ في جلب كشف الحساب البنكي" };
//   }
// }

// // ============================================
// // HELPER FUNCTIONS
// // ============================================
// function mapType(ref: string | null) {
//   if (!ref) return "عملية";
//   if (ref.includes("opening")) return "رصيد افتتاحي";
//   if (ref.includes("إقفال")) return "قيد إقفال";
//   if (ref.includes("مدفوع")) return "دفعة";
//   if (ref.includes("غير مدفوع")) return "فاتورة غير مدفوعة";
//   if (ref.includes("تكلفة")) return "قيد مخزون";
//   if (ref.includes("مرتجع")) return "مرتجع";
//   return ref;
// }

// function serializeData(obj: any) {
//   return JSON.parse(
//     JSON.stringify(obj, (_k, v) => (typeof v === "bigint" ? Number(v) : v))
//   );
// }
