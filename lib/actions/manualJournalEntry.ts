// lib/actions/manualJournalEntry.ts
"use server";

import prisma from "@/lib/prisma"; // Adjust import path
import { revalidatePath } from "next/cache";
import { getSession } from "../session";

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
  fiscal_period?: string | null;
}

interface CreateManualJournalEntryParams {
  entries: JournalEntryLine[];
  generalDescription: string;
  companyId: string;
}

export async function createManualJournalEntry({
  entries,
  generalDescription,
  companyId,
}: CreateManualJournalEntryParams) {
  try {
    // Validation
    if (!entries || !Array.isArray(entries) || entries.length < 2) {
      return {
        success: false,
        error: "يجب أن يحتوي القيد على سطرين على الأقل",
      };
    }

    if (!generalDescription?.trim()) {
      return {
        success: false,
        error: "يجب إدخال وصف عام للقيد",
      };
    }

    // Calculate totals
    const totalDebit = entries.reduce(
      (sum, e) => sum + Number(e.debit || 0),
      0,
    );
    const totalCredit = entries.reduce(
      (sum, e) => sum + Number(e.credit || 0),
      0,
    );

    // Check balance (allow tiny floating point differences)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        error: `القيد غير متوازن: المدين ${totalDebit.toFixed(2)} - الدائن ${totalCredit.toFixed(2)}`,
      };
    }

    // Get fiscal year
    const fiscalYear = await prisma.fiscal_periods.findFirst({
      where: {
        is_closed: false,
        start_date: { lte: new Date() },
        end_date: { gte: new Date() },
      },
      select: { period_name: true },
    });

    // Prepare entries with fiscal period
    const entriesWithFiscal = entries.map((entry) => ({
      ...entry,
      fiscal_period: fiscalYear?.period_name || null,
      debit: Number(entry.debit || 0),
      credit: Number(entry.credit || 0),
      entry_date: new Date(entry.entry_date),
    }));

    // Execute transaction
    await prisma.$transaction(async (tx) => {
      // 1. Insert all journal entries
      await tx.journal_entries.createMany({
        data: entriesWithFiscal,
      });

      // 2. Fetch account types for all accounts
      const accountIds = [...new Set(entries.map((e) => e.account_id))];
      const accounts = await tx.accounts.findMany({
        where: {
          id: { in: accountIds },
          company_id: companyId,
        },
        select: { id: true, account_type: true },
      });

      const accountTypeMap = new Map(
        accounts.map((a) => [a.id, a.account_type]),
      );

      // 3. Calculate balance deltas for each account
      const accountDeltas = new Map<string, number>();

      for (const entry of entriesWithFiscal) {
        const accountType = accountTypeMap.get(entry.account_id);
        if (!accountType) continue;

        const debit = Number(entry.debit || 0);
        const credit = Number(entry.credit || 0);

        // Normal balance logic:
        // Assets, Expenses, COGS: Debit increases balance
        // Liabilities, Equity, Revenue: Credit increases balance
        let delta = 0;
        const normalizedType = accountType.toLowerCase();

        if (["asset", "expense", "cogs"].includes(normalizedType)) {
          delta = debit - credit;
        } else {
          // Revenue, liability, equity accounts
          delta = credit - debit;
        }

        accountDeltas.set(
          entry.account_id,
          (accountDeltas.get(entry.account_id) || 0) + delta,
        );
      }

      // 4. Update all account balances
      await Promise.all(
        Array.from(accountDeltas.entries()).map(([accountId, delta]) =>
          tx.accounts.update({
            where: { id: accountId, company_id: companyId },
            data: { balance: { increment: delta } },
          }),
        ),
      );
    });

    // Revalidate relevant paths
    revalidatePath("/journalEntry");
    revalidatePath("/chartOfAccounts");

    return {
      success: true,
      message: "تم إنشاء القيد المحاسبي اليدوي بنجاح",
    };
  } catch (error) {
    console.error("Error creating manual journal entry:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "حدث خطأ غير متوقع",
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
