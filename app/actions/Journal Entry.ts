"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { Prisma } from "@prisma/client";
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
export async function createSaleWithJournalEntries(
  saleData: any,
  userId: string,
  companyId: string,
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the sale (your existing logic)
    const sale = await tx.sale.create({
      data: {
        ...saleData,
        companyId,
      },
      include: {
        saleItems: true,
      },
    });

    // 2. Get account mappings
    const cashAccountId = await getAccountMapping(companyId, "cash");
    const revenueAccountId = await getAccountMapping(
      companyId,
      "sales_revenue",
    );
    const taxAccountId = await getAccountMapping(companyId, "sales_tax");
    const cogsAccountId = await getAccountMapping(companyId, "cogs");
    const inventoryAccountId = await getAccountMapping(companyId, "inventory");

    // 3. Create journal entries for the sale

    // 3a. Record cash received
    await createJournalEntry({
      companyId,
      accountId: cashAccountId,
      description: `Cash from sale ${sale.saleNumber}`,
      debit: Number(sale.totalAmount),
      credit: 0,
      referenceType: "sale",
      referenceId: sale.id,
      userId,
    });

    // 3b. Record revenue
    await createJournalEntry({
      companyId,
      accountId: revenueAccountId,
      description: `Revenue from sale ${sale.saleNumber}`,
      debit: 0,
      credit: Number(sale.subtotal),
      referenceType: "sale",
      referenceId: sale.id,
      userId,
    });

    // 3c. Record sales tax (if any)
    if (Number(sale.taxAmount) >= 0) {
      await createJournalEntry({
        companyId,
        accountId: taxAccountId,
        description: `Sales tax for ${sale.saleNumber}`,
        debit: 0,
        credit: Number(sale.taxAmount),
        referenceType: "sale",
        referenceId: sale.id,
        userId,
      });
    }

    // 3d. Record COGS and inventory reduction
    let totalCost = 0;
    for (const item of sale.saleItems) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { costPrice: true },
      });
      totalCost += Number(product?.costPrice) * item.quantity;
    }

    // COGS (Debit)
    await createJournalEntry({
      companyId,
      accountId: cogsAccountId,
      description: `COGS for sale ${sale.saleNumber}`,
      debit: totalCost,
      credit: 0,
      referenceType: "sale",
      referenceId: sale.id,
      userId,
    });

    // Inventory reduction (Credit)
    await createJournalEntry({
      companyId,
      accountId: inventoryAccountId,
      description: `Inventory sold - ${sale.saleNumber}`,
      debit: 0,
      credit: totalCost,
      referenceType: "sale",
      referenceId: sale.id,
      userId,
    });

    // 4. Update account balances
    await tx.accounts.update({
      where: { id: cashAccountId },
      data: { balance: { increment: sale.totalAmount } },
    });

    await tx.accounts.update({
      where: { id: revenueAccountId },
      data: { balance: { increment: sale.subtotal } },
    });

    await tx.accounts.update({
      where: { id: inventoryAccountId },
      data: { balance: { decrement: totalCost } },
    });

    return sale;
  });
}

/**
 * 2. PURCHASE TRANSACTION - Creates journal entries when purchasing inventory
 *
 * Journal Entry:
 * - Debit: Inventory (Asset) - $5,000
 * - Credit: Accounts Payable (Liability) - $5,000
 */
export async function createPurchaseWithJournalEntries(
  purchaseData: any,
  userId: string,
  companyId: string,
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the purchase
    const purchase = await tx.purchase.create({
      data: {
        ...purchaseData,
        companyId,
      },
      include: {
        purchaseItems: true,
      },
    });

    // 2. Get account mappings
    const inventoryAccountId = await getAccountMapping(companyId, "inventory");
    const payableAccountId = await getAccountMapping(
      companyId,
      "accounts_payable",
    );

    // 3. Create journal entries

    // Inventory increase (Debit)
    await createJournalEntry({
      companyId,
      accountId: inventoryAccountId,
      description: `Inventory purchase from ${purchase.supplierId}`,
      debit: Number(purchase.totalAmount),
      credit: 0,
      referenceType: "purchase",
      referenceId: purchase.id,
      userId,
    });

    // Accounts Payable (Credit)
    await createJournalEntry({
      companyId,
      accountId: payableAccountId,
      description: `Payable for purchase #${purchase.id}`,
      debit: 0,
      credit: Number(purchase.totalAmount),
      referenceType: "purchase",
      referenceId: purchase.id,
      userId,
    });

    // 4. Update account balances
    await tx.accounts.update({
      where: { id: inventoryAccountId },
      data: { balance: { increment: purchase.totalAmount } },
    });

    await tx.accounts.update({
      where: { id: payableAccountId },
      data: { balance: { increment: purchase.totalAmount } },
    });

    return purchase;
  });
}

