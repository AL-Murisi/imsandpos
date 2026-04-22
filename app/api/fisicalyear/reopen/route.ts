import prisma from "@/lib/prisma";
import { assertCompanySubscriptionActive } from "@/lib/actions/subscription";
import { getSession } from "@/lib/session";
import { NextRequest } from "next/server";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.subscriptionActive === false) {
      return Response.json({ error: "Subscription inactive" }, { status: 403 });
    }

    await assertCompanySubscriptionActive(session.companyId);

    const { fiscalYearId } = await req.json();
    if (!fiscalYearId) {
      return Response.json({ error: "fiscalYearId is required" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const fiscalYear = await tx.fiscal_periods.findUnique({
        where: { id: fiscalYearId },
        select: {
          id: true,
          company_id: true,
          period_name: true,
          start_date: true,
          end_date: true,
          is_closed: true,
        },
      });

      if (!fiscalYear) {
        throw new Error("السنة المالية غير موجودة");
      }

      if (fiscalYear.company_id !== session.companyId) {
        throw new Error("Unauthorized");
      }

      if (!fiscalYear.is_closed) {
        throw new Error("السنة المالية مفتوحة بالفعل");
      }

      const closingHeader = await tx.journalHeader.findFirst({
        where: {
          companyId: session.companyId,
          referenceType: "fiscal-year-close",
          referenceId: fiscalYear.id,
          status: "POSTED",
        },
        include: {
          lines: true,
        },
        orderBy: { entryDate: "desc" },
      });

      if (!closingHeader) {
        throw new Error("لا يوجد قيد إقفال لعكسه");
      }

      const priorReversal = await tx.journalHeader.findFirst({
        where: {
          companyId: session.companyId,
          referenceType: "fiscal-year-close-reversal",
          referenceId: closingHeader.id,
        },
        select: { id: true },
      });

      if (priorReversal) {
        throw new Error("تم عكس قيد الإقفال مسبقاً");
      }

      const nextStart = addDays(new Date(fiscalYear.end_date), 1);
      const nextFiscalYear = await tx.fiscal_periods.findFirst({
        where: {
          company_id: session.companyId,
          start_date: nextStart,
        },
        select: {
          id: true,
          start_date: true,
          end_date: true,
          is_closed: true,
        },
      });

      if (nextFiscalYear) {
        const nextYearPostedEntries = await tx.journalHeader.count({
          where: {
            companyId: session.companyId,
            status: "POSTED",
            entryDate: {
              gte: nextFiscalYear.start_date,
              lte: nextFiscalYear.end_date,
            },
          },
        });

        if (nextYearPostedEntries > 0) {
          throw new Error("لا يمكن إعادة فتح السنة بعد وجود قيود مرحلة في السنة التالية");
        }

        await tx.journalHeader.deleteMany({
          where: {
            companyId: session.companyId,
            referenceType: "fiscal-year-open",
            referenceId: nextFiscalYear.id,
          },
        });

        await tx.fiscal_periods.delete({
          where: { id: nextFiscalYear.id },
        });
      }

      const reversalEntryNumber = `FYREOPEN-${fiscalYear.period_name}-${Date.now()}`;
      await tx.journalHeader.create({
        data: {
          companyId: session.companyId,
          entryNumber: reversalEntryNumber,
          description: `Reverse fiscal year close ${closingHeader.entryNumber}`,
          referenceType: "fiscal-year-close-reversal",
          referenceId: closingHeader.id,
          entryDate: new Date(),
          status: "POSTED",
          createdBy: session.id,
          lines: {
            create: closingHeader.lines.map((line) => ({
              companyId: session.companyId,
              accountId: line.accountId,
              debit: Number(line.credit),
              credit: Number(line.debit),
              currencyCode: line.currencyCode ?? undefined,
              foreignAmount:
                line.foreignAmount !== null && line.foreignAmount !== undefined
                  ? Number(line.foreignAmount)
                  : undefined,
              exchangeRate:
                line.exchangeRate !== null && line.exchangeRate !== undefined
                  ? Number(line.exchangeRate)
                  : undefined,
              baseAmount:
                line.baseAmount !== null && line.baseAmount !== undefined
                  ? Number(line.baseAmount)
                  : undefined,
              memo: `Reversal of ${closingHeader.entryNumber}`,
            })),
          },
        },
      });

      const accountDeltas = new Map<string, number>();
      for (const line of closingHeader.lines) {
        const delta = Number(line.credit) - Number(line.debit);
        accountDeltas.set(
          line.accountId,
          (accountDeltas.get(line.accountId) || 0) + delta,
        );
      }

      await Promise.all(
        Array.from(accountDeltas.entries()).map(([accountId, delta]) =>
          tx.accounts.update({
            where: { id: accountId },
            data: {
              balance: {
                increment: delta,
              },
            },
          }),
        ),
      );

      await tx.fiscal_periods.update({
        where: { id: fiscalYear.id },
        data: {
          is_closed: false,
          closed_by: null,
          closed_at: null,
        },
      });

      return {
        success: true,
        message: "تمت إعادة فتح السنة المالية وعكس قيد الإقفال",
        reversalEntryNumber,
      };
    });

    return Response.json(result);
  } catch (error: any) {
    console.error("Error reopening fiscal year:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to reopen fiscal year",
      },
      { status: 500 },
    );
  }
}
