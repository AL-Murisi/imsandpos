"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fetchProductStats } from "./Product";
import { success } from "zod";

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
  const updatedSale = await prisma.$transaction(async (tx) => {
    // 1️⃣ Fetch current sale
    const sale = await tx.sale.findUnique({
      where: { id: saleId, cashierId, companyId },
      select: {
        id: true,
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        paymentStatus: true,
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
    const updatedSaleRecord = await tx.sale.update({
      where: { id: saleId, companyId: companyId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        paymentStatus: newPaymentStatus,
        updatedAt: new Date(),
      },
    });

    // 4️⃣ Log Payment
    await tx.payment.create({
      data: {
        companyId,
        saleId,
        cashierId: cashierId ?? "",
        payment_type: "outstanding_payment",
        paymentMethod: "cash",
        amount: paymentAmount,
        status: "completed",
        notes: `Payment for Sale ${saleId}`,
        createdAt: new Date(),
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
      createdAt: updatedSaleRecord.createdAt.toISOString(),
      updatedAt: updatedSaleRecord.updatedAt.toISOString(),
    };
  });

  revalidatePath("/sells");
  revalidatePath("/debt");
  return updatedSale;
}
export async function updateSalesBulk(
  companyId: string,
  saleIds: string[],
  paymentAmount: number,
  cashierId: string,
) {
  if (paymentAmount <= 0)
    throw new Error("Payment amount must be greater than zero.");
  if (!companyId || saleIds.length === 0)
    throw new Error("Missing company ID or sale IDs.");

  // 1️⃣ Get all sales
  const sales = await prisma.sale.findMany({
    where: { id: { in: saleIds }, companyId },
    select: {
      id: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      saleNumber: true,
      customerId: true,
    },
  });

  if (sales.length === 0) throw new Error("No matching sales found.");

  // 2️⃣ Allocate payment
  let remaining = paymentAmount;
  const saleUpdates = [];
  const customerUpdates: Record<string, number> = {};
  const paymentRecords = []; // to insert payment rows

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

    paymentRecords.push({
      companyId,
      saleId: s.id,
      customerId: s.customerId, // ✅ REQUIRED!
      cashierId,
      payment_type: "outstanding_payment",
      paymentMethod: "cash",
      amount: payNow,
      status: "completed",
      notes: `تسديد الدين للفاتورة رقم ${s.saleNumber}`,

      createdAt: new Date(),
    });

    if (s.customerId) {
      customerUpdates[s.customerId] =
        (customerUpdates[s.customerId] || 0) + payNow;
    }
  }

  // Helper for chunking
  const chunk = <T,>(arr: T[], size: number) =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size),
    );

  const CHUNK = 50;

  // 3️⃣ Update sales in chunks
  for (const c of chunk(saleUpdates, CHUNK)) {
    await prisma.$transaction(
      c.map((u) =>
        prisma.sale.update({
          where: { id: u.id },
          data: {
            amountPaid: u.amountPaid,
            amountDue: u.amountDue,
            paymentStatus: u.paymentStatus,
            updatedAt: new Date(),
          },
        }),
      ),
    );
  }

  // 4️⃣ Create payments → REAL payment.id values generated
  let createdPayments: any[] = [];
  for (const c of chunk(paymentRecords, CHUNK)) {
    const batch = await prisma.$transaction(
      c.map((p) =>
        prisma.payment.create({
          data: p,
        }),
      ),
    );
    createdPayments.push(...batch);
  }

  // 5️⃣ Update customer balances
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

  // 6️⃣ Revalidate UI
  revalidatePath("/debt");

  // 7️⃣ Background journal creation (NON-BLOCKING)
  for (const pay of createdPayments) {
    createPaymentJournalEntries({
      companyId,
      payment: pay, // 👈 REAL payment object with ID
      cashierId,
    })
      .then(() => console.log(`Journal entry created for payment: ${pay.id}`))
      .catch((err) =>
        console.error(`Journal failed for payment ${pay.id}:`, err),
      );
  }

  return {
    success: true,
    updatedSales: saleUpdates.length,
    paymentsCreated: createdPayments.length,
    customersUpdated: Object.keys(customerUpdates).length,
  };
}

export async function createPaymentJournalEntries({
  companyId,
  payment,
  cashierId,
}: {
  companyId: string;
  payment: any; // payment record { id, saleId, customerId, amount, paymentMethod }
  cashierId: string;
}) {
  try {
    const { saleId, customerId, amount } = payment;

    // ============================================
    // 1️⃣ Fetch related sale
    // ============================================
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      select: {
        id: true,
        saleNumber: true,
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        customerId: true,
        customer: { select: { name: true } },
      },
    });

    if (!sale) return;

    // ============================================
    // 2️⃣ Avoid duplicate journal entries
    // ============================================
    const exists = await prisma.journal_entries.findFirst({
      where: { reference_id: payment.id, reference_type: "payment" },
    });
    if (exists) return;

    // ============================================
    // 3️⃣ Generate safe journal entry number
    // ============================================
    const year = new Date().getFullYear().toString();
    const nextSeqRaw: { next_number: string }[] = await prisma.$queryRawUnsafe(`
      SELECT COALESCE(
        MAX(CAST(SPLIT_PART(entry_number, '-', 3) AS INT)),
        0
      ) + 1 AS next_number
      FROM journal_entries
      WHERE entry_number LIKE 'JE-${year}-%'
        AND entry_number ~ '^JE-${year}-[0-9]+$'
    `);

    const nextNumber = Number(nextSeqRaw[0]?.next_number || 1);
    const seqFormatted = String(nextNumber).padStart(7, "0");
    const randomSuffix = Math.floor(Math.random() * 1000);
    const entryBase = `JE-${year}-${seqFormatted}-${randomSuffix}`;

    // ============================================
    // 4️⃣ Fetch account mappings
    // ============================================
    const mappings = await prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
    });

    const getAcc = (type: string) =>
      mappings.find((m) => m.mapping_type === type)?.account_id;

    const cashAcc = getAcc("cash");
    const arAcc = getAcc("accounts_receivable");

    if (!cashAcc || !arAcc) return;

    // ============================================
    // 5️⃣ Prepare journal entries
    // ============================================
    const desc = `دفعة دين لعملية بيع رقم ${sale.saleNumber}${
      sale.customerId ? " - " + sale.customer?.name : ""
    }`;

    const entries: any[] = [
      {
        company_id: companyId,
        account_id: cashAcc,
        description: desc,
        debit: amount,
        credit: 0,
        entry_date: new Date(),
        reference_id: payment.id,
        reference_type: "payment",
        entry_number: `${entryBase}-D`,
        created_by: cashierId,
        is_automated: true,
      },
      {
        company_id: companyId,
        account_id: arAcc,
        description: desc,
        debit: 0,
        credit: amount,
        entry_date: new Date(),
        reference_id: payment.id,
        reference_type: "payment",
        entry_number: `${entryBase}-C`,
        created_by: cashierId,
        is_automated: true,
      },
    ];

    // ============================================
    // 6️⃣ Insert entries in bulk
    // ============================================
    await prisma.journal_entries.createMany({ data: entries });

    // ============================================
    // 7️⃣ Update account balances
    // ============================================
    const balanceOps = entries.map((e) =>
      prisma.accounts.update({
        where: { id: e.account_id },
        data: { balance: { increment: Number(e.debit) - Number(e.credit) } },
      }),
    );
    await Promise.all(balanceOps);

    console.log("Payment journal entries created for payment", payment.id);
  } catch (err) {
    console.error("Error in createPaymentJournalEntries:", err);
  }
}
