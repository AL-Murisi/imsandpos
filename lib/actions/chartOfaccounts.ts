"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { Prisma } from "@prisma/client";
import { validateFiscalYear } from "./fiscalYear";

// Types
type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE"
  | "COST_OF_GOODS";
type AccountCategory = string;

interface CreateAccountInput {
  account_code: string;
  account_name_en: string;
  account_name_ar?: string;
  account_type: AccountType;
  account_category: AccountCategory;
  parent_id?: string;
  opening_balance?: number;
  description?: string;
  currency_code?: string | null;
  allow_manual_entry?: boolean;
  level: number;
  branchId?: string;
  currency?: string;
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
// Get current user's company
export async function getUserCompany() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { companyId: true },
  });

  if (!user) throw new Error("User not found");
  return { userId: session.userId, companyId: user.companyId };
}

// 1. GET ALL ACCOUNTS
// Ensure you have the necessary imports/types for getUserCompany and prisma

/**
 * Retrieves the Chart of Accounts and calculates summary financial totals.
 * * @returns {Promise<{success: boolean, data?: object, totals?: object, error?: string}>}
 */
// export async function getChartOfAccounts() {
//   try {
//     const { companyId } = await getUserCompany();

//     const accounts = await prisma.accounts.findMany({
//       where: { company_id: companyId },
//       include: {
//         accounts: true, // parent
//         other_accounts: true, // children
//         _count: {
//           select: { journal_entries: true },
//         },
//       },
//       orderBy: [{ account_code: "asc" }],
//     });

//     // 1. Calculate Financial Category Totals
//     const initialTotals = {
//       totalAssets: 0, // إجمالي الأصول
//       totalLiabilities: 0, // إجمالي الخصوم
//       totalRevenue: 0, // إجمالي الإيرادات
//       totalExpenses: 0, // إجمالي المصروفات
//       activeAccountsCount: accounts.length, // الحسابات النشطة
//       netIncome: 0,
//     };

//     const financialTotals = accounts.reduce((acc, account) => {
//       // Assuming 'balance' is the field for the account's current balance
//       // and 'account_type' contains the category in Arabic (e.g., 'أصول', 'خصوم').
//       // Adjust field names (e.g., 'balance', 'account_type') as needed for your schema.
//       const balance = parseFloat(account.balance?.toString() || "0");

//       switch (account.account_type) {
//         case "ASSET":
//           acc.totalAssets += balance;
//           break;
//         case "LIABILITY":
//           acc.totalLiabilities += balance;
//           break;
//         case "REVENUE":
//           acc.totalRevenue += balance;
//           break;
//         case "EXPENSE":
//           acc.totalExpenses += balance;
//           break;
//         default:
//           break;
//       }
//       return acc;
//     }, initialTotals);

//     // Calculate Net Income (صافي الربح)
//     financialTotals.netIncome = Math.abs(
//       financialTotals.totalRevenue - financialTotals.totalExpenses,
//     );

//     // 2. Prepare Detailed Accounts Data
//     const accountsWithChildren = accounts.map((acc) => ({
//       ...acc,
//       hasChildren: acc.other_accounts.length > 0,
//     }));

//     // Assuming 'serializeData' prepares the data for client-side consumption
//     const data = serializeData(accountsWithChildren);
//     const totals = serializeData(financialTotals);
//     // 3. Return both the detailed data and the financial totals
//     return {
//       success: true,
//       data: data,
//       totals: totals, // New object containing all summary figures
//     };
//   } catch (error) {
//     console.error("Get accounts error:", error);
//     return { success: false, error: "فشل في جلب الحسابات" };
//   }
// }