/**
 * 3. EXPENSE TRANSACTION
 *
 * Journal Entry:
 * - Debit: Expense Account - $500
 * - Credit: Cash (Asset) - $500
 */
export async function createExpenseWithJournalEntries(
  expenseData: any,
  userId: string,
  companyId: string,
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the expense
    const expense = await tx.expenses.create({
      data: {
        ...expenseData,
        company_id: companyId,
        user_id: userId,
      },
    });

    // 2. Get account mappings
    const cashAccountId = await getAccountMapping(companyId, "cash");

    // Get or create expense category account
    let expenseAccountId;
    if (expense.category_id) {
      const category = await tx.expense_categories.findUnique({
        where: { id: expense.category_id },
      });

      // Find corresponding expense account (you'd need to link categories to accounts)
      const expenseAccount = await tx.accounts.findFirst({
        where: {
          company_id: companyId,
          account_category: "OPERATING_EXPENSES",
          account_name_en: {
            contains: category?.name,
          },
        },
      });

      expenseAccountId =
        expenseAccount?.id ||
        (await getAccountMapping(companyId, "operating_expenses"));
    }

    // 3. Create journal entries

    // Expense (Debit)
    await createJournalEntry({
      companyId,
      accountId: expenseAccountId ?? "",
      description: `Expense: ${expense.description}`,
      debit: Number(expense.amount),
      credit: 0,
      referenceType: "expense",
      referenceId: expense.id,
      userId,
    });

    // Cash reduction (Credit)
    await createJournalEntry({
      companyId,
      accountId: cashAccountId,
      description: `Payment for expense: ${expense.description}`,
      debit: 0,
      credit: Number(expense.amount),
      referenceType: "expense",
      referenceId: expense.id,
      userId,
    });

    // 4. Update account balances
    await tx.accounts.update({
      where: { id: expenseAccountId },
      data: { balance: { increment: expense.amount } },
    });

    await tx.accounts.update({
      where: { id: cashAccountId },
      data: { balance: { decrement: expense.amount } },
    });

    return expense;
  });
}

/**
 * 4. PAYMENT RECEIVED FROM CUSTOMER
 *
 * Journal Entry:
 * - Debit: Cash/Bank (Asset) - $1,000
 * - Credit: Accounts Receivable (Asset) - $1,000
 */
export async function recordCustomerPaymentWithJournalEntries(
  paymentData: any,
  userId: string,
  companyId: string,
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the payment
    const payment = await tx.payment.create({
      data: {
        ...paymentData,
        companyId,
        cashierId: userId,
      },
    });

    // 2. Get account mappings
    const cashAccountId = await getAccountMapping(
      companyId,
      paymentData.paymentMethod === "cash" ? "cash" : "bank",
    );
    const receivableAccountId = await getAccountMapping(
      companyId,
      "accounts_receivable",
    );

    // 3. Create journal entries

    // Cash/Bank increase (Debit)
    await createJournalEntry({
      companyId,
      accountId: cashAccountId,
      description: `Payment received from customer`,
      debit: Number(payment.amount),
      credit: 0,
      referenceType: "payment",
      referenceId: payment.id,
      userId,
    });

    // Accounts Receivable decrease (Credit)
    await createJournalEntry({
      companyId,
      accountId: receivableAccountId,
      description: `Customer payment - ${payment.referenceNumber || "N/A"}`,
      debit: 0,
      credit: Number(payment.amount),
      referenceType: "payment",
      referenceId: payment.id,
      userId,
    });

    // 4. Update account balances
    await tx.accounts.update({
      where: { id: cashAccountId },
      data: { balance: { increment: payment.amount } },
    });

    await tx.accounts.update({
      where: { id: receivableAccountId },
      data: { balance: { decrement: payment.amount } },
    });

    return payment;
  });
}

/**
 * 5. SUPPLIER PAYMENT
 *
 * Journal Entry:
 * - Debit: Accounts Payable (Liability) - $3,000
 * - Credit: Cash/Bank (Asset) - $3,000
 */
