// lib/actions/manualJournalEntry.ts
"use server";

import prisma from "@/lib/prisma"; // Adjust import path
import { revalidatePath } from "next/cache";
import { getSession } from "../session";
import { validateFiscalYear } from "./fiscalYear";

interface JournalEntryLine {
  company_id: string;
  entry_number: string;
  account_id: string;
  description: string;
  debit: number;
  credit: number;
  entry_date: Date;
  reference_type: string;
  reference_id: string;
  created_by: string;
  is_automated: boolean;
  branch_id?: string;
  currency_code?: string | null;
  fiscal_period?: string | null;
  customer_id?: string;
  supplier_id?: string;
}
interface SupplierPaymentDetails {
  paymentMethod: string;
  accountId: string;
  accountCurrency: string;
  amountBase: number;
  transferNumber?: number;
  exchangeRate?: number;
  amountFC?: number;
}

export async function createManualJournalEntry({
  entries,
  generalDescription,
  companyId,
  paymentDetails,
}: {
  entries: JournalEntryLine[];
  generalDescription: string;
  companyId: string;
  paymentDetails?: SupplierPaymentDetails;
}) {
  try {
    await validateFiscalYear(companyId);
    if (!entries || entries.length < 2) {
      return {
        success: false,
        error: "يجب أن يحتوي القيد على سطرين على الأقل",
      };
    }

    if (!generalDescription?.trim()) {
      return { success: false, error: "يجب إدخال وصف عام للقيد" };
    }
    const fiscalYear = await prisma.fiscal_periods.findFirst({
      where: {
        is_closed: false,
        start_date: { lte: new Date() },
        end_date: { gte: new Date() },
      },
      select: { period_name: true },
    });

    // 1️⃣ Validate balance
    const totalDebit = entries.reduce(
      (sum, e) => sum + Number(e.debit || 0),
      0,
    );
    const totalCredit = entries.reduce(
      (sum, e) => sum + Number(e.credit || 0),
      0,
    );

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        error: `القيد غير متوازن: المدين ${totalDebit.toFixed(
          2,
        )} - الدائن ${totalCredit.toFixed(2)}`,
      };
    }
    const entriesToInsert = entries.map((entry) => ({
      company_id: companyId,
      entry_number: entry.entry_number, // make sure you generate per line
      account_id: entry.account_id,
      description: entry.description || generalDescription,
      debit: Number(entry.debit || 0),
      credit: Number(entry.credit || 0),
      entry_date: new Date(entry.entry_date),
      fiscal_period: fiscalYear?.period_name || null,
      reference_type: entry.reference_type,
      reference_id: entry.reference_id,
      created_by: entry.created_by,
      branch_id: entry.branch_id,
      currency_code: entry.currency_code,
      is_automated: false,
    }));

    // 2️⃣ Save journal event + update balances in ONE transaction
    await prisma.$transaction(async (tx) => {
      // 🟢 Save journal event
      await tx.journalEvent.create({
        data: {
          companyId: companyId,
          eventType: "manual-journal",
          entityType: "journal-entry",
          status: "pending",

          payload: {
            companyId,
            generalDescription: generalDescription,
            entries: entriesToInsert,
            totalDebit,
            totalCredit,
            createdAt: new Date(),
          },
          processed: false,
        },
      });

      // 🟢 Update customer / supplier balances per line
      for (const entry of entries) {
        const debit = Number(entry.debit || 0);
        const credit = Number(entry.credit || 0);

        if (entry.customer_id) {
          await tx.customer.update({
            where: { id: entry.customer_id },
            data: {
              outstandingBalance: {
                increment: debit - credit,
              },
            },
          });
        }

        if (entry.supplier_id) {
          await tx.supplier.update({
            where: { id: entry.supplier_id },
            data: {
              outstandingBalance: {
                increment: credit - debit,
              },
            },
          });
        }
      }
    });

    return {
      success: true,
      message: "تم حفظ القيد كمعلّق وتحديث أرصدة العميل/المورد",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "حدث خطأ أثناء حفظ القيد المحاسبي",
    };
  }
}

export async function getSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    select: { id: true, name: true },
    where: { isActive: true, companyId: (await getSession())?.companyId },
    orderBy: { name: "asc" },
  });
  return suppliers;
}
// Optional: Get active fiscal year helper
export async function getActiveFiscalYear() {
  try {
    const fiscalYear = await prisma.fiscal_periods.findFirst({
      where: {
        is_closed: false,
        start_date: { lte: new Date() },
        end_date: { gte: new Date() },
      },
      select: {
        id: true,
        period_name: true,
        start_date: true,
        end_date: true,
      },
    });

    return {
      success: true,
      data: fiscalYear,
    };
  } catch (error) {
    console.error("Error fetching fiscal year:", error);
    return {
      success: false,
      error: "فشل في جلب السنة المالية",
    };
  }
}