// 2. GET SINGLE ACCOUNT
export async function getChartOfAccounts() {
  try {
    const { companyId } = await getUserCompany();

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { base_currency: true },
    });

    const baseCurrency = company?.base_currency || "YER";

    const accounts = await prisma.accounts.findMany({
      where: { company_id: companyId },
      include: {
        journalLines: {
          where: { header: { status: "POSTED" } },
          select: {
            debit: true,
            credit: true,
            currencyCode: true,
            baseAmount: true,
            foreignAmount: true,
            exchangeRate: true,
          },
        },
        other_accounts: true,
      },
      orderBy: [{ account_code: "asc" }],
    });

    const currencyTotals: Record<
      string,
      { assets: number; liabilities: number; revenue: number; expenses: number }
    > = {};

    const baseTotals = {
      totalAssets: 0,
      totalLiabilities: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      netIncome: 0,
      activeAccountsCount: accounts.length,
    };

    const processedAccounts = accounts.map((account) => {
      const currencyBalances: Record<string, number> = {};
      let baseBalance = 0;

      const isDebitNature =
        account.account_type === "ASSET" || account.account_type === "EXPENSE";

      account.journalLines.forEach((entry) => {
        const currency = entry.currencyCode || baseCurrency;

        /* =========================
           1️⃣ FOREIGN BALANCE
        ========================= */
        const foreign =
          entry.foreignAmount !== null && entry.foreignAmount !== undefined
            ? Number(entry.debit) - Number(entry.credit) >= 0
              ? Number(entry.foreignAmount)
              : -Number(entry.foreignAmount)
            : Number(entry.debit) - Number(entry.credit);

        const foreignChange = isDebitNature ? foreign : -foreign;
        currencyBalances[currency] =
          (currencyBalances[currency] || 0) + foreignChange;

        let baseChange = 0;

        if (entry.baseAmount !== null && entry.baseAmount !== undefined) {
          baseChange =
            Number(entry.debit) - Number(entry.credit) >= 0
              ? Number(entry.baseAmount)
              : -Number(entry.baseAmount);
        } else if (currency === baseCurrency) {
          baseChange = Number(entry.debit) - Number(entry.credit);
        } else {
          const rate = Number(entry.exchangeRate || 1);
          baseChange = (Number(entry.debit) - Number(entry.credit)) * rate;
        }

        baseBalance += isDebitNature ? baseChange : -baseChange;

        /* =========================
           3️⃣ TOTALS BY CURRENCY
        ========================= */
        if (!currencyTotals[currency]) {
          currencyTotals[currency] = {
            assets: 0,
            liabilities: 0,
            revenue: 0,
            expenses: 0,
          };
        }

        if (account.account_type === "ASSET")
          currencyTotals[currency].assets += foreignChange;
        if (account.account_type === "LIABILITY")
          currencyTotals[currency].liabilities += foreignChange;
        if (account.account_type === "REVENUE")
          currencyTotals[currency].revenue += foreignChange;
        if (account.account_type === "EXPENSE")
          currencyTotals[currency].expenses += foreignChange;
      });

      if (account.account_type === "ASSET")
        baseTotals.totalAssets += baseBalance;
      if (account.account_type === "LIABILITY")
        baseTotals.totalLiabilities += baseBalance;
      if (account.account_type === "REVENUE")
        baseTotals.totalRevenue += baseBalance;
      if (account.account_type === "EXPENSE")
        baseTotals.totalExpenses += baseBalance;

      return {
        ...account,
        currencyBalances, // 🔹 foreign balances (USD, YER, etc.)
        calculatedBalance: baseBalance, // 🔹 base currency balance
        hasChildren: account.other_accounts.length > 0,
      };
    });

    baseTotals.netIncome = baseTotals.totalRevenue - baseTotals.totalExpenses;

    return {
      success: true,
      data: serializeData(processedAccounts),
      totals: serializeData({
        base: baseTotals,
        byCurrency: currencyTotals,
      }),
    };
  } catch (error) {
    console.error(error);
    return { success: false, error: "فشل في جلب البيانات" };
  }
}

