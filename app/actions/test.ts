"use server";

import prisma from "@/lib/prisma"; // تأكد من مسار prisma client الصحيح
import { Prisma } from "@prisma/client";

// ===============================
// 1. جلب معلومات الشركة
// ===============================
// export async function getCompanyInfo(companyId: string) {
//   try {
//     const company = await prisma.company.findUnique({
//       where: { id: companyId },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         phone: true,
//         address: true,
//         city: true,
//         state: true,
//         country: true,
//         taxNumber: true,
//         logoUrl: true,
//         footerMsg: true,
//       },
//     });

//     return { success: true, data: company };
//   } catch (error) {
//     console.error("Error fetching company:", error);
//     return { success: false, error: "فشل في جلب بيانات الشركة" };
//   }
// }

// ===============================
// 2. جلب قائمة العملاء
// ===============================
// export async function getCustomers(companyId: string, searchTerm?: string) {
//   try {
//     const customers = await prisma.customer.findMany({
//       where: {
//         companyId,
//         isActive: true,
//         ...(searchTerm && {
//           OR: [
//             { name: { contains: searchTerm, mode: "insensitive" } },
//             { phoneNumber: { contains: searchTerm } },
//             { email: { contains: searchTerm, mode: "insensitive" } },
//           ],
//         }),
//       },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         phoneNumber: true,
//         address: true,
//         city: true,
//         outstandingBalance: true,
//         balance: true,
//       },
//       orderBy: { name: "asc" },
//       take: 100,
//     });

//     return { success: true, data: customers };
//   } catch (error) {
//     console.error("Error fetching customers:", error);
//     return { success: false, error: "فشل في جلب قائمة العملاء" };
//   }
// }

