"use server";
import prisma from "@/lib/prisma";
import Product from "../inventory/products/page";
import { revalidatePath } from "next/cache";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
} from "date-fns";
import { Prisma } from "@prisma/client";
import { create } from "domain";
import type { SortingState } from "@tanstack/react-table";
import { fetchProductStats } from "./sells";

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