export async function getAccount(accountId: string) {
  try {
    const { companyId } = await getUserCompany();

    const account = await prisma.accounts.findFirst({
      where: {
        id: accountId,
        company_id: companyId,
      },
      include: {
        accounts: true,
        other_accounts: true,
        journalLines: {
          take: 10,
          orderBy: { header: { entryDate: "desc" } },
          where: { header: { status: "POSTED" } },
        },
      },
    });

    if (!account) {
      return { success: false, error: "الحساب غير موجود" };
    }

    return { success: true, data: account };
  } catch (error) {
    console.error("Get account error:", error);
    return { success: false, error: "فشل في جلب الحساب" };
  }
}

// 3. CREATE ACCOUNT
// export async function createAccount(data: CreateAccountInput) {
//   try {
//     const { companyId, userId } = await getUserCompany();
//     await validateFiscalYear(companyId);
//     // Check if account code already exists
//     const existing = await prisma.accounts.findFirst({
//       where: {
//         company_id: companyId,
//         account_code: data.account_code,
//       },
//     });

//     if (existing) {
//       return { success: false, error: "رمز الحساب موجود مسبقاً" };
//     }

//     // Calculate level based on parent
//     let level = 1;
//     if (data.parent_id) {
//       const parent = await prisma.accounts.findUnique({
//         where: { id: data.parent_id },
//         select: { level: true },
//       });
//       level = (parent?.level || 0) + 1;
//     }

//     const account = await prisma.accounts.create({
//       data: {
//         company_id: companyId,
//         account_code: data.account_code,
//         account_name_en: data.account_name_en,
//         account_name_ar: data.account_name_ar,
//         account_type: data.account_type as any,
//         account_category: data.account_category as any,
//         parent_id: data.parent_id || null,
//         level,
//         opening_balance: data.opening_balance || 0,
//         balance: data.opening_balance || 0,
//         description: data.description,
//         allow_manual_entry: data.allow_manual_entry ?? true,
//         is_active: true,
//       },
//     });

//     // Create opening balance journal entry if applicable
//     if (data.opening_balance && data.opening_balance !== 0) {
//       const entryNumber = `JE-${new Date().getFullYear()}-OPENING-${Date.now()}`;

//       await prisma.journal_entries.create({
//         data: {
//           company_id: companyId,
//           entry_number: entryNumber,
//           account_id: account.id,
//           description: `الرصيد الافتتاحي لحساب ${data.account_name_ar || data.account_name_en}`,
//           entry_date: new Date(),
//           debit: data.opening_balance > 0 ? data.opening_balance : 0,
//           credit: data.opening_balance < 0 ? Math.abs(data.opening_balance) : 0,
//           is_posted: true,
//           is_automated: true,
//           reference_type: "opening_balance",
//           created_by: userId,
//         },
//       });
//     }