// ===============================
// 3. حساب الرصيد الافتتاحي
// ===============================
async function calculateOpeningBalance(
  customerId: string,
  companyId: string,
  dateFrom: Date,
) {
  try {
    // جلب جميع المبيعات قبل تاريخ البداية
    const salesBeforeDate = await prisma.sale.findMany({
      where: {
        customerId,
        companyId,
        saleDate: { lt: dateFrom },
        status: { not: "cancelled" },
      },
      select: {
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
      },
    });

    // جلب جميع الدفعات قبل تاريخ البداية
    const paymentsBeforeDate = await prisma.payment.findMany({
      where: {
        customerId,
        companyId,
        createdAt: { lt: dateFrom },
        status: "completed",
      },
      select: {
        amount: true,
      },
    });

    // حساب إجمالي المبيعات
    const totalSales = salesBeforeDate.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0,
    );

    // حساب إجمالي الدفعات
    const totalPayments = paymentsBeforeDate.reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );

    // الرصيد الافتتاحي = المبيعات - الدفعات
    return totalSales - totalPayments;
  } catch (error) {
    console.error("Error calculating opening balance:", error);
    return 0;
  }
}
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
// ===============================
// 4. جلب كشف حساب العميل
// ===============================
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

    // -------------------------------
    // 1️⃣ Get Customer
    // -------------------------------
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

    // -------------------------------
    // 2️⃣ Opening Balance (Before From Date)
    // -------------------------------
    const openingBalance = await calculateOpeningBalance(
      customerId,
      companyId,
      fromDate,
    );

    // -------------------------------
    // 3️⃣ Fetch Sales (Invoices + Returns)
    // -------------------------------
    const sales = await prisma.sale.findMany({
      where: {
        customerId,
        companyId,
        saleDate: { gte: fromDate, lte: toDate },
        status: { not: "cancelled" },
      },
      select: {
        id: true,
        saleNumber: true,
        saleDate: true,
        totalAmount: true,
        sale_type: true, // "normal" | "return"
      },
      orderBy: { saleDate: "asc" },
    });

    // -------------------------------
    // 4️⃣ Fetch Payments
    // -------------------------------
    const payments = await prisma.payment.findMany({
      where: {
        customerId,
        companyId,
        createdAt: {
          ...(fromDate && { gte: fromDate }),
          ...(toDate && { lte: toDate }),
        },
      },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        referenceNumber: true,
        notes: true,
        createdAt: true,
        payment_type: true,
        sale: { select: { saleNumber: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // -------------------------------
    // 5️⃣ Merge Transactions
    // -------------------------------
    const transactions: any[] = [];
    let runningBalance = openingBalance;

    // Add Sales (Normal + Return)
    sales.forEach((sale) => {
      const isReturn = sale.sale_type === "return";

      const debit = isReturn ? 0 : Number(sale.totalAmount);
      const credit = isReturn ? Number(sale.totalAmount) : 0;

      runningBalance = runningBalance + debit - credit;

      transactions.push({
        date: sale.saleDate,
        // typeName: isReturn ? "return" : "sale",
        typeName: isReturn ? "مرتجع مبيعات" : "فاتورة مبيعات",
        docNo: sale.saleNumber,
        description: isReturn
          ? `مرتجع مبيعات رقم ${sale.saleNumber}`
          : `فاتورة مبيعات رقم ${sale.saleNumber}`,
        debit,
        credit,
        balance: runningBalance,
        referenceId: sale.id,
      });
    });

    // Add Payments
    payments.forEach((payment) => {
      const isReturn = payment.payment_type === "return_refund";
      const credit = isReturn ? 0 : Number(payment.amount);
      const debit = isReturn ? Number(payment.amount) : 0;

      // const debit = 0;
      // const credit = Number(payment.amount);

      runningBalance = runningBalance + debit - credit;

      transactions.push({
        date: payment.createdAt,
        type: "payment",
        typeName:
          payment.payment_type === "outstanding_payment"
            ? "سند قبض"
            : payment.payment_type == "sale_payment"
              ? "سند قبض"
              : payment.payment_type === "return_refund"
                ? "إرجاع بيع"
                : "رصيد افتتاحي",
        docNo:
          payment.referenceNumber || `PAY-${payment.id.toString().slice(0, 8)}`,
        description:
          payment.notes ||
          (payment.sale
            ? `دفعة على فاتورة ${payment.sale.saleNumber}`
            : "دفعة نقدية"),
        debit,
        credit,
        balance: runningBalance,
        referenceId: payment.id,
      });
    });

    // -------------------------------
    // 6️⃣ Sort and Recalculate Running Balance
    // -------------------------------
    transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    let balance = openingBalance;
    transactions.forEach((t) => {
      balance = balance + t.debit - t.credit;
      t.balance = balance;
    });

    // -------------------------------
    // 7️⃣ Totals
    // -------------------------------
    const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
    const closingBalance = openingBalance + totalDebit - totalCredit;

    // -------------------------------
    // 8️⃣ Result
    // -------------------------------
    return {
      success: true,
      data: {
        customer: serializeData(customer),
        openingBalance,
        transactions,
        totalDebit,
        totalCredit,
        closingBalance,
        period: { from: dateFrom, to: dateTo },
      },
    };
  } catch (error) {
    console.error("Error fetching customer statement:", error);
    return { success: false, error: "فشل في جلب كشف الحساب" };
  }
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

    // -------------------------------
    // 1️⃣ Get Supplier
    // -------------------------------
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

    // -------------------------------
    // 2️⃣ Opening Balance (Before From Date)
    // -------------------------------
    const openingBalance = await calculateSupplierOpeningBalance(
      supplierId,
      companyId,
      fromDate,
    );

    // -------------------------------
    // 3️⃣ Fetch Purchases (Normal + Returns)
    // -------------------------------
    const purchases = await prisma.purchase.findMany({
      where: {
        supplierId,
        companyId,
        createdAt: { gte: fromDate, lte: toDate },
        status: { not: "cancelled" },
      },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
        purchaseType: true,
        status: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // -------------------------------
    // 4️⃣ Fetch Supplier Payments
    // -------------------------------
    const payments = await prisma.supplierPayment.findMany({
      where: {
        supplierId,
        companyId,
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        amount: true,
        paymentMethod: true,
        note: true,
        createdAt: true,
        purchase: { select: { id: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // -------------------------------
    // 5️⃣ Merge Transactions
    // -------------------------------
    const transactions: any[] = [];
    let runningBalance = openingBalance;

    // Add Purchases (Normal + Return)
    purchases.forEach((purchase, index) => {
      const isReturn = purchase.purchaseType === "purchase_return";

      // For supplier: debit = what we owe (purchase), credit = return
      const debit = isReturn ? 0 : Number(purchase.totalAmount);
      const credit = isReturn ? Number(purchase.totalAmount) : 0;

      runningBalance = runningBalance + debit - credit;

      transactions.push({
        date: purchase.createdAt,
        typeName: isReturn ? "مرتجع مشتريات" : "فاتورة مشتريات",
        docNo: `PUR-${purchase.id.slice(0, 8)}`,
        description: isReturn
          ? `مرتجع مشتريات رقم ${purchase.id.slice(0, 8)}`
          : `فاتورة مشتريات رقم ${purchase.id.slice(0, 8)}`,
        debit,
        credit,
        balance: runningBalance,
        referenceId: purchase.id,
      });
    });

    // Add Payments
    payments.forEach((payment) => {
      // For supplier: payments are credits (reduce what we owe)
      const debit = 0;
      const credit = Number(payment.amount);

      runningBalance = runningBalance + debit - credit;

      transactions.push({
        date: payment.createdAt,
        typeName: "سند صرف",
        docNo: `PAY-${payment.id.slice(0, 8)}`,
        description: payment.note || `دفعة للمورد`,
        debit,
        credit,
        balance: runningBalance,
        referenceId: payment.id,
      });
    });

    // -------------------------------
    // 6️⃣ Sort and Recalculate Running Balance
    // -------------------------------
    transactions.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    let balance = openingBalance;
    transactions.forEach((t) => {
      balance = balance + t.debit - t.credit;
      t.balance = balance;
    });

    // -------------------------------
    // 7️⃣ Totals
    // -------------------------------
    const totalDebit = transactions.reduce((sum, t) => sum + t.debit, 0);
    const totalCredit = transactions.reduce((sum, t) => sum + t.credit, 0);
    const closingBalance = openingBalance + totalDebit - totalCredit;

    // -------------------------------
    // 8️⃣ Result
    // -------------------------------
    return {
      success: true,
      data: {
        supplier: {
          id: supplier.id,
          name: supplier.name,
          email: supplier.email,
          address: supplier.address,
          city: supplier.city,
          phoneNumber: supplier.phoneNumber,
          totalPurchased: supplier.totalPurchased,
          totalPaid: supplier.totalPaid,
          outstandingBalance: supplier.outstandingBalance,
        },
        openingBalance,
        transactions,
        totalDebit,
        totalCredit,
        closingBalance,
        period: { from: dateFrom, to: dateTo },
      },
    };
  } catch (error) {
    console.error("Error fetching supplier statement:", error);
    return { success: false, error: "فشل في جلب كشف حساب المورد" };
  }
}
