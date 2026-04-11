"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
import { revalidatePath } from "next/cache";

/**
 * Automatic Journal Entry Creation for Business Transactions
 * This integrates your existing IMS transactions with the Chart of Accounts
 */

// Helper: Get account mapping
async function getUserCompany() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { companyId: true },
  });

  if (!user) throw new Error("User not found");
  return { userId: session.userId, companyId: user.companyId };
}

async function getAccountMapping(companyId: string, mappingType: string) {
  const mapping = await prisma.account_mappings.findFirst({
    where: {
      company_id: companyId,
      mapping_type: mappingType,
      is_default: true,
    },
  });

  if (!mapping) {
    throw new Error(`Account mapping not found for ${mappingType}`);
  }

  return mapping.account_id;
}

// Helper: Generate entry number
function generateEntryNumber(companyId: string) {
  const year = new Date().getFullYear();
  const timestamp = Date.now();
  return `JE-${year}-${timestamp}`;
}

// Helper: Create journal entry
async function createJournalEntry(data: {
  companyId: string;
  accountId: string;
  description: string;
  debit: number;
  credit: number;
  referenceType: string;
  referenceId: string;
  userId: string;
  entryDate?: Date;
}) {
  const entryNumber = generateEntryNumber(data.companyId);
  const fiscalPeriod = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return await prisma.journal_entries.create({
    data: {
      company_id: data.companyId,
      entry_number: entryNumber,
      account_id: data.accountId,
      description: data.description,
      entry_date: data.entryDate || new Date(),
      debit: data.debit,
      credit: data.credit,
      is_posted: true,
      is_automated: true,
      reference_type: data.referenceType,
      reference_id: data.referenceId,
      fiscal_period: fiscalPeriod,
      created_by: data.userId,
    },
  });
}

/**
 * 1. SALES TRANSACTION - Creates journal entries when a sale is made
 *
 * Journal Entry Example:
 * - Debit: Cash/Bank (Asset) - $1,000
 * - Credit: Sales Revenue (Revenue) - $900
 * - Credit: Sales Tax Payable (Liability) - $100
 * - Debit: Cost of Goods Sold (Expense) - $600
 * - Credit: Inventory (Asset) - $600
 */

export async function getVouchers(
  companyId: string,
  searchQuery: string = "",
  from?: string,
  to?: string,
  page: number = 1, // 0-indexed page number
  pageSize: number = 13,
  sort?: SortingState,
) {
  try {
    const orderBy = sort?.length
      ? { [sort[0].id]: sort[0].desc ? "desc" : "asc" }
      : { createdAt: "desc" as const };
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    const fromatDate = from ? new Date(from).toISOString() : startOfToday;
    const toDate = to ? new Date(to).toISOString() : endOfToday;
    const combinedWhere: Prisma.FinancialTransactionWhereInput = {
      companyId,
    };
    if (fromatDate || toDate) {
      combinedWhere.createdAt = {
        ...(fromatDate && {
          gte: fromatDate,
        }),
        ...(toDate && {
          lte: toDate,
        }),
      };
    }

    const vouchers = await prisma.financialTransaction.findMany({
      include: {
        customer: { select: { name: true } },
        supplier: { select: { name: true } },
        employee: { select: { name: true } },
        invoice: { select: { invoiceNumber: true } },
        expense: { select: { expense_number: true } },
      },
      where: combinedWhere,
      skip: page * pageSize,
      take: pageSize,
      orderBy,
    });
    const result = serializeData(vouchers);
    return { success: true, data: result };
  } catch (error) {
    console.error("Failed to fetch vouchers:", error);
    return { success: false, error: "حدث خطأ أثناء جلب السندات" };
  }
}