//     revalidatePath("/chartOfAccount");
//     return { success: true, data: account, message: "تم إنشاء الحساب بنجاح" };
//   } catch (error) {
//     console.error("Create account error:", error);
//     return { success: false, error: "فشل في إنشاء الحساب" };
//   }
// }
export async function createAccount(
  data: CreateAccountInput | CreateAccountInput[],
) {
  try {
    const { companyId, userId } = await getUserCompany();
    const items = Array.isArray(data) ? data : [data];

    // 1. Pre-validation: Check for active fiscal year
    const activeFiscalYear = await prisma.fiscal_periods.findFirst({
      where: { company_id: companyId, is_closed: false },
    });

    if (!activeFiscalYear) {
      return { success: false, error: "لا توجد سنة مالية نشطة" };
    }

    // 2. Execute everything in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const createdAccounts = [];

      for (const accountData of items) {
        // Check if account code already exists within this company
        const existing = await tx.accounts.findFirst({
          where: {
            company_id: companyId,
            account_code: accountData.account_code,
          },
        });

        if (existing) {
          throw new Error(
            `رمز الحساب ${accountData.account_code} موجود مسبقاً`,
          );
        }

        // Calculate hierarchy level
        let level = 1;
        if (accountData.parent_id) {
          const parent = await tx.accounts.findUnique({
            where: { id: accountData.parent_id },
          });
          if (!parent)
            throw new Error(
              `الحساب الأب لـ ${accountData.account_code} غير موجود`,
            );
          level = (parent.level || 0) + 1;
        }

        // Create the account
        const account = await tx.accounts.create({
          data: {
            company_id: companyId,
            account_code: accountData.account_code,
            account_name_en: accountData.account_name_en,
            account_name_ar: accountData.account_name_ar,
            account_type: accountData.account_type as any,
            account_category: accountData.account_category as any,
            parent_id: accountData.parent_id || null,
            level: accountData.level,
            currency_code: accountData.currency_code || null,
            opening_balance: accountData.opening_balance || 0,
            balance: accountData.opening_balance || 0,
            description: accountData.description,
            allow_manual_entry: accountData.allow_manual_entry ?? true,

            is_system: false,
          },
        });

        // Create Journal Entry for opening balance
        if (accountData.opening_balance && accountData.opening_balance !== 0) {
          await tx.journal_entries.create({
            data: {
              company_id: companyId,
              entry_number: `JE-OPEN-${account.account_code}-${Date.now()}`,
              account_id: account.id,
              branch_id: accountData.branchId,
              currency_code: accountData.currency,
              description: `رصيد افتتاحي: ${account.account_name_ar || account.account_name_en}`,
              entry_date: new Date(),
              debit:
                accountData.opening_balance > 0
                  ? accountData.opening_balance
                  : 0,
              credit:
                accountData.opening_balance < 0
                  ? Math.abs(accountData.opening_balance)
                  : 0,
              is_posted: true,
              is_automated: true,
              reference_type: "رصيد افتتاحي",
              created_by: userId,
            },
          });
        }
        createdAccounts.push(account);
      }
      return createdAccounts;
    });

    revalidatePath("/chartOfAccount");

    return {
      success: true,
      data: results,
      message:
        items.length > 1
          ? `تم إنشاء ${items.length} حسابات بنجاح`
          : "تم إنشاء الحساب بنجاح",
    };
  } catch (error: any) {
    console.error("Create account error:", error);
    return {
      success: false,
      error: error.message || "حدث خطأ أثناء إنشاء الحسابات",
    };
  }
}
// 4. UPDATE ACCOUNT
export async function updateAccounts(
  accountId: string,
  data: Partial<CreateAccountInput>,
) {
  try {
    const { companyId } = await getUserCompany();

    // Check if account exists and belongs to company
    const existing = await prisma.accounts.findFirst({
      where: {
        id: accountId,
        company_id: companyId,
      },
    });

    if (!existing) {
      return { success: false, error: "الحساب غير موجود" };
    }

    // Check if it's a system account
    if (existing.is_system) {
      return { success: false, error: "لا يمكن تعديل حسابات النظام" };
    }

    // If account code is being changed, check for duplicates
    if (data.account_code && data.account_code !== existing.account_code) {
      const duplicate = await prisma.accounts.findFirst({
        where: {
          company_id: companyId,
          account_code: data.account_code,
          id: { not: accountId },
        },
      });

      if (duplicate) {
        return { success: false, error: "رمز الحساب موجود مسبقاً" };
      }
    }

    // Calculate new level if parent changed
    let level = existing.level;
    if (data.parent_id && data.parent_id !== existing.parent_id) {
      const parent = await prisma.accounts.findUnique({
        where: { id: data.parent_id },
        select: { level: true },
      });
      level = (parent?.level || 0) + 1;
    }

    const account = await prisma.accounts.update({
      where: { id: accountId },
      data: {
        account_code: data.account_code,
        account_name_en: data.account_name_en,
        account_name_ar: data.account_name_ar,
        account_type: data.account_type as any,
        account_category: data.account_category as any,
        parent_id: data.parent_id || null,
        level,
        currency_code: data.currency_code,
        description: data.description,
        allow_manual_entry: data.allow_manual_entry,
        updated_at: new Date(),
      },
    });

    revalidatePath("/accounting/chart-of-accounts");
    return { success: true, data: account, message: "تم تحديث الحساب بنجاح" };
  } catch (error) {
    console.error("Update account error:", error);
    return { success: false, error: "فشل في تحديث الحساب" };
  }
}

