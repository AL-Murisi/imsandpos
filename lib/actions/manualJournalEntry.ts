"use server";

import prisma from "@/lib/prisma";
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
  selectedCurrency: string;
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
        error: "??? ?? ????? ????? ??? ????? ??? ?????",
      };
    }

    if (!generalDescription?.trim()) {
      return {
        success: false,
        error: "??? ????? ??? ??? ?????",
      };
    }

    const totalDebit = entries.reduce(
      (sum, entry) => sum + Number(entry.debit || 0),
      0,
    );
    const totalCredit = entries.reduce(
      (sum, entry) => sum + Number(entry.credit || 0),
      0,
    );

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return {
        success: false,
        error: `????? ??? ??????: ?????? ${totalDebit.toFixed(2)} - ?????? ${totalCredit.toFixed(2)}`,
      };
    }

    const firstEntry = entries[0];
    const entryYear = new Date().getFullYear();
    const entryNumber =
      firstEntry?.entry_number ||
      `JE-${entryYear}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await prisma.$transaction(async (tx) => {
      await tx.journalHeader.create({
        data: {
          companyId,
          entryNumber,
          description: generalDescription,
          branchId: firstEntry?.branch_id,
          referenceType: firstEntry?.reference_type || "manual-journal",
          referenceId: firstEntry?.reference_id || entryNumber,
          entryDate: new Date(firstEntry?.entry_date || new Date()),
          status: "POSTED",
          createdBy: firstEntry?.created_by,
          lines: {
            create: entries.map((entry) => ({
              companyId,
              accountId: entry.account_id,
              debit: Number(entry.debit || 0),
              credit: Number(entry.credit || 0),
              currencyCode: entry.currency_code || undefined,
              memo: entry.description || generalDescription,
            })),
          },
        },
      });

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

    revalidatePath("/journal-entry");

    return {
      success: true,
      message: "?? ??? ????? ???????? ?????? ????? ??????/??????",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "??? ??? ????? ??? ????? ????????",
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
      error: "??? ?? ??? ????? ???????",
    };
  }
}