export async function recordSupplierPaymentWithJournalEntries(
  paymentData: any,
  userId: string,
  companyId: string,
) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the supplier payment
    const payment = await tx.supplierPayment.create({
      data: {
        ...paymentData,
        companyId,
      },
    });

    // 2. Get account mappings
    const cashAccountId = await getAccountMapping(
      companyId,
      paymentData.paymentMethod === "cash" ? "cash" : "bank",
    );
    const payableAccountId = await getAccountMapping(companyId, "inventory");

    // 3. Create journal entries

    // Accounts Payable decrease (Debit)
    await createJournalEntry({
      companyId,
      accountId: payableAccountId,
      description: `Payment to supplier`,
      debit: Number(paymentData.amount),
      credit: 0,
      referenceType: "supplier_payment",
      referenceId: paymentData.id,
      userId,
    });

    // Cash/Bank decrease (Credit)
    await createJournalEntry({
      companyId,
      accountId: cashAccountId,
      description: `Supplier payment - ${paymentData.note || "N/A"}`,
      debit: 0,
      credit: Number(paymentData.amount),
      referenceType: "supplier_payment",
      referenceId: paymentData.id,
      userId,
    });

    // 4. Update account balances
    await tx.accounts.update({
      where: { id: payableAccountId },
      data: { balance: { decrement: paymentData.amount } },
    });

    await tx.accounts.update({
      where: { id: cashAccountId },
      data: { balance: { decrement: paymentData.amount } },
    });

    return payment;
  });
}

/**
 * 6. GENERATE FINANCIAL REPORTS
 */