// 5. DELETE ACCOUNT
export async function deleteAccount(accountId: string) {
  try {
    const { companyId } = await getUserCompany();

    // Check if account exists and belongs to company
    const account = await prisma.accounts.findFirst({
      where: {
        id: accountId,
        company_id: companyId,
      },
      include: {
        other_accounts: true,
        journalLines: true,
        account_mappings: true,
      },
    });

    if (!account) {
      return { success: false, error: "الحساب غير موجود" };
    }

    // Prevent deletion of system accounts
    if (account.is_system) {
      return { success: false, error: "لا يمكن حذف حسابات النظام" };
    }

    // Prevent deletion if has child accounts
    if (account.other_accounts.length > 0) {
      return {
        success: false,
        error: "لا يمكن حذف حساب يحتوي على حسابات فرعية",
      };
    }

    // Prevent deletion if has journal entries
    if (account.journalLines.length > 0) {
      return {
        success: false,
        error: "لا يمكن حذف حساب يحتوي على معاملات. يمكنك تعطيله بدلاً من ذلك.",
      };
    }

    // Prevent deletion if used in account mappings
    if (account.account_mappings && account.account_mappings.length > 0) {
      return {
        success: false,
        error: "لا يمكن حذف حساب مستخدم في ربط الحسابات",
      };
    }

    await prisma.accounts.delete({
      where: { id: accountId },
    });

    revalidatePath("/chartOfAccount");
    return { success: true, message: "تم حذف الحساب بنجاح" };
  } catch (error) {
    console.error("Delete account error:", error);
    return { success: false, error: "فشل في حذف الحساب" };
  }
}

// 6. TOGGLE ACCOUNT STATUS
export async function toggleAccountStatus(accountId: string) {
  try {
    const { companyId } = await getUserCompany();

    const account = await prisma.accounts.findFirst({
      where: {
        id: accountId,
        company_id: companyId,
      },
    });

    if (!account) {
      return { success: false, error: "الحساب غير موجود" };
    }

    if (account.is_system) {
      return { success: false, error: "لا يمكن تعطيل حسابات النظام" };
    }

    const updated = await prisma.accounts.update({
      where: { id: accountId },
      data: {
        is_active: !account.is_active,
        updated_at: new Date(),
      },
    });

    revalidatePath("/chartOfAccount");
    return {
      success: true,
      data: updated,
      message: updated.is_active ? "تم تفعيل الحساب" : "تم تعطيل الحساب",
    };
  } catch (error) {
    console.error("Toggle account status error:", error);
    return { success: false, error: "فشل في تحديث حالة الحساب" };
  }
}

// 7. GET ACCOUNT BALANCE
export async function getAccountBalance(
  accountId: string,
  startDate?: Date,
  endDate?: Date,
) {
  try {
    const { companyId } = await getUserCompany();

    const account = await prisma.accounts.findFirst({
      where: {
        id: accountId,
        company_id: companyId,
      },
    });

    if (!account) {
      return { success: false, error: "الحساب غير موجود" };
    }

    // Build date filter
    const dateFilter: any = { header: { status: "POSTED" } };
    if (startDate || endDate) {
      dateFilter.header.entryDate = {};
      if (startDate) dateFilter.header.entryDate.gte = startDate;
      if (endDate) dateFilter.header.entryDate.lte = endDate;
    }

    const entries = await prisma.journalLine.findMany({
      where: {
        accountId: accountId,
        ...dateFilter,
      },
    });

    const totalDebit = entries.reduce(
      (sum, e) => sum + Number(e.debit || 0),
      0,
    );
    const totalCredit = entries.reduce(
      (sum, e) => sum + Number(e.credit || 0),
      0,
    );
    const balance = totalDebit - totalCredit;

    return {
      success: true,
      data: {
        accountName: account.account_name_ar || account.account_name_en,
        totalDebit,
        totalCredit,
        balance,
        entryCount: entries.length,
      },
    };
  } catch (error) {
    console.error("Get account balance error:", error);
    return { success: false, error: "فشل في حساب الرصيد" };
  }
}

