import prisma from "@/lib/prisma";
import { assertCompanySubscriptionActive } from "@/lib/actions/subscription";
import { getSession } from "@/lib/session";
import { NextRequest } from "next/server";

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE" | "COST_OF_GOODS";

type BalanceSnapshot = {
  accountId: string;
  accountType: AccountType;
  currencyCode: string | null;
  signedBase: number;
  signedForeign: number;
};

type ProfitLossSnapshot = {
  accountId: string;
  accountType: Extract<AccountType, "REVENUE" | "EXPENSE" | "COST_OF_GOODS">;
  accountNameAr: string | null;
  accountNameEn: string | null;
  signedBase: number;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function buildPeriodName(startDate: Date, endDate: Date) {
  return `${startDate.getFullYear()}-${endDate.getFullYear()}`;
}

function isDebitNature(accountType: AccountType) {
  return accountType === "ASSET" || accountType === "EXPENSE" || accountType === "COST_OF_GOODS";
}

function normalizeSignedBalance(
  accountType: AccountType,
  debit: number,
  credit: number,
  explicitAmount?: number | null,
) {
  const raw = explicitAmount !== null && explicitAmount !== undefined ? explicitAmount : debit - credit;
  return isDebitNature(accountType) ? raw : -raw;
}

function buildSignedAmounts(
  accountType: AccountType,
  signedAmount: number,
) {
  if (signedAmount === 0) {
    return { debit: 0, credit: 0 };
  }

  if (isDebitNature(accountType)) {
    return signedAmount >= 0
      ? { debit: Math.abs(signedAmount), credit: 0 }
      : { debit: 0, credit: Math.abs(signedAmount) };
  }

  return signedAmount >= 0
    ? { debit: 0, credit: Math.abs(signedAmount) }
    : { debit: Math.abs(signedAmount), credit: 0 };
}

async function buildBalanceSnapshots(
  tx: Parameters<typeof prisma.$transaction>[0] extends (arg: infer T) => any ? T : never,
  companyId: string,
  endDate: Date,
) {
  const balanceSheetAccounts = await tx.accounts.findMany({
    where: {
      company_id: companyId,
      account_type: { in: ["ASSET", "LIABILITY", "EQUITY"] },
    },
    select: {
      id: true,
      account_type: true,
    },
  });

  const accountTypeMap = new Map(
    balanceSheetAccounts.map((account) => [account.id, account.account_type as AccountType]),
  );

  const lines = await tx.journalLine.findMany({
    where: {
      companyId,
      accountId: { in: balanceSheetAccounts.map((account) => account.id) },
      header: {
        status: "POSTED",
        entryDate: { lte: endOfDay(endDate) },
      },
    },
    select: {
      accountId: true,
      debit: true,
      credit: true,
      currencyCode: true,
      baseAmount: true,
      foreignAmount: true,
    },
  });

  const snapshotMap = new Map<string, BalanceSnapshot>();

  for (const line of lines) {
    const accountType = accountTypeMap.get(line.accountId);
    if (!accountType) continue;

    const signedBase = normalizeSignedBalance(
      accountType,
      Number(line.debit),
      Number(line.credit),
      line.baseAmount !== null && line.baseAmount !== undefined
        ? Number(line.baseAmount) * (Number(line.debit) > 0 ? 1 : Number(line.credit) > 0 ? -1 : 0)
        : undefined,
    );

    const signedForeign = normalizeSignedBalance(
      accountType,
      Number(line.debit),
      Number(line.credit),
      line.foreignAmount !== null && line.foreignAmount !== undefined
        ? Number(line.foreignAmount) * (Number(line.debit) > 0 ? 1 : Number(line.credit) > 0 ? -1 : 0)
        : line.currencyCode
          ? undefined
          : Number(line.debit) - Number(line.credit),
    );

    const key = `${line.accountId}::${line.currencyCode ?? "BASE"}`;
    const current = snapshotMap.get(key) ?? {
      accountId: line.accountId,
      accountType,
      currencyCode: line.currencyCode,
      signedBase: 0,
      signedForeign: 0,
    };

    current.signedBase += signedBase;
    current.signedForeign += signedForeign;
    snapshotMap.set(key, current);
  }

  return Array.from(snapshotMap.values()).filter(
    (snapshot) =>
      Math.abs(snapshot.signedBase) > 0.004 || Math.abs(snapshot.signedForeign) > 0.004,
  );
}

async function buildProfitLossSnapshots(
  tx: Parameters<typeof prisma.$transaction>[0] extends (arg: infer T) => any ? T : never,
  companyId: string,
  fromDate: Date,
  toDate: Date,
) {
  const profitLossAccounts = await tx.accounts.findMany({
    where: {
      company_id: companyId,
      account_type: { in: ["REVENUE", "EXPENSE", "COST_OF_GOODS"] },
    },
    select: {
      id: true,
      account_type: true,
      account_name_ar: true,
      account_name_en: true,
    },
  });

  const accountMap = new Map(
    profitLossAccounts.map((account) => [
      account.id,
      {
        accountType: account.account_type as ProfitLossSnapshot["accountType"],
        accountNameAr: account.account_name_ar,
        accountNameEn: account.account_name_en,
      },
    ]),
  );

  const lines = await tx.journalLine.findMany({
    where: {
      companyId,
      accountId: { in: profitLossAccounts.map((account) => account.id) },
      header: {
        status: "POSTED",
        entryDate: {
          gte: startOfDay(fromDate),
          lte: endOfDay(toDate),
        },
      },
    },
    select: {
      accountId: true,
      debit: true,
      credit: true,
      baseAmount: true,
    },
  });

  const snapshotMap = new Map<string, ProfitLossSnapshot>();

  for (const line of lines) {
    const account = accountMap.get(line.accountId);
    if (!account) continue;

    const signedBase = normalizeSignedBalance(
      account.accountType,
      Number(line.debit),
      Number(line.credit),
      line.baseAmount !== null && line.baseAmount !== undefined
        ? Number(line.baseAmount) *
            (Number(line.debit) > 0 ? 1 : Number(line.credit) > 0 ? -1 : 0)
        : undefined,
    );

    const current = snapshotMap.get(line.accountId) ?? {
      accountId: line.accountId,
      accountType: account.accountType,
      accountNameAr: account.accountNameAr,
      accountNameEn: account.accountNameEn,
      signedBase: 0,
    };

    current.signedBase += signedBase;
    snapshotMap.set(line.accountId, current);
  }

  return Array.from(snapshotMap.values()).filter(
    (snapshot) => Math.abs(snapshot.signedBase) > 0.004,
  );
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

    const result = await prisma.$transaction(
      async (tx) => {
        const fiscalYear = await tx.fiscal_periods.findUnique({
          where: { id: fiscalYearId },
          select: {
            id: true,
            company_id: true,
            period_name: true,
            start_date: true,
            end_date: true,
            is_closed: true,
            companies: {
              select: {
                base_currency: true,
              },
            },
          },
        });

        if (!fiscalYear) {
          throw new Error("السنة المالية غير موجودة");
        }

        if (fiscalYear.company_id !== session.companyId) {
          throw new Error("Unauthorized");
        }

        if (fiscalYear.is_closed) {
          throw new Error("السنة المالية مقفلة بالفعل");
        }

        const mappings = await tx.account_mappings.findMany({
          where: {
            company_id: session.companyId,
            is_default: true,
          },
          select: {
            mapping_type: true,
            account_id: true,
          },
        });

        const getMappedAccount = (mappingType: string) =>
          mappings.find((mapping) => mapping.mapping_type === mappingType)?.account_id;

        const retainedEarningsId = getMappedAccount("retained_earnings");
        const openingBalanceEquityId = getMappedAccount("opening_balance_equity");
        const fxGainId = getMappedAccount("fx_gain");
        const fxLossId = getMappedAccount("fx_loss");

        if (!retainedEarningsId) {
          throw new Error("حساب الأرباح المحتجزة غير مضبوط في الربط المحاسبي");
        }

        const baseCurrency = fiscalYear.companies.base_currency;
        const balanceSnapshots = await buildBalanceSnapshots(
          tx,
          session.companyId,
          new Date(fiscalYear.end_date),
        );

        const nonBaseSnapshots = balanceSnapshots.filter(
          (snapshot) =>
            snapshot.currencyCode &&
            snapshot.currencyCode !== baseCurrency &&
            Math.abs(snapshot.signedForeign) > 0.004,
        );

        const exchangeRateMap = new Map<string, number>();
        if (nonBaseSnapshots.length > 0) {
          const distinctCurrencies = [...new Set(nonBaseSnapshots.map((snapshot) => snapshot.currencyCode!))];

          for (const currencyCode of distinctCurrencies) {
            const rate = await tx.exchange_rates.findFirst({
              where: {
                company_id: session.companyId,
                from_currency: currencyCode,
                to_currency: baseCurrency,
                date: { lte: endOfDay(new Date(fiscalYear.end_date)) },
              },
              orderBy: { date: "desc" },
              select: { rate: true },
            });

            if (rate) {
              exchangeRateMap.set(currencyCode, Number(rate.rate));
            }
          }
        }

        let fxRevaluationEntryNumber: string | null = null;
        const fxRevaluationLines: Array<{
          companyId: string;
          accountId: string;
          debit: number;
          credit: number;
          currencyCode?: string;
          exchangeRate?: number;
          foreignAmount?: number;
          baseAmount?: number;
          memo: string;
        }> = [];
        const accountBalanceAdjustments = new Map<string, number>();

        if (fxGainId && fxLossId) {
          for (const snapshot of nonBaseSnapshots) {
            const rate = exchangeRateMap.get(snapshot.currencyCode!);
            if (!rate) continue;

            const expectedBase = snapshot.signedForeign * rate;
            const delta = Number((expectedBase - snapshot.signedBase).toFixed(2));
            if (Math.abs(delta) < 0.01) continue;

            const accountEntry = buildSignedAmounts(snapshot.accountType, delta);
            const counterpartyIsGain = isDebitNature(snapshot.accountType)
              ? delta > 0
              : delta < 0;
            const counterpartyAccountId = counterpartyIsGain ? fxGainId : fxLossId;
            const counterpartyType = counterpartyIsGain ? "REVENUE" : "EXPENSE";
            const counterpartyEntry = buildSignedAmounts(counterpartyType, Math.abs(delta));

            fxRevaluationLines.push({
              companyId: session.companyId,
              accountId: snapshot.accountId,
              debit: accountEntry.debit,
              credit: accountEntry.credit,
              currencyCode: snapshot.currencyCode ?? undefined,
              exchangeRate: rate,
              foreignAmount: Math.abs(snapshot.signedForeign),
              baseAmount: Math.abs(delta),
              memo: `Year-end FX revaluation for ${snapshot.currencyCode}`,
            });

            fxRevaluationLines.push({
              companyId: session.companyId,
              accountId: counterpartyAccountId,
              debit: counterpartyEntry.debit,
              credit: counterpartyEntry.credit,
              baseAmount: Math.abs(delta),
              memo: counterpartyIsGain
                ? `Unrealized FX gain on ${snapshot.currencyCode}`
                : `Unrealized FX loss on ${snapshot.currencyCode}`,
            });

            accountBalanceAdjustments.set(
              snapshot.accountId,
              (accountBalanceAdjustments.get(snapshot.accountId) || 0) + delta,
            );
            accountBalanceAdjustments.set(
              counterpartyAccountId,
              (accountBalanceAdjustments.get(counterpartyAccountId) || 0) +
                (counterpartyIsGain ? Math.abs(delta) : -Math.abs(delta)),
            );
          }
        }

        if (fxRevaluationLines.length > 0) {
          fxRevaluationEntryNumber = `FYFX-${fiscalYear.period_name}-${Date.now()}`;

          await tx.journalHeader.create({
            data: {
              companyId: session.companyId,
              entryNumber: fxRevaluationEntryNumber,
              description: `FX revaluation for fiscal year ${fiscalYear.period_name}`,
              referenceType: "fiscal-year-fx-revaluation",
              referenceId: fiscalYear.id,
              entryDate: endOfDay(new Date(fiscalYear.end_date)),
              status: "POSTED",
              createdBy: session.id,
              lines: {
                create: fxRevaluationLines,
              },
            },
          });

          await Promise.all(
            Array.from(accountBalanceAdjustments.entries()).map(([accountId, delta]) =>
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
        }

        const profitLossSnapshots = await buildProfitLossSnapshots(
          tx,
          session.companyId,
          new Date(fiscalYear.start_date),
          new Date(fiscalYear.end_date),
        );

        const revenueAccounts = profitLossSnapshots.filter(
          (account) => account.accountType === "REVENUE",
        );
        const expenseAccounts = profitLossSnapshots.filter(
          (account) =>
            account.accountType === "EXPENSE" ||
            account.accountType === "COST_OF_GOODS",
        );

        const totalRevenue = revenueAccounts.reduce(
          (sum, account) => sum + Math.abs(account.signedBase),
          0,
        );
        const totalExpenses = expenseAccounts.reduce(
          (sum, account) => sum + Math.abs(account.signedBase),
          0,
        );
        const netResult = Number((totalRevenue - totalExpenses).toFixed(2));

        let closingEntryNumber: string | null = null;
        if (
          revenueAccounts.length > 0 ||
          expenseAccounts.length > 0 ||
          netResult !== 0
        ) {
          closingEntryNumber = `FYCLOSE-${fiscalYear.period_name}-${Date.now()}`;

          await tx.journalHeader.create({
            data: {
              companyId: session.companyId,
              entryNumber: closingEntryNumber,
              description: `Closing entries for fiscal year ${fiscalYear.period_name}`,
              referenceType: "fiscal-year-close",
              referenceId: fiscalYear.id,
              entryDate: endOfDay(new Date(fiscalYear.end_date)),
              status: "POSTED",
              createdBy: session.id,
              lines: {
                create: [
                  ...revenueAccounts.map((account) => ({
                    companyId: session.companyId,
                    accountId: account.accountId,
                    debit: Math.abs(account.signedBase),
                    credit: 0,
                    baseAmount: Math.abs(account.signedBase),
                    memo: `Closing revenue account ${account.accountNameEn || account.accountNameAr || account.accountId}`,
                  })),
                  ...expenseAccounts.map((account) => ({
                    companyId: session.companyId,
                    accountId: account.accountId,
                    debit: 0,
                    credit: Math.abs(account.signedBase),
                    baseAmount: Math.abs(account.signedBase),
                    memo: `Closing expense account ${account.accountNameEn || account.accountNameAr || account.accountId}`,
                  })),
                  ...(netResult !== 0
                    ? [
                        {
                          companyId: session.companyId,
                          accountId: retainedEarningsId,
                          debit: netResult < 0 ? Math.abs(netResult) : 0,
                          credit: netResult > 0 ? netResult : 0,
                          baseAmount: Math.abs(netResult),
                          memo:
                            netResult > 0
                              ? "Transfer net profit to retained earnings"
                              : "Transfer net loss to retained earnings",
                        },
                      ]
                    : []),
                ],
              },
            },
          });

          await Promise.all([
            ...revenueAccounts.map((account) =>
              tx.accounts.update({
                where: { id: account.accountId },
                data: { balance: 0 },
              }),
            ),
            ...expenseAccounts.map((account) =>
              tx.accounts.update({
                where: { id: account.accountId },
                data: { balance: 0 },
              }),
            ),
            ...(netResult !== 0
              ? [
                  tx.accounts.update({
                    where: { id: retainedEarningsId },
                    data: {
                      balance: {
                        increment: netResult,
                      },
                    },
                  }),
                ]
              : []),
          ]);
        }

        const currentStart = startOfDay(new Date(fiscalYear.start_date));
        const currentEnd = startOfDay(new Date(fiscalYear.end_date));
        const durationDays =
          Math.round(
            (currentEnd.getTime() - currentStart.getTime()) /
              (24 * 60 * 60 * 1000),
          ) + 1;

        const nextStart = addDays(currentEnd, 1);
        const nextEnd = addDays(nextStart, durationDays - 1);
        const nextPeriodName = buildPeriodName(nextStart, nextEnd);

        const existingNextFiscalYear = await tx.fiscal_periods.findUnique({
          where: {
            company_id_period_name: {
              company_id: session.companyId,
              period_name: nextPeriodName,
            },
          },
          select: { id: true },
        });

        const nextFiscalYear =
          existingNextFiscalYear ??
          (await tx.fiscal_periods.create({
            data: {
              company_id: session.companyId,
              period_name: nextPeriodName,
              start_date: nextStart,
              end_date: nextEnd,
              is_closed: false,
            },
            select: { id: true },
          }));

        const openingSnapshots = await buildBalanceSnapshots(
          tx,
          session.companyId,
          new Date(fiscalYear.end_date),
        );

        const openingSnapshotLines = openingSnapshots.flatMap((snapshot) => {
          const posting = buildSignedAmounts(snapshot.accountType, snapshot.signedBase);
          return posting.debit !== 0 || posting.credit !== 0
            ? [
                {
                  companyId: session.companyId,
                  accountId: snapshot.accountId,
                  debit: posting.debit,
                  credit: posting.credit,
                  currencyCode: snapshot.currencyCode ?? undefined,
                  foreignAmount:
                    snapshot.currencyCode && snapshot.currencyCode !== baseCurrency
                      ? Math.abs(snapshot.signedForeign)
                      : undefined,
                  baseAmount: Math.abs(snapshot.signedBase),
                  memo: `Opening balance snapshot for ${snapshot.currencyCode ?? baseCurrency}`,
                },
              ]
            : [];
        });

        const totalOpeningDebit = openingSnapshotLines.reduce(
          (sum, line) => sum + line.debit,
          0,
        );
        const totalOpeningCredit = openingSnapshotLines.reduce(
          (sum, line) => sum + line.credit,
          0,
        );
        const openingDifference = Number((totalOpeningDebit - totalOpeningCredit).toFixed(2));

        if (Math.abs(openingDifference) >= 0.01 && openingBalanceEquityId) {
          openingSnapshotLines.push({
            companyId: session.companyId,
            accountId: openingBalanceEquityId,
            debit: openingDifference < 0 ? Math.abs(openingDifference) : 0,
            credit: openingDifference > 0 ? Math.abs(openingDifference) : 0,
            currencyCode: undefined,
            foreignAmount: undefined,
            baseAmount: Math.abs(openingDifference),
            memo: "Opening balance equity adjustment",
          });
        }

        let openingSnapshotEntryNumber: string | null = null;
        if (openingSnapshotLines.length > 0) {
          openingSnapshotEntryNumber = `FYOPEN-${nextPeriodName}-${Date.now()}`;
          await tx.journalHeader.create({
            data: {
              companyId: session.companyId,
              entryNumber: openingSnapshotEntryNumber,
              description: `Opening balance snapshot for ${nextPeriodName} based on close ${closingEntryNumber ?? fiscalYear.period_name}`,
              referenceType: "fiscal-year-open",
              referenceId: nextFiscalYear.id,
              entryDate: startOfDay(nextStart),
              status: "OPENING_SNAPSHOT",
              createdBy: session.id,
              lines: {
                create: openingSnapshotLines,
              },
            },
          });
        }

        await tx.fiscal_periods.update({
          where: { id: fiscalYear.id },
          data: {
            is_closed: true,
            closed_by: session.id,
            closed_at: new Date(),
          },
        });

        return {
          success: true,
          message: "تم إغلاق السنة المالية وإنشاء سنة مالية جديدة مع قيود الإقفال وسجل افتتاحي",
          fxRevaluationEntryNumber,
          closingEntryNumber,
          openingSnapshotEntryNumber,
          nextFiscalYearId: nextFiscalYear.id,
          nextPeriodName,
          netResult: Number(netResult.toFixed(2)),
        };
      },
      { timeout: 60000 },
    );

    return Response.json(result);
  } catch (error: any) {
    console.error("Error closing fiscal year:", error);

    return Response.json(
      {
        success: false,
        error: error.message || "Failed to close fiscal year",
      },
      { status: 500 },
    );
  }
}
