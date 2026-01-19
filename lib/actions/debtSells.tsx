"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fetchProductStats } from "./Product";
import { success } from "zod";
import { getActiveFiscalYears } from "@/lib/actions/fiscalYear";
import { TransactionType } from "@prisma/client";

export async function updateSales(
  companyId: string,
  saleId: string,
  paymentAmount: number,
  cashierId: string,
) {
  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero.");
  }
  if (!companyId) return;
  let pay: any;
  const updatedSale = await prisma.$transaction(async (tx) => {
    // 1️⃣ Fetch current sale
    const sale = await tx.invoice.findUnique({
      where: { id: saleId, cashierId, companyId },
      select: {
        id: true,
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        status: true,
        customerId: true,
      },
    });

    if (!sale) throw new Error(`Sale with ID ${saleId} not found.`);

    const totalAmount = sale.totalAmount.toNumber();
    const currentPaid = sale.amountPaid.toNumber();
    const currentDue = sale.amountDue.toNumber();
    const customerId = sale.customerId;

    // 2️⃣ Compute new values
    let newAmountPaid = currentPaid + paymentAmount;
    let newAmountDue = currentDue - paymentAmount;
    if (newAmountDue < 0) newAmountDue = 0;

    let newPaymentStatus: "paid" | "partial" | "pending";
    if (newAmountPaid >= totalAmount) {
      newPaymentStatus = "paid";
      newAmountDue = 0;
    } else if (newAmountPaid > 0) {
      newPaymentStatus = "partial";
    } else {
      newPaymentStatus = "pending";
    }

    // 3️⃣ Update Sale
    const updatedSaleRecord = await tx.invoice.update({
      where: { id: saleId, companyId: companyId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newPaymentStatus,
        invoiceDate: new Date(),
      },
    });

    // 4️⃣ Log Payment
    pay = await tx.financialTransaction.create({
      data: {
        companyId,
        saleId,
        userId: cashierId ?? "",
        voucherNumber: 8,
        currencyCode: "",
        type: "RECEIPT",
        paymentMethod: "cash",
        amount: paymentAmount,
        status: "completed",
        notes: `Payment for Sale ${saleId}`,
        createdAt: new Date(),
      },
    });
    // 🆕 CREATE JOURNAL EVENT (instead of direct creation)
    await tx.journalEvent.create({
      data: {
        companyId: companyId,
        eventType: "payment",
        entityType: "outstanding_payment",
        status: "pending",
        payload: {
          companyId,
          payment: {
            id: pay.id,
            saleId: saleId,
            customerId: customerId,
            amount: pay.amount,
            paymentMethod: pay.paymentMethod,
          },
          cashierId,
        },
        processed: false,
      },
    });
    // 5️⃣ Update Customer balance (reduce what company owes)
    if (customerId) {
      await tx.customer.update({
        where: { id: customerId },
        data: {
          outstandingBalance: {
            decrement: paymentAmount, // reduce customer's debt
          },
        },
      });
    }

    // 6️⃣ Return clean serialized sale
    return {
      ...updatedSaleRecord,
      totalAmount: updatedSaleRecord.totalAmount.toString(),
      amountPaid: updatedSaleRecord.amountPaid.toString(),
      amountDue: updatedSaleRecord.amountDue.toString(),
      createdAt: updatedSaleRecord.invoiceDate.toISOString(),
      updatedAt: updatedSaleRecord.invoiceDate.toISOString(),
    };
  });

  revalidatePath("/sells");

  return updatedSale;
}