// 8. GET PARENT ACCOUNTS (for dropdown in create/edit form)
export async function getParentAccounts() {
  try {
    const { companyId } = await getUserCompany();

    const accounts = await prisma.accounts.findMany({
      where: {
        company_id: companyId,
        level: { lt: 3 }, // Only accounts up to level 2 can be parents
        is_active: true,
      },
      select: {
        id: true,
        account_code: true,
        account_name_en: true,
        account_name_ar: true,
        currency_code: true,
        account_type: true,
        level: true,
      },
      orderBy: { account_code: "asc" },
    });
    const data = serializeData(accounts);
    return { success: true, data: data };
  } catch (error) {
    console.error("Get parent accounts error:", error);
    return { success: false, error: "فشل في جلب الحسابات الرئيسية" };
  }
}
export async function getAccountDetails(accountId: string) {
  try {
    const { companyId } = await getUserCompany();

    const account = await prisma.accounts.findUnique({
      where: {
        id: accountId,
        company_id: companyId,
      },
      include: {
        journalLines: {
          orderBy: { header: { entryDate: "desc" } },
          take: 4, // recent 10 transactions
          select: {
            id: true,
            debit: true,
            credit: true,
            memo: true,
            header: { select: { entryDate: true, description: true } },
          },
        },
      },
    });

    if (!account) {
      return { success: false, error: "الحساب غير موجود" };
    }

    // Calculate running balance for preview
    let balance = Number(account.opening_balance ?? 0);
    const recentTransactions = account.journalLines.map((j) => {
      balance += Number(j.debit ?? 0) - Number(j.credit ?? 0);
      return {
        id: j.id,
        date: j.header?.entryDate,
        description: j.memo ?? j.header?.description ?? "",
        debit: Number(j.debit ?? 0),
        credit: Number(j.credit ?? 0),
        balance,
      };
    });

    const data = serializeData({ account, recentTransactions });
    return { success: true, data };
  } catch (error) {
    console.error("❌ getAccountDetails error:", error);
    return { success: false, error: "فشل في جلب تفاصيل الحساب" };
  }
}
// 9. INITIALIZE DEFAULT CHART OF ACCOUNTS
export async function initializeDefaultAccounts() {
  try {
    const { companyId, userId } = await getUserCompany();

    // Check if accounts already exist
    const existingCount = await prisma.accounts.count({
      where: { company_id: companyId },
    });

    if (existingCount > 0) {
      return { success: false, error: "توجد حسابات مسبقاً لهذه الشركة" };
    }

    const defaultAccounts = [
      // 🏦 الأصول - Assets
      {
        code: "1000",
        name_en: "الأصول",
        name_ar: "",
        type: "ASSET",
        category: "OTHER_ASSETS",
        parent: null,
      },
      {
        code: "1010",
        name_en: "الأصول المتداولة",
        name_ar: "",
        type: "ASSET",
        category: "OTHER_CURRENT_ASSETS",
        parent: "1000",
      },
      {
        code: "1011",
        name_en: "النقد في الصندوق",
        name_ar: "",
        type: "ASSET",
        category: "CASH_AND_BANK",
        parent: "1010",
        system: true,
      },
      {
        code: "1012",
        name_en: "الحساب البنكي",
        name_ar: "",
        type: "ASSET",
        category: "CASH_AND_BANK",
        parent: "1010",
        system: true,
      },
      {
        code: "1020",
        name_en: "الذمم المدينة",
        name_ar: "",
        type: "ASSET",
        category: "ACCOUNTS_RECEIVABLE",
        parent: "1010",
        system: true,
      },
      {
        code: "1030",
        name_en: "المخزون",
        name_ar: "",
        type: "ASSET",
        category: "INVENTORY",
        parent: "1010",
        system: true,
      },
      {
        code: "1100",
        name_en: "الأصول الثابتة",
        name_ar: "",
        type: "ASSET",
        category: "FIXED_ASSETS",
        parent: "1000",
      },
      {
        code: "1110",
        name_en: "المعدات",
        name_ar: "",
        type: "ASSET",
        category: "FIXED_ASSETS",
        parent: "1100",
      },
      {
        code: "1120",
        name_en: "المركبات",
        name_ar: "",
        type: "ASSET",
        category: "FIXED_ASSETS",
        parent: "1100",
      },

      // 💳 الخصوم - Liabilities
      {
        code: "2000",
        name_en: "الخصوم",
        name_ar: "",
        type: "LIABILITY",
        category: "OTHER_CURRENT_LIABILITIES",
        parent: null,
      },
      {
        code: "2010",
        name_en: "الخصوم المتداولة",
        name_ar: "",
        type: "LIABILITY",
        category: "OTHER_CURRENT_LIABILITIES",
        parent: "2000",
      },
      {
        code: "2011",
        name_en: "الذمم الدائنة",
        name_ar: "",
        type: "LIABILITY",
        category: "ACCOUNTS_PAYABLE",
        parent: "2010",
        system: true,
      },
      {
        code: "2012",
        name_en: "ضريبة المبيعات المستحقة",
        name_ar: "",
        type: "LIABILITY",
        category: "SALES_TAX_PAYABLE",
        parent: "2010",
        system: true,
      },
      {
        code: "2020",
        name_en: "القروض قصيرة الأجل",
        name_ar: "",
        type: "LIABILITY",
        category: "SHORT_TERM_LOANS",
        parent: "2010",
      },

      // 🧾 حقوق الملكية - Equity
      {
        code: "3000",
        name_en: "حقوق الملكية",
        name_ar: "",
        type: "EQUITY",
        category: "OWNER_EQUITY",
        parent: null,
      },
      {
        code: "3010",
        name_en: "رأس المال",
        name_ar: "",
        type: "EQUITY",
        category: "OWNER_EQUITY",
        parent: "3000",
        system: true,
      },
      {
        code: "3020",
        name_en: "الأرباح المحتجزة",
        name_ar: "",
        type: "EQUITY",
        category: "RETAINED_EARNINGS",
        parent: "3000",
        system: true,
      },
      {
        code: "3030",
        name_en: "المسحوبات الشخصية",
        name_ar: "",
        type: "EQUITY",
        category: "DRAWINGS",
        parent: "3000",
      },

      // 💰 الإيرادات - Revenue
      {
        code: "4000",
        name_en: "الإيرادات",
        name_ar: "",
        type: "REVENUE",
        category: "SALES_REVENUE",
        parent: null,
      },
      {
        code: "4010",
        name_en: "إيرادات المبيعات",
        name_ar: "",
        type: "REVENUE",
        category: "SALES_REVENUE",
        parent: "4000",
        system: true,
      },
      {
        code: "4020",
        name_en: "إيرادات الخدمات",
        name_ar: "",
        type: "REVENUE",
        category: "SERVICE_REVENUE",
        parent: "4000",
      },
      {
        code: "4030",
        name_en: "إيرادات أخرى",
        name_ar: "",
        type: "REVENUE",
        category: "OTHER_INCOME",
        parent: "4000",
      },

      // 📦 تكلفة البضاعة المباعة - COGS
      {
        code: "5000",
        name_en: "تكلفة البضاعة المباعة",
        name_ar: "",
        type: "EXPENSE",
        category: "COST_OF_GOODS_SOLD",
        parent: null,
        system: true,
      },

      // 💸 المصروفات - Expenses
      {
        code: "6000",
        name_en: "المصروفات",
        name_ar: "",
        type: "EXPENSE",
        category: "OPERATING_EXPENSES",
        parent: null,
      },
      {
        code: "6010",
        name_en: "المصاريف التشغيلية",
        name_ar: "",
        type: "EXPENSE",
        category: "OPERATING_EXPENSES",
        parent: "6000",
      },
      {
        code: "6011",
        name_en: "الرواتب",
        name_ar: "",
        type: "EXPENSE",
        category: "PAYROLL_EXPENSES",
        parent: "6010",
      },
      {
        code: "6012",
        name_en: "الإيجار",
        name_ar: "",
        type: "EXPENSE",
        category: "OPERATING_EXPENSES",
        parent: "6010",
      },
      {
        code: "6013",
        name_en: "المرافق",
        name_ar: "",
        type: "EXPENSE",
        category: "OPERATING_EXPENSES",
        parent: "6010",
      },
      {
        code: "6014",
        name_en: "التسويق",
        name_ar: "",
        type: "EXPENSE",
        category: "OPERATING_EXPENSES",
        parent: "6010",
      },
      {
        code: "6020",
        name_en: "المصاريف الإدارية",
        name_ar: "",
        type: "EXPENSE",
        category: "ADMINISTRATIVE_EXPENSES",
        parent: "6000",
      },
    ];

    // Create accounts in order
    const accountMap = new Map();

    for (const acc of defaultAccounts) {
      const parentId = acc.parent ? accountMap.get(acc.parent) : null;

      // Calculate level
      let level = 1;
      if (parentId) {
        const parent = await prisma.accounts.findUnique({
          where: { id: parentId },
          select: { level: true },
        });
        level = (parent?.level || 0) + 1;
      }

      const created = await prisma.accounts.create({
        data: {
          company_id: companyId,
          account_code: acc.code,
          account_name_en: acc.name_en,
          account_name_ar: acc.name_ar,
          account_type: acc.type as any,
          account_category: acc.category as any,
          parent_id: parentId,
          level,
          is_system: acc.system || false,
          is_active: true,
          balance: 0,
          opening_balance: 0,
        },
      });

      accountMap.set(acc.code, created.id);
    }

    // Create default account mappings
    await prisma.account_mappings.createMany({
      data: [
        {
          company_id: companyId,
          mapping_type: "cash",
          account_id: accountMap.get("1011"),
          is_default: true,
        },
        {
          company_id: companyId,
          mapping_type: "bank",
          account_id: accountMap.get("1012"),
          is_default: true,
        },
        {
          company_id: companyId,
          mapping_type: "accounts_receivable",
          account_id: accountMap.get("1020"),
          is_default: true,
        },
        {
          company_id: companyId,
          mapping_type: "inventory",
          account_id: accountMap.get("1030"),
          is_default: true,
        },
        {
          company_id: companyId,
          mapping_type: "accounts_payable",
          account_id: accountMap.get("2011"),
          is_default: true,
        },
        {
          company_id: companyId,
          mapping_type: "sales_tax",
          account_id: accountMap.get("2012"),
          is_default: true,
        },
        {
          company_id: companyId,
          mapping_type: "sales_revenue",
          account_id: accountMap.get("4010"),
          is_default: true,
        },
        {
          company_id: companyId,
          mapping_type: "cogs",
          account_id: accountMap.get("5000"),
          is_default: true,
        },
      ],
    });

    revalidatePath("/accounting/chart-of-accounts");
    return { success: true, message: "تم إنشاء دليل الحسابات الافتراضي بنجاح" };
  } catch (error) {
    console.error("Initialize accounts error:", error);
    return { success: false, error: "فشل في إنشاء دليل الحسابات" };
  }
}

// 10. EXPORT CHART OF ACCOUNTS (for Excel/CSV)
export async function exportChartOfAccounts(format: "csv" | "excel" = "csv") {
  try {
    const { companyId } = await getUserCompany();

    const accounts = await prisma.accounts.findMany({
      where: { company_id: companyId },
      orderBy: { account_code: "asc" },
      select: {
        account_code: true,
        account_name_ar: true,
        account_name_en: true,
        account_type: true,
        account_category: true,
        balance: true,
        level: true,
        is_active: true,
      },
    });

    return { success: true, data: accounts };
  } catch (error) {
    console.error("Export accounts error:", error);
    return { success: false, error: "فشل في تصدير الحسابات" };
  }
}
