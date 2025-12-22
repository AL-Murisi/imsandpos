"use server";

import prisma from "@/lib/prisma"; // تأكد من مسار prisma client الصحيح
import { Prisma } from "@prisma/client";

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
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

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

    // 2️⃣ الرصيد الافتتاحي قبل الفترة
    const openingEntries = await prisma.journal_entries.findMany({
      where: {
        company_id: companyId,
        reference_id: customerId,
        entry_date: { lt: fromDate },
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

    // 3️⃣ قيود الفترة
    const entries = await prisma.journal_entries.findMany({
      where: {
        company_id: companyId,
        reference_id: customerId,
        entry_date: { gte: fromDate, lte: toDate },
      },
      orderBy: { entry_date: "asc" },
      select: {
        id: true,
        entry_date: true,
        debit: true,
        credit: true,
        description: true,
        entry_number: true,
        reference_type: true,
      },
    });

    // 4️⃣ بناء كشف الحساب
    let runningBalance = openingBalance;
    const transactions = entries.map((entry) => {
      runningBalance = Math.abs(
        runningBalance + Number(entry.debit) - Number(entry.credit),
      );

      return {
        date: entry.entry_date,
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        balance: runningBalance,
        description: entry.description,
        docNo: entry.entry_number,
        typeName: mapType(entry.reference_type),
      };
    });
    const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);

    return {
      success: true,
      data: {
        customer: serializeData(customer),
        openingBalance,
        closingBalance: Math.abs(openingBalance + totalDebit - totalCredit),
        totalDebit,
        totalCredit,
        transactions,
        period: { from: dateFrom, to: dateTo },
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

    if (!statement.success) {
      return statement;
    }

    // هنا يمكنك إضافة منطق توليد PDF
    // مثال: استخدام puppeteer لتوليد PDF من HTML

    return {
      success: true,
      message: "جاري تحضير ملف PDF...",
      data: statement.data,
    };
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    return { success: false, error: "فشل في تصدير الملف" };
  }
}

// ===============================
// 6. جلب ملخص حساب العميل
// ===============================
export async function getCustomerAccountSummary(
  customerId: string,
  companyId: string,
) {
  try {
    // إجمالي المبيعات
    const totalSalesResult = await prisma.sale.aggregate({
      where: {
        customerId,
        companyId,
        status: { not: "cancelled" },
      },
      _sum: {
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
      },
      _count: true,
    });

    // إجمالي الدفعات
    const totalPaymentsResult = await prisma.payment.aggregate({
      where: {
        customerId,
        companyId,
        status: "completed",
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // آخر عملية
    const lastSale = await prisma.sale.findFirst({
      where: {
        customerId,
        companyId,
        status: { not: "cancelled" },
      },
      orderBy: { saleDate: "desc" },
      select: {
        saleNumber: true,
        saleDate: true,
        totalAmount: true,
      },
    });

    const lastPayment = await prisma.payment.findFirst({
      where: {
        customerId,
        companyId,
        status: "completed",
      },
      orderBy: { createdAt: "desc" },
      select: {
        amount: true,
        createdAt: true,
        paymentMethod: true,
      },
    });

    return {
      success: true,
      data: {
        totalSales: Number(totalSalesResult._sum.totalAmount || 0),
        totalPaid: Number(totalPaymentsResult._sum.amount || 0),
        totalDue: Number(totalSalesResult._sum.amountDue || 0),
        salesCount: totalSalesResult._count,
        paymentsCount: totalPaymentsResult._count,
        lastSale,
        lastPayment,
        currentBalance:
          Number(totalSalesResult._sum.totalAmount || 0) -
          Number(totalPaymentsResult._sum.amount || 0),
      },
    };
  } catch (error) {
    console.error("Error fetching account summary:", error);
    return { success: false, error: "فشل في جلب ملخص الحساب" };
  }
}

// ===============================
// 7. جلب أفضل العملاء (Top Customers)
// ===============================
export async function getTopCustomers(
  companyId: string,
  limit: number = 10,
  dateFrom?: string,
  dateTo?: string,
) {
  try {
    const whereClause: any = {
      companyId,
      status: { not: "cancelled" },
    };

    if (dateFrom && dateTo) {
      whereClause.saleDate = {
        gte: new Date(dateFrom),
        lte: new Date(dateTo),
      };
    }

    const topCustomers = await prisma.sale.groupBy({
      by: ["customerId"],
      where: whereClause,
      _sum: {
        totalAmount: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          totalAmount: "desc",
        },
      },
      take: limit,
    });

    // جلب بيانات العملاء
    const customerIds = topCustomers
      .map((c) => c.customerId)
      .filter((id): id is string => id !== null);

    const customers = await prisma.customer.findMany({
      where: {
        id: { in: customerIds },
        companyId,
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        outstandingBalance: true,
      },
    });

    const result = topCustomers.map((tc) => {
      const customer = customers.find((c) => c.id === tc.customerId);
      return {
        customer,
        totalSales: Number(tc._sum.totalAmount || 0),
        salesCount: tc._count,
      };
    });

    return { success: true, data: result };
  } catch (error) {
    console.error("Error fetching top customers:", error);
    return { success: false, error: "فشل في جلب أفضل العملاء" };
  }
}

// Helper: Calculate opening balance for supplier
async function calculateSupplierOpeningBalance(
  supplierId: string,
  companyId: string,
  dateFrom: Date,
) {
  try {
    // Get all purchases before the start date
    const purchasesBeforeDate = await prisma.purchase.findMany({
      where: {
        supplierId,
        companyId,
        createdAt: { lt: dateFrom },
        status: { not: "cancelled" },
      },
      select: {
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        purchaseType: true,
      },
    });

    // Get all supplier payments before the start date
    const paymentsBeforeDate = await prisma.supplierPayment.findMany({
      where: {
        supplierId,
        companyId,
        createdAt: { lt: dateFrom },
      },
      select: {
        amount: true,
      },
    });

    // Calculate total purchases (subtract returns)
    const totalPurchases = purchasesBeforeDate.reduce((sum, purchase) => {
      const amount = Number(purchase.totalAmount);
      return purchase.purchaseType === "return" ? sum - amount : sum + amount;
    }, 0);

    // Calculate total payments
    const totalPayments = paymentsBeforeDate.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    console.log(totalPayments, totalPurchases);

    // Opening balance = Purchases - Payments (what we owe the supplier)
    return totalPurchases - totalPayments;
  } catch (error) {
    console.error("Error calculating supplier opening balance:", error);
    return 0;
  }
}

// Main function: Get supplier statement
export async function getSupplierStatement(
  supplierId: string,
  companyId: string,
  dateFrom: string,
  dateTo: string,
) {
  try {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

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
    const openingEntries = await prisma.journal_entries.findMany({
      where: {
        company_id: companyId,
        reference_id: supplierId,
        entry_date: { lt: fromDate },
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

    // 3️⃣ قيود الفترة
    const entries = await prisma.journal_entries.findMany({
      where: {
        company_id: companyId,
        reference_id: supplierId,
        entry_date: { gte: fromDate, lte: toDate },
      },
      orderBy: { entry_date: "asc" },
      select: {
        id: true,
        entry_date: true,
        debit: true,
        credit: true,
        description: true,
        entry_number: true,
        reference_type: true,
      },
    });

    // 4️⃣ بناء كشف الحساب
    let runningBalance = openingBalance;
    const transactions = entries.map((entry) => {
      runningBalance =
        runningBalance + Number(entry.debit) - Number(entry.credit);

      return {
        date: entry.entry_date,
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        balance: runningBalance,
        description: entry.description,
        docNo: entry.entry_number,
        typeName: mapType(entry.reference_type),
      };
    });
    const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);

    return {
      success: true,
      data: {
        supplier: serializeData(supplier),
        openingBalance,
        closingBalance: openingBalance + totalDebit - totalCredit,
        totalDebit,
        totalCredit,
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
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);

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

    if (!bank) {
      return { success: false, error: "المورد غير موجود" };
    }

    // 2️⃣ الرصيد الافتتاحي قبل الفترة

    const openingBalance = bank.account.opening_balance
      ? Number(bank.account.opening_balance)
      : 0;
    // 3️⃣ قيود الفترة
    const entries = await prisma.journal_entries.findMany({
      where: {
        company_id: companyId,
        account_id: id,
        entry_date: { gte: fromDate, lte: toDate },
      },
      orderBy: { entry_date: "asc" },
      select: {
        id: true,
        entry_date: true,
        debit: true,
        credit: true,
        description: true,
        entry_number: true,
        reference_type: true,
      },
    });

    // 4️⃣ بناء كشف الحساب
    let runningBalance = openingBalance;
    const transactions = entries.map((entry) => {
      runningBalance =
        runningBalance + Number(entry.debit) - Number(entry.credit);

      return {
        date: entry.entry_date,
        debit: Number(entry.debit),
        credit: Number(entry.credit),
        balance: runningBalance,
        description: entry.description,
        docNo: entry.entry_number,
        typeName: mapType(entry.reference_type),
      };
    });
    const totalDebit = transactions.reduce((s, t) => s + t.debit, 0);
    const totalCredit = transactions.reduce((s, t) => s + t.credit, 0);

    return {
      success: true,
      data: {
        bank: serializeData(bank),
        openingBalance,
        closingBalance: openingBalance + totalDebit - totalCredit,
        totalDebit,
        totalCredit,
        transactions,
        period: { from: dateFrom, to: dateTo },
      },
    };
  } catch (error) {
    console.error("Error loading journal-based statement:", error);
    return { success: false, error: "خطأ في جلب كشف الحساب" };
  }
}