export async function updateSalesBulk(
  companyId: string,
  saleIds: string[],
  paymentAmount: number,
  cashierId: string,
  branchId: string,
  paymentDetails: {
    paymentMethod: string;
    currencyCode: string;
    bankId: string;
    exchange_rate?: number;
    transferNumber?: string;
    baseAmount?: number;
    amountFC?: number;
  },
) {
  if (paymentAmount <= 0)
    throw new Error("Payment amount must be greater than zero.");
  if (!companyId || saleIds.length === 0)
    throw new Error("Missing company ID or sale IDs.");

  // 1️⃣ جلب المبيعات
  const sales = await prisma.invoice.findMany({
    where: { id: { in: saleIds }, companyId },
    select: {
      id: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      invoiceNumber: true,
      customerId: true,
    },
  });

  if (sales.length === 0) throw new Error("No matching sales found.");

  // --- وظيفة لجلب الرقم التالي لتسهيل إعادة المحاولة ---
  const getNextVoucherNumber = async () => {
    const aggregate = await prisma.financialTransaction.aggregate({
      where: { companyId: companyId, type: "RECEIPT" },
      _max: { voucherNumber: true },
    });
    return (aggregate._max.voucherNumber || 0) + 1;
  };

  // 2️⃣ تخصيص مبالغ الدفع
  let remaining = paymentAmount;
  const saleUpdates = [];
  const customerUpdates: Record<string, number> = {};
  const paymentRecordsBase = [];

  for (const s of sales) {
    if (remaining <= 0) break;
    const due = s.amountDue.toNumber();
    if (due <= 0) continue;

    const payNow = Math.min(remaining, due);
    remaining -= payNow;

    const newPaid = s.amountPaid.toNumber() + payNow;
    const newDue = s.totalAmount.toNumber() - newPaid;

    saleUpdates.push({
      id: s.id,
      amountPaid: newPaid,
      amountDue: Math.max(newDue, 0),
      paymentStatus: newDue <= 0 ? "paid" : "partial",
    });

    // نخزن البيانات الأساسية بدون رقم القسيمة الآن
    paymentRecordsBase.push({
      companyId,
      invoiceId: s.id,
      referenceNumber: paymentDetails.paymentMethod ?? "",
      customerId: s.customerId,
      userId: cashierId,
      branchId,
      currencyCode: paymentDetails.currencyCode || "",
      type: TransactionType.PAYMENT,
      paymentMethod: paymentDetails.paymentMethod,
      amount: payNow,
      status: "completed",
      notes: `تسديد الدين للفاتورة رقم ${s.invoiceNumber}`,
      createdAt: new Date(),
    });

    if (s.customerId) {
      customerUpdates[s.customerId] =
        (customerUpdates[s.customerId] || 0) + payNow;
    }
  }

  // 3️⃣ تحديث الفواتير والمستحقات (خارج حلقة إعادة محاولة الرقم)
  const chunk = <T,>(arr: T[], size: number) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size),
    );
  const CHUNK = 50;

  for (const c of chunk(saleUpdates, CHUNK)) {
    await prisma.$transaction(
      c.map((u) =>
        prisma.invoice.update({
          where: { id: u.id },
          data: {
            amountPaid: u.amountPaid,
            amountDue: u.amountDue,
            status: u.paymentStatus,
            invoiceDate: new Date(),
          },
        }),
      ),
    );
  }

  // 4️⃣ إنشاء السندات مع منطق إعادة المحاولة في حال تكرار الرقم
  let createdPayments: any[] = [];
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      const nextNumber = await getNextVoucherNumber();
      const currentBatch = paymentRecordsBase.map((p) => ({
        ...p,
        voucherNumber: nextNumber,
      }));

      createdPayments = []; // تصغير المصفوفة في كل محاولة
      for (const c of chunk(currentBatch, CHUNK)) {
        const batch = await prisma.$transaction(
          c.map((p) => prisma.financialTransaction.create({ data: p })),
        );
        createdPayments.push(...batch);
      }
      break; // إذا نجح الإدخال، اخرج من حلقة while
    } catch (error: any) {
      // التحقق من خطأ Prisma للقيم المكررة (Unique Constraint)
      if (error.code === "P2002") {
        attempts++;
        console.warn(
          `Voucher number conflict. Retrying... Attempt ${attempts}`,
        );
        if (attempts >= maxAttempts)
          throw new Error(
            "Failed to generate a unique voucher number after multiple attempts.",
          );
        continue; // أعد المحاولة برقم جديد
      }
      throw error; // خطأ آخر غير التكرار
    }
  }

  // 5️⃣ تحديث أرصدة العملاء
  for (const c of chunk(Object.entries(customerUpdates), CHUNK)) {
    await prisma.$transaction(
      c.map(([custId, amt]) =>
        prisma.customer.update({
          where: { id: custId },
          data: { outstandingBalance: { decrement: amt } },
        }),
      ),
    );
  }

  // 6️⃣ إنشاء أحداث القيود المحاسبية (Journal Events)
  const journalEventsData = createdPayments.map((payment) => ({
    companyId,
    eventType: "payment",
    entityType: "outstanding_payment",
    status: "pending",
    payload: {
      companyId,
      payment: {
        id: payment.id,
        saleId: payment.invoiceId,
        customerId: payment.customerId,
        amount: payment.amount,
        branchId,
        paymentDetails: paymentDetails || {},
      },
      cashierId,
    },
    processed: false,
  }));

  for (const c of chunk(journalEventsData, CHUNK)) {
    await prisma.journalEvent.createMany({ data: c });
  }

  revalidatePath("/customer");
  return {
    success: true,
    updatedSales: saleUpdates.length,
    paymentsCreated: createdPayments.length,
  };
}

export async function payOutstandingOnly(
  companyId: string,
  customerId: string,
  paymentAmount: number,
  cashierId: string,
  branchId: string,
  paymentDetails: {
    paymentMethod: string;
    currencyCode: string;
    bankId: string;
    transferNumber?: string;

    exchangeRate?: number;
    baseAmount?: number;
    amountFC?: number;
  },
) {
  if (!companyId || !customerId)
    throw new Error("Missing company or customer ID.");

  if (paymentAmount <= 0)
    throw new Error("Payment amount must be greater than zero.");

  // 1️⃣ Create payment (NO saleId)
  const payment = await prisma.financialTransaction.create({
    data: {
      companyId,
      customerId,
      saleId: null,
      userId: cashierId,
      voucherNumber: 34,
      type: "RECEIPT",
      currencyCode: "",
      paymentMethod: paymentDetails.paymentMethod,
      amount: paymentAmount,
      status: "completed",
      notes: "تسديد رصيد مستحق غير مرتبط بفاتورة",
      createdAt: new Date(),
    },
  });

  // 2️⃣ Update customer outstanding balance
  await prisma.customer.update({
    where: { id: customerId },
    data: {
      outstandingBalance: {
        decrement: paymentAmount,
      },
    },
  });

  // 3️⃣ Create journal event
  await prisma.journalEvent.create({
    data: {
      companyId,
      eventType: "payment-outstanding",
      entityType: "outstanding",
      status: "pending",
      processed: false,
      payload: {
        companyId,
        payment: {
          id: payment.id,
          saleId: null,
          customerId,
          amount: payment.amount,

          paymentDetails: paymentDetails || {},
        },
        cashierId,
      },
    },
  });
  revalidatePath("/customer");
  return {
    success: true,
    paymentId: payment.id,
    amountPaid: payment.amount,
  };
}