export async function getProfitAndLoss(
  companyId: string,
  startDate: Date,
  endDate: Date,
) {
  const revenue = await prisma.accounts.findMany({
    where: {
      company_id: companyId,
      account_type: "REVENUE",
      is_active: true,
    },
    include: {
      journalLines: {
        where: {
          header: {
            status: "POSTED",
            entryDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    },
  });

  const expenses = await prisma.accounts.findMany({
    where: {
      company_id: companyId,
      account_type: { in: ["EXPENSE", "COST_OF_GOODS"] },
      is_active: true,
    },
    include: {
      journalLines: {
        where: {
          header: {
            status: "POSTED",
            entryDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        },
      },
    },
  });

  // Calculate totals
  const totalRevenue = revenue.reduce((sum, account) => {
    const accountTotal = account.journalLines.reduce((accSum, entry) => {
      return accSum + Number(entry.credit) - Number(entry.debit);
    }, 0);
    return sum + accountTotal;
  }, 0);

  const totalExpenses = expenses.reduce((sum, account) => {
    const accountTotal = account.journalLines.reduce((accSum, entry) => {
      return accSum + Number(entry.debit) - Number(entry.credit);
    }, 0);
    return sum + accountTotal;
  }, 0);

  const netIncome = totalRevenue - totalExpenses;

  return {
    revenue: revenue.map((acc) => ({
      name: acc.account_name_en,
      amount: acc.journalLines.reduce(
        (sum, e) => sum + Number(e.credit) - Number(e.debit),
        0,
      ),
    })),
    expenses: expenses.map((acc) => ({
      name: acc.account_name_en,
      amount: acc.journalLines.reduce(
        (sum, e) => sum + Number(e.debit) - Number(e.credit),
        0,
      ),
    })),
    totalRevenue,
    totalExpenses,
    netIncome,
  };
}

// Balance Sheet
export async function getBalanceSheet(asOfDate: Date) {
  try {
    // Normalize date
    const endDate = new Date(asOfDate);
    endDate.setHours(23, 59, 59, 999);
    const session = await getSession();
    if (!session) {
      throw new Error("Unauthorized");
    }
    // 1️⃣ Fetch balances per account
    const rows = await prisma.journalLine.groupBy({
      by: ["accountId"],
      where: {
        companyId: session.companyId,
        header: { entryDate: { lte: endDate } },
        account: {
          account_type: {
            in: ["ASSET", "LIABILITY", "EQUITY"],
          },
        },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    // 2️⃣ Fetch account metadata
    const accountIds = rows.map((r) => r.accountId);

    const accounts = await prisma.accounts.findMany({
      where: {
        id: { in: accountIds },
        company_id: session.companyId,
      },
      select: {
        id: true,
        account_name_ar: true,
        account_name_en: true,
        account_type: true,
      },
    });

    // 3️⃣ Map balances
    const mapped = rows.map((r) => {
      const acc = accounts.find((a) => a.id === r.accountId)!;
      const balance = Number(r._sum.debit || 0) - Number(r._sum.credit || 0);

      return {
        id: acc.id,
        name_ar: acc.account_name_ar,
        name_en: acc.account_name_en,
        type: acc.account_type,
        balance,
      };
    });

    // 4️⃣ Split sections
    const assets = mapped.filter((a) => a.type === "ASSET");
    const liabilities = mapped.filter((a) => a.type === "LIABILITY");
    const equity = mapped.filter((a) => a.type === "EQUITY");

    const totalAssets = assets.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = liabilities.reduce((s, a) => s + a.balance, 0);
    const totalEquity = totalAssets - totalLiabilities;

    return {
      success: true,
      data: {
        asOfDate: endDate.toISOString(),
        assets,
        liabilities,
        equity,
        totals: {
          assets: totalAssets,
          liabilities: Math.abs(totalLiabilities),
          equity: Math.abs(totalEquity),
          liabilitiesPlusEquity: Math.abs(totalLiabilities + totalEquity),
        },
      },
    };
  } catch (error) {
    console.error("Balance Sheet error:", error);
    return {
      success: false,
      error: "فشل إنشاء الميزانية العمومية",
    };
  }
}

/**
 * 7. TRIAL BALANCE
 */
export async function getExpenseCategories() {
  const company = await getSession();
  if (!company) return [];
  const expenseAccounts = await prisma.accounts.findMany({
    where: {
      company_id: company.companyId,
      is_active: true,
    },
    select: {
      id: true,
      account_name_en: true,
      currency_code: true,
    },
    orderBy: {
      account_code: "asc",
    },
  });
  const name = expenseAccounts.map((i) => ({
    id: i.id,
    name: i.account_name_en,
    currency_code: i.currency_code,
  }));
  return name;
}
export async function getTrialBalance(companyId: string, asOfDate: Date) {
  const accounts = await prisma.accounts.findMany({
    where: {
      company_id: companyId,
      is_active: true,
    },
    include: {
      journalLines: {
        where: {
          header: { status: "POSTED", entryDate: { lte: asOfDate } },
        },
      },
    },
    orderBy: { account_code: "asc" },
  });

  let totalDebits = 0;
  let totalCredits = 0;

  const trialBalance = accounts.map((account) => {
    const debitSum = account.journalLines.reduce(
      (sum, e) => sum + Number(e.debit),
      0,
    );
    const creditSum = account.journalLines.reduce(
      (sum, e) => sum + Number(e.credit),
      0,
    );

    totalDebits += debitSum;
    totalCredits += creditSum;

    const balance = debitSum - creditSum;

    return {
      code: account.account_code,
      name: account.account_name_en,
      type: account.account_type,
      debit: debitSum,
      credit: creditSum,
      balance: balance,
      debitBalance: balance > 0 ? balance : 0,
      creditBalance: balance < 0 ? Math.abs(balance) : 0,
    };
  });

  return {
    accounts: trialBalance,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(totalDebits - totalCredits) < 0.01, // Account for floating point
  };
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
export async function getJournalEntries(
  account_id?: string,
  isPosted?: string,
  from?: string,
  to?: string,
  page: number = 1,
  pageSize: number = 7,
  sort?: SortingState,
) {
  console.log(account_id);
  const company = await getSession();
  if (!company) return [];
  const whereClause: Prisma.JournalHeaderWhereInput = {
    companyId: company.companyId,
    ...(isPosted ? { status: isPosted } : {}),
  };
  const fromatDate = from ? new Date(from).toISOString() : undefined;
  const toDate = to ? new Date(to).toISOString() : undefined;

  if (fromatDate || toDate) {
    whereClause.entryDate = {
      ...(fromatDate && {
        gte: fromatDate,
      }),
      ...(toDate && {
        lte: toDate,
      }),
    };
  }

  if (account_id) {
    whereClause.lines = {
      some: {
        accountId: account_id,
      },
    };
  }

  const total = await prisma.journalHeader.count({ where: whereClause });
  const entries = await prisma.journalHeader.findMany({
    where: whereClause,
    select: {
      id: true,

      entryNumber: true,
      entryDate: true,
      description: true,
      lines: {
        ...(account_id ? { where: { accountId: account_id } } : {}),
        select: {
          debit: true,
          currencyCode: true,
          credit: true,
          memo: true,
          account: {
            select: {
              account_code: true,
              account_name_en: true,
              account_name_ar: true,
            },
          },
        },
      },
      status: true,
      createdBy: true,
      referenceType: true,

      createdUser: {
        select: { name: true, email: true },
      },
    },
    skip: page * pageSize,
    take: pageSize,
    orderBy: sort?.length
      ? { [sort[0].id]: sort[0].desc ? "desc" : "asc" }
      : { entryDate: "desc" as const }, // ✅ Order latest first
  });
  // const userIds = entries
  //   .map((e) => e.posted_by)
  //   .filter((id): id is string => id !== null); // 👈 type guard
  // const users = await prisma.user.findMany({
  //   where: { id: { in: userIds } },
  //   select: { id: true, name: true, email: true },
  // });

  // 👇 حوّل أي قيم رقمية إلى أرقام حقيقية
  const data = entries.map((entry) => ({
    id: entry.id,
    entryNumber: entry.entryNumber,
    entryDate: entry.entryDate.toISOString(),
    description: entry.description,
    status: entry.status,
    referenceType: entry.referenceType,
    createdBy: entry.createdBy,
    createdUser: entry.createdUser,
    lines: entry.lines.map((line) => ({
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      currencyCode: line.currencyCode,
      memo: line.memo,
      account: line.account,
    })),
    debit: entry.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0),
    credit: entry.lines.reduce(
      (sum, line) => sum + Number(line.credit || 0),
      0,
    ),
    total,
  }));

  return serializeData(data);
}
export async function getJournalEntrie(account_id?: string) {
  console.log(account_id);
  const company = await getSession();
  if (!company) return [];

  const total = await prisma.journalLine.count({
    where: { companyId: company.companyId },
  });

  const lines = await prisma.journalLine.findMany({
    where: {
      companyId: company.companyId,
      ...(account_id ? { accountId: account_id } : {}),
    },
    select: {
      id: true,
      debit: true,
      credit: true,
      currencyCode: true,
      memo: true,
      account: {
        select: {
          account_code: true,
          account_name_en: true,
          account_name_ar: true,
        },
      },
      header: {
        select: {
          entryNumber: true,
          entryDate: true,
          description: true,
          status: true,
          referenceType: true,
          createdUser: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { header: { entryDate: "desc" } },
  });

  const data = lines.map((line) => ({
    id: line.id,
    entry_number: line.header.entryNumber,
    entry_date: line.header.entryDate,
    description: line.memo || line.header.description || "",
    debit: Number(line.debit) || 0,
    credit: Number(line.credit) || 0,
    is_posted: line.header.status === "POSTED",
    is_automated: Boolean(line.header.referenceType),
    reference_type: line.header.referenceType,
    reference_id: null,
    fiscal_period: null,
    accounts: {
      account_code: line.account.account_code,
      account_name_ar: line.account.account_name_ar,
      account_name_en: line.account.account_name_en,
    },
    posted_by: null,
    users_journal_entries_created_byTousers: line.header.createdUser
      ? {
          name: line.header.createdUser.name,
          email: line.header.createdUser.email,
        }
      : null,
    users_journal_entries_updated_byTousers: null,
    total,
  }));

  return data;
}
/**
 * 8. ACCOUNT LEDGER (Transaction History)
 */
export async function getAccountLedger(
  id: string,
  company_id: string,
  startDate?: Date,
  endDate?: Date,
) {
  const account = await prisma.accounts.findFirst({
    where: {
      id,
      company_id,
    },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  const dateFilter: any = { status: "POSTED" };
  if (startDate || endDate) {
    dateFilter.entryDate = {};
    if (startDate) dateFilter.entryDate.gte = startDate;
    if (endDate) dateFilter.entryDate.lte = endDate;
  }

  const entries = await prisma.journalLine.findMany({
    where: {
      accountId: id,
      header: dateFilter,
    },
    include: { header: true },
    // orderBy: { header: { entryDate: "asc" } },
  });

  let runningBalance = Number(account.opening_balance) || 0;

  const ledger = entries.map((entry) => {
    const debit = Number(entry.debit);
    const credit = Number(entry.credit);
    runningBalance += debit - credit;

    return {
      date: entry.header.entryDate,
      entryNumber: entry.header.entryNumber,
      description: entry.memo || entry.header.description,
      referenceType: entry.header.referenceType,
      referenceId: entry.header.referenceId,
      debit,
      credit,
      balance: runningBalance,
    };
  });
  console.log(ledger);
  return {
    account: {
      code: account.account_code,
      name: account.account_name_en,
      type: account.account_type,
      openingBalance: account.opening_balance,
    },
    entries: ledger,
    closingBalance: runningBalance,
  };
}
export async function getLatestJournalEntries(accountId: string) {
  const companyId = await getSession();
  console.log(accountId);
  if (!companyId) return;
  const entries = await prisma.journalLine.findMany({
    where: {
      companyId: companyId.companyId,
      accountId,
      header: { status: "POSTED" },
    },
    orderBy: { header: { entryDate: "desc" } },
    take: 5,
    include: {
      account: true,
      header: true,
    },
  });

  if (!entries || entries.length === 0) return [];

  let runningBalance = 0;
  const ledger = entries.map((entry) => {
    const debit = Number(entry.debit || 0);
    const credit = Number(entry.credit || 0);
    runningBalance += debit - credit;

    return {
      id: entry.id,
      date: entry.header.entryDate,
      description: entry.memo || entry.header.description || "",
      debit,
      credit,
      balance: runningBalance,
      account: {
        code: entry.account.account_code,
        name: entry.account.account_name_en,
      },
    };
  });
  console.log(ledger);
  return ledger;
}
export async function UpateJournalEntriesPosting(
  entry_numbers: string[], // 👈 now accepts an array
  is_posted: boolean,
) {
  console.log(entry_numbers);
  try {
    const { companyId, userId } = await getUserCompany();

    const updatePost = await prisma.journalHeader.updateMany({
      where: {
        companyId,
        entryNumber: { in: entry_numbers },
      },
      data: {
        status: is_posted ? "POSTED" : "DRAFT",
        updatedAt: new Date(),
      },
    });

    revalidatePath("/journalEntry");
    return { success: true, data: updatePost };
  } catch (error) {
    console.error("Error updating journal entries:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update journal entries",
    };
  }
}
