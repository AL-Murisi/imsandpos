"use server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fetchProductStats } from "./Product";

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
        paymentType: "outstanding_payment",
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

  // 1️⃣ Fetch all sales
  const sales = await prisma.sale.findMany({
    where: { id: { in: saleIds }, companyId },
    select: {
      id: true,
      totalAmount: true,
      amountPaid: true,
      amountDue: true,
      customerId: true,
    },
  });

  if (sales.length === 0) throw new Error("No matching sales found.");

  // 2️⃣ Distribute payment among sales
  let remainingPayment = paymentAmount;
  const updates: any[] = [];
  const paymentLogs: any[] = [];
  const customerUpdates: Record<string, number> = {};

  for (const sale of sales) {
    if (remainingPayment <= 0) break;

    const total = sale.totalAmount.toNumber();
    const paid = sale.amountPaid.toNumber();
    const due = sale.amountDue.toNumber();
    if (due <= 0) continue;

    const payNow = Math.min(due, remainingPayment);
    remainingPayment -= payNow;

    const newPaid = paid + payNow;
    const newDue = total - newPaid;
    const status = newDue <= 0 ? "paid" : newPaid > 0 ? "partial" : "pending";

    updates.push({
      id: sale.id,
      amountPaid: newPaid,
      amountDue: Math.max(newDue, 0),
      paymentStatus: status,
    });

    paymentLogs.push({
      companyId,
      saleId: sale.id,
      cashierId,
      payment_type: "outstanding_payment",
      paymentMethod: "cash",
      amount: payNow,
      status: "completed",
      notes: `Payment applied for Sale ${sale.id}`,
      createdAt: new Date(),
    });

    if (sale.customerId) {
      customerUpdates[sale.customerId] =
        (customerUpdates[sale.customerId] || 0) + payNow;
    }
  }

  // 3️⃣ Chunk helper
  const chunkArray = <T,>(arr: T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size),
    );

  const CHUNK_SIZE = 40; // 🔹 Adjust if needed (safe for ~40–100 updates per chunk)

  // 4️⃣ Apply updates in small transactions
  const updateChunks = chunkArray(updates, CHUNK_SIZE);
  for (const chunk of updateChunks) {
    await prisma.$transaction(
      chunk.map((u) =>
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

  // 5️⃣ Create payments in batches
  const paymentChunks = chunkArray(paymentLogs, CHUNK_SIZE);
  for (const chunk of paymentChunks) {
    await prisma.payment.createMany({ data: chunk });
  }

  // 6️⃣ Update customer balances safely
  const customerChunks = chunkArray(
    Object.entries(customerUpdates),
    CHUNK_SIZE,
  );
  for (const chunk of customerChunks) {
    await prisma.$transaction(
      chunk.map(([custId, amount]) =>
        prisma.customer.update({
          where: { id: custId },
          data: { outstandingBalance: { decrement: amount } },
        }),
      ),
    );
  }

  // 7️⃣ Revalidate affected pages (outside DB ops)
  await Promise.all([revalidatePath("/sells"), revalidatePath("/debt")]);

  return {
    success: true,
    updatedSales: updates.length,
    payments: paymentLogs.length,
    customersUpdated: Object.keys(customerUpdates).length,
  };
}

type DateRange = {
  from: Date | null;
  to: Date | null;
};

type productFilters = {
  categoryId: string;
  warehouseId: string;
  supplierId: string;
};
type searchParam = {
  from: string;
  to: string;
  categoryId?: string;
  supplierId?: string;
  warehouseId?: string;
  users?: string;
};

export async function checkLowStockAndNotify(role: string) {
  try {
    const stats = await fetchProductStats(role, "");
    return stats?.lowStockDetails; // ✅ only return data
  } catch (err) {
    console.error("Failed to check stock:", err);
    return [];
  }
}