// Profit & Loss Statement
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
      journal_entries: {
        where: {
          is_posted: true,
          entry_date: {
            gte: startDate,
            lte: endDate,
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
      journal_entries: {
        where: {
          is_posted: true,
          entry_date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
    },
  });

  // Calculate totals
  const totalRevenue = revenue.reduce((sum, account) => {
    const accountTotal = account.journal_entries.reduce((accSum, entry) => {
      return accSum + Number(entry.credit) - Number(entry.debit);
    }, 0);
    return sum + accountTotal;
  }, 0);

  const totalExpenses = expenses.reduce((sum, account) => {
    const accountTotal = account.journal_entries.reduce((accSum, entry) => {
      return accSum + Number(entry.debit) - Number(entry.credit);
    }, 0);
    return sum + accountTotal;
  }, 0);

  const netIncome = totalRevenue - totalExpenses;

  return {
    revenue: revenue.map((acc) => ({
      name: acc.account_name_en,
      amount: acc.journal_entries.reduce(
        (sum, e) => sum + Number(e.credit) - Number(e.debit),
        0,
      ),
    })),
    expenses: expenses.map((acc) => ({
      name: acc.account_name_en,
      amount: acc.journal_entries.reduce(
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
export async function getBalanceSheet(companyId: string, asOfDate: Date) {
  const assets = await prisma.accounts.findMany({
    where: {
      company_id: companyId,
      account_type: "ASSET",
      is_active: true,
    },
    include: {
      journal_entries: {
        where: {
          is_posted: true,
          entry_date: { lte: asOfDate },
        },
      },
    },
  });

  const liabilities = await prisma.accounts.findMany({
    where: {
      company_id: companyId,
      account_type: "LIABILITY",
      is_active: true,
    },
    include: {
      journal_entries: {
        where: {
          is_posted: true,
          entry_date: { lte: asOfDate },
        },
      },
    },
  });

  const equity = await prisma.accounts.findMany({
    where: {
      company_id: companyId,
      account_type: "EQUITY",
      is_active: true,
    },
    include: {
      journal_entries: {
        where: {
          is_posted: true,
          entry_date: { lte: asOfDate },
        },
      },
    },
  });

  const calculateBalance = (accounts: any[]) => {
    return accounts.reduce((sum, account) => {
      const accountBalance = account.journal_entries.reduce(
        (accSum: number, entry: any) => {
          return accSum + Number(entry.debit) - Number(entry.credit);
        },
        0,
      );
      return sum + accountBalance;
    }, 0);
  };

  const totalAssets = calculateBalance(assets);
  const totalLiabilities = calculateBalance(liabilities);
  const totalEquity = calculateBalance(equity);

  return {
    assets: assets.map((acc) => ({
      name: acc.account_name_en,
      balance: acc.journal_entries.reduce(
        (sum: number, e: any) => sum + Number(e.debit) - Number(e.credit),
        0,
      ),
    })),
    liabilities: liabilities.map((acc) => ({
      name: acc.account_name_en,
      balance: acc.journal_entries.reduce(
        (sum: number, e: any) => sum + Number(e.credit) - Number(e.debit),
        0,
      ),
    })),
    equity: equity.map((acc) => ({
      name: acc.account_name_en,
      balance: acc.journal_entries.reduce(
        (sum: number, e: any) => sum + Number(e.credit) - Number(e.debit),
        0,
      ),
    })),
    totalAssets,
    totalLiabilities,
    totalEquity,
    equation: totalAssets === totalLiabilities + totalEquity,
  };
}

/**
 * 7. TRIAL BALANCE
 */
export async function getTrialBalance(companyId: string, asOfDate: Date) {
  const accounts = await prisma.accounts.findMany({
    where: {
      company_id: companyId,
      is_active: true,
    },
    include: {
      journal_entries: {
        where: {
          is_posted: true,
          entry_date: { lte: asOfDate },
        },
      },
    },
    orderBy: { account_code: "asc" },
  });

  let totalDebits = 0;
  let totalCredits = 0;

  const trialBalance = accounts.map((account) => {
    const debitSum = account.journal_entries.reduce(
      (sum, e) => sum + Number(e.debit),
      0,
    );
    const creditSum = account.journal_entries.reduce(
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
export async function getJournalEntries(account_id?: string, poste?: boolean) {
  const company = await getSession();
  if (!company) return [];
  const whereClause: {
    company_id: string;
    account_id?: string;
    is_posted?: boolean;
  } = {
    company_id: company.companyId,
    is_posted: poste,
  };

  if (account_id) {
    whereClause.account_id = account_id;
  }
  const entries = await prisma.journal_entries.findMany({
    where: whereClause,
    select: {
      id: true,
      entry_number: true,
      entry_date: true,
      description: true,
      debit: true,
      credit: true,
      is_posted: true,
      is_automated: true,
      reference_type: true,
      fiscal_period: true,
      accounts: {
        select: {
          account_code: true,
          account_name_en: true,
        },
      },
      posted_by: true,
      users_journal_entries_created_byTousers: {
        select: { name: true, email: true },
      },
      users_journal_entries_updated_byTousers: {
        select: { name: true, email: true },
      },
    },
  });

  // 👇 حوّل أي قيم رقمية إلى أرقام حقيقية
  const data = entries.map((entry) => ({
    ...entry,
    debit: Number(entry.debit) || 0,
    credit: Number(entry.credit) || 0,
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
  console.log(id, "here");
  const account = await prisma.accounts.findFirst({
    where: {
      id,
      company_id,
    },
  });

  if (!account) {
    throw new Error("Account not found");
  }

  const dateFilter: any = { is_posted: true };
  if (startDate || endDate) {
    dateFilter.entry_date = {};
    if (startDate) dateFilter.entry_date.gte = startDate;
    if (endDate) dateFilter.entry_date.lte = endDate;
  }

  const entries = await prisma.journal_entries.findMany({
    where: {
      account_id: id,
      ...dateFilter,
    },
    // orderBy: { entry_date: "asc" },
  });

  let runningBalance = Number(account.opening_balance) || 0;

  const ledger = entries.map((entry) => {
    const debit = Number(entry.debit);
    const credit = Number(entry.credit);
    runningBalance += debit - credit;

    return {
      date: entry.entry_date,
      entryNumber: entry.entry_number,
      description: entry.description,
      referenceType: entry.reference_type,
      referenceId: entry.reference_id,
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
  const entries = await prisma.journal_entries.findMany({
    where: {
      company_id: companyId.companyId,
      account_id: accountId,
      is_posted: true,
    },
    orderBy: { entry_date: "desc" },
    take: 5,
    include: {
      accounts: true,
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
      date: entry.entry_date,
      description: entry.description || "",
      debit,
      credit,
      balance: runningBalance,
      account: {
        code: entry.accounts.account_code,
        name: entry.accounts.account_name_en,
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

    const updatePost = await prisma.journal_entries.updateMany({
      where: {
        company_id: companyId,
        entry_number: { in: entry_numbers },
      },
      data: {
        is_posted: is_posted,
        updated_by: userId,
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
