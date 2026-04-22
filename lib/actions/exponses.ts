// ============================================
// FILE: app/actions/expenses.ts
// ============================================
"use server";
import prisma from "@/lib/prisma";
import { account_category, Prisma, TransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getNextVoucherNumber } from "./cashier";
import { validateFiscalYear } from "./fiscalYear";
import { headers } from "next/headers";
interface CreateCategoryData {
  name: string;
  description?: string;
}

// Define the return type for better type safety
type ActionResponse =
  | {
      success: true;
      category: any; // Ideally, use a Prisma type here, like Prisma.PromiseReturnType<typeof prisma.expense_categories.create>
    }
  | {
      success: false;
      error: string;
    };
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

export async function getExpensesByCompany(
  companyId: string,
  {
    from,
    to,
    pageIndex = 0,
    pageSize = 10,
    search,
    expense_categoriesId,
    status,
    parsedSort,
  }: {
    from?: string;
    to?: string;
    pageIndex?: number;
    pageSize?: number;
    search?: string;
    expense_categoriesId?: string;
    status?: string;
    parsedSort?: { id: string; desc: boolean }[];
  } = {},
) {
  try {
    const filters: any = { company_id: companyId };

    // Date range
    if (from || to) {
      filters.expense_date = {};
      if (from) filters.expense_date.gte = new Date(from);
      if (to) filters.expense_date.lte = new Date(to);
    }

    // Category filter - use category_id not expense_categoriesId
    if (expense_categoriesId) filters.category_id = expense_categoriesId;

    // Status filter
    if (status && status !== "all") filters.status = status;

    if (search?.trim()) {
      filters.OR = [
        {
          expense_number: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
        {
          notes: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
        {
          reference_number: {
            contains: search.trim(),
            mode: "insensitive",
          },
        },
      ];
    }

    // Count total
    const total = await prisma.expenses.count({ where: filters });

    // Sort - default by expense_date desc
    const orderBy: any[] = [];
    if (parsedSort?.length) {
      parsedSort.forEach((s) => {
        orderBy.push({ [s.id]: s.desc ? "desc" : "asc" });
      });
    } else {
      orderBy.push({ expense_date: "desc" });
    }

    // Fetch expenses
    const expenses = await prisma.expenses.findMany({
      where: filters,
      include: {
        users: { select: { id: true, name: true, email: true } },
      },
      skip: pageIndex * pageSize,
      take: pageSize,
      orderBy,
    });
    const accountIds = expenses.map((e) => e.account_id);
    const validAccountIds = accountIds.filter(
      (id): id is string => id !== null,
    );
    // Fetch related accounts
    const accounts = await prisma.accounts.findMany({
      where: { company_id: companyId, id: { in: validAccountIds } },
      select: { id: true, account_name_en: true },
    });
    const expenseIds = expenses.map((expense) => expense.id);
    const journalHeaders = expenseIds.length
      ? await prisma.journalHeader.findMany({
          where: {
            companyId,
            referenceType: "سند صرف",
            referenceId: { in: expenseIds },
          },
          select: {
            id: true,
            entryNumber: true,
            entryDate: true,
            status: true,
            referenceId: true,
            lines: {
              select: {
                id: true,
                debit: true,
                credit: true,
                currencyCode: true,
                baseAmount: true,
                memo: true,
                account: {
                  select: {
                    id: true,
                    account_code: true,
                    account_name_en: true,
                    account_name_ar: true,
                  },
                },
              },
            },
          },
        })
      : [];
    // Serialize and transform data
    const serialized = expenses.map((expense) => {
      const account = accounts.find((a) => a.id === expense.account_id);
      const journalHeader = journalHeaders.find(
        (header) => header.referenceId === expense.id,
      );

      return {
        id: expense.id,
        expenseNumber: expense.expense_number,
        description: expense.description,
        amount: expense.amount,
        expenseDate: expense.expense_date,
        paymentMethod: expense.payment_method,
        referenceNumber: expense.reference_number,
        notes: expense.notes,
        status: expense.status,
        account_id: expense.account_id,

        // ✅ Only the matching account name for this expense
        account_category: account ? [account.account_name_en] : [],

        user: expense.users
          ? {
              id: expense.users.id,
              name: expense.users.name,
              email: expense.users.email,
            }
          : null,
        journalHeader: journalHeader
          ? {
              id: journalHeader.id,
              entryNumber: journalHeader.entryNumber,
              entryDate: journalHeader.entryDate,
              status: journalHeader.status,
              lines: journalHeader.lines.map((line) => ({
                id: line.id,
                debit: line.debit,
                credit: line.credit,
                currencyCode: line.currencyCode,
                baseAmount: line.baseAmount,
                memo: line.memo,
                account: line.account,
              })),
            }
          : null,
        createdAt: expense.created_at,
        updatedAt: expense.updated_at,
      };
    });
    const expense = serializeData(serialized);
    return { data: expense, total };
  } catch (error) {
    console.error("Error fetching expenses:", error);
    throw error;
  }
}
// export async function createExpenseCategory(
//   companyId: string,
//   data: CreateCategoryData,
// ): Promise<ActionResponse> {
//   // Basic server-side validation
//   if (!data.name || data.name.trim() === "") {
//     return { success: false, error: "يجب إدخال اسم الفئة." };
//   }

//   try {
//     const category = await prisma.expense_categories.create({
//       data: {
//         company_id: companyId,
//         name: data.name,
//         description: data.description || null, // Ensure empty string becomes null if DB requires it
//       },
//     });

//     // Revalidate any path that displays expense categories (adjust as needed)
//     revalidatePath("/expenses/categories");

//     return { success: true, category };
//   } catch (error: any) {
//     console.error("Error creating expense category:", error);

//     // Handle unique constraint error (P2002) for company_id and name
//     if (error.code === "P2002") {
//       return { success: false, error: "اسم الفئة موجود مسبقًا في هذه الشركة." };
//     }

//     return {
//       success: false,
//       error: error.message || "فشل إنشاء فئة المصروف.",
//     };
//   }
// }
export async function getExpenseCategories(companyId: string) {
  const expenseAccounts = await prisma.accounts.findMany({
    where: {
      company_id: companyId,
      account_type: "EXPENSE", // fetch all expense accounts
      is_active: true,
    },
    select: {
      id: true,
      account_name_en: true,
    },
    orderBy: {
      account_code: "asc",
    },
  });
  const name = expenseAccounts.map((i) => ({
    id: i.id,
    name: i.account_name_en,
  }));
  return name;
}
// export async function getExpenseCategories(companyId: string) {
//   try {
//     return await prisma.expense_categories.findMany({
//       where: { company_id: companyId, is_active: true },
//       orderBy: { name: "asc" },
//     });
//   } catch (error) {
//     console.error("Error fetching expense categories:", error);
//     throw error;
//   }
// }
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

async function getDefaultAccountMap(
  tx: Prisma.TransactionClient,
  companyId: string,
) {
  const mappings = await tx.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
    select: { mapping_type: true, account_id: true },
  });

  return new Map<string, string>(
    mappings.map((mapping) => [mapping.mapping_type, mapping.account_id]),
  );
}

function resolveSettlementAccount(
  accountMap: Map<string, string>,
  paymentMethod?: string | null,
) {
  if (paymentMethod === "bank") {
    return accountMap.get("bank") || accountMap.get("cash");
  }

  return accountMap.get("cash");
}

function buildExpenseJournalLine(
  companyId: string,
  accountId: string,
  memo: string,
  debitBase: number,
  creditBase: number,
  options: {
    currency?: string | null;
    baseCurrency?: string | null;
    exchangeRate?: number | null;
    foreignAmount?: number | null;
  } = {},
) {
  const { currency, baseCurrency, exchangeRate, foreignAmount } = options;
  const baseValue = debitBase > 0 ? debitBase : creditBase;
  const useForeign =
    Boolean(currency) &&
    Boolean(baseCurrency) &&
    currency !== baseCurrency &&
    Boolean(exchangeRate) &&
    exchangeRate !== 1;

  return {
    companyId,
    accountId,
    debit: debitBase,
    credit: creditBase,
    memo,
    ...(useForeign
      ? {
          currencyCode: currency,
          exchangeRate,
          foreignAmount,
          baseAmount: baseValue,
        }
      : {
          currencyCode: baseCurrency || currency || undefined,
        }),
  };
}

interface ExpenseData {
  account_id: string;
  description: string;
  amount: number;
  expense_date: Date;
  paymentMethod: string;
  currency_code: string;
  branchId: string;
  referenceNumber?: string;
  basCurrncy: string;

  bankId?: string;
  exchangeRate?: number;

  baseAmount?: number;
  amountFC?: number;

  notes?: string;
  employeeId?: string;
  customerId?: string;
}

export async function getExpenseAssignmentOptions(companyId: string) {
  const [employees, customers, branch] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { companyId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.points_of_sale.findMany({
      where: { company_id: companyId, is_active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { employees, customers, branch };
}

export async function createMultipleExpenses(
  companyId: string,
  userId: string,
  expensesData: ExpenseData[],
) {
  try {
    for (const expenseData of expensesData) {
      await validateFiscalYear(companyId, expenseData.expense_date);
    }
    // 1️⃣ التحقق من البيانات الأساسية
    if (!companyId || !userId) {
      return { success: false, error: "معرف الشركة ومعرف المستخدم مطلوبان" };
    }

    if (!expensesData || expensesData.length === 0) {
      return { success: false, error: "يجب إضافة مصروف واحد على الأقل" };
    }
    const aggregateexp = await prisma.expenses.aggregate({
      where: {
        company_id: companyId,
      },

      _max: {
        expense_number: true,
      },
    });

    // 2️⃣ تنفيذ العمليات داخل Transaction لضمان سلامة البيانات
    const result = await prisma.$transaction(async (tx) => {
      const createdExpenses = [];
      const journalHeaders = [];
      const financialTransactions = [];
      const accountMap = await getDefaultAccountMap(tx, companyId);
      const voucherNumber = await getNextVoucherNumber(
        companyId,
        "PAYMENT",
        tx,
      );
      const lastNumber = voucherNumber || 0;
      let currentVoucherNumber = lastNumber || 0;
      let nextExpenseNumber = 1;

      if (aggregateexp._max.expense_number) {
        const last = aggregateexp._max.expense_number; // EXP-00012
        const lastNum = Number(last.split("-")[1]);
        nextExpenseNumber = lastNum + 1;
      }

      // جلب آخر رقم سند صرف للشركة لمرة واحدة وزيادته تدريجياً داخل الحلقة

      for (const expenseData of expensesData) {
        if (expenseData.employeeId && expenseData.customerId) {
          throw new Error(
            "Expense can be linked to either an employee or a customer, not both",
          );
        }

        currentVoucherNumber++; // زيادة الرقم لكل مصروف جديد
        const expenseNumber = `EXP-${String(nextExpenseNumber).padStart(5, "0")}`;
        nextExpenseNumber++; // زيادة الرقم للمصروف التالي
        // توليد رقم مصروف فريد
        const voucherNumber = await getNextVoucherNumber(
          companyId,
          "PAYMENT",
          tx,
        );
        const amount = expenseData.amountFC;
        const baseAmount = expenseData.baseAmount ?? expenseData.amount;
        const settlementAccount = resolveSettlementAccount(
          accountMap,
          expenseData.paymentMethod,
        );

        if (!expenseData.account_id) {
          throw new Error("Expense account is required for journal entry");
        }

        if (!settlementAccount) {
          throw new Error(
            "Missing settlement account mapping for expense payment",
          );
        }

        //        أ - إنشاء سجل المصروف(expenses)
        const expense = await tx.expenses.create({
          data: {
            company_id: companyId,
            user_id: userId,
            branchId: expenseData.branchId,
            account_id: expenseData.account_id,
            description: expenseData.description,
            expense_number: expenseNumber,
            amount: amount ?? expenseData.amount,
            expense_date: expenseData.expense_date,
            payment_method: expenseData.paymentMethod,
            reference_number: expenseData.referenceNumber,
            notes: expenseData.notes || "",
            status: "approved",
            transactions: {
              create: {
                companyId: companyId,
                type: TransactionType.PAYMENT, // سند صرف
                userId: userId,
                branchId: expenseData.branchId,
                voucherNumber,
                amount: amount ?? expenseData.amount,
                currencyCode: expenseData.currency_code || "YER",
                paymentMethod: expenseData.paymentMethod,
                referenceNumber: expenseData.referenceNumber,
                notes: expenseData.description,
                status: "paid",
                employeeId: expenseData.employeeId,
                customerId: expenseData.customerId,
                date: expenseData.expense_date,
              },
            },
          },
          include: {
            transactions: true,
          },
        });

        // ب- إنشاء المعاملة المالية المرتبطة (FinancialTransaction)
        // هذا يمثل "سند الصرف" الفعلي في الخزينة
        const voucherFromDb = expense.transactions?.[0]?.voucherNumber || "N/A";

        const entryNumber = `EXP-${new Date().getFullYear()}-${voucherFromDb}`;
        const journalHeader = await tx.journalHeader.create({
          data: {
            companyId,
            entryNumber,
            description: expenseData.description,
            branchId: expenseData.branchId,
            referenceType: "سند صرف",
            referenceId: expense.id,
            entryDate: expenseData.expense_date,
            status: "POSTED",
            createdBy: userId,
            lines: {
              create: [
                buildExpenseJournalLine(
                  companyId,
                  expenseData.account_id,
                  expenseData.description,
                  baseAmount,
                  0,
                  {
                    currency: expenseData.currency_code ?? "YER",
                    baseCurrency: expenseData.basCurrncy,
                    exchangeRate: expenseData.exchangeRate,
                    foreignAmount: expenseData.amountFC,
                  },
                ),
                buildExpenseJournalLine(
                  companyId,
                  settlementAccount,
                  `${expenseData.description} - payment`,
                  0,
                  baseAmount,
                  {
                    currency: expenseData.currency_code ?? "YER",
                    baseCurrency: expenseData.basCurrncy,
                    exchangeRate: expenseData.exchangeRate,
                    foreignAmount: expenseData.amountFC,
                  },
                ),
              ].map((line) => ({
                ...line,
                companyId,
              })),
            },
          },
        });

        createdExpenses.push(expense);
        journalHeaders.push(journalHeader);
      }

      // 3️⃣ تسجيل النشاط (Activity Log)
      const totalAmount = expensesData.reduce(
        (sum, exp) => sum + Number(exp.amount),
        0,
      );
      const headersList = await headers();
      const userAgent = headersList.get("user-agent") || "جهاز غير معروف";

      await tx.activityLogs.create({
        data: {
          userId: userId,
          companyId: companyId,
          userAgent: userAgent,
          action: "إنشاء مصاريف متعددة مع عمليات مالية",
          details: `تم إنشاء عدد ${expensesData.length} من المصاريف. الإجمالي: ${totalAmount}. نطاق السندات: من ${lastNumber || 0 + 1} إلى ${currentVoucherNumber}`,
        },
      });

      return { createdExpenses, journalHeaders };
    });

    revalidatePath("/expenses");

    return {
      success: true,
      count: result.createdExpenses.length,
      message: `تم تسجيل ${result.createdExpenses.length} مصروف مع سندات الصرف بنجاح`,
    };
  } catch (error) {
    console.error("Error creating multiple expenses:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل إنشاء المصاريف",
    };
  }
}
export async function createExpense(
  companyId: string,
  userId: string,
  data: {
    account_id: string;
    description: string;
    amount: number;
    expense_date: Date;
    paymentMethod: string;
    currency_code: string;

    referenceNumber?: string;
    bankId?: string;
    notes?: string;
  },
) {
  try {
    // Validate required fields
    if (!companyId || !userId) {
      return {
        success: false,
        error: "معرف الشركة ومعرف المستخدم مطلوبان",
      };
    }

    console.log("Creating expense for company:", companyId, "user:", userId);

    const expenseNumber = `EXP-${Date.now()}`;

    const expense = await prisma.expenses.create({
      data: {
        company_id: companyId,
        user_id: userId, // Use the parameter directly, not undefined
        account_id: data.account_id,
        description: data.description,
        expense_number: expenseNumber,
        amount: data.amount,
        expense_date: data.expense_date,
        payment_method: data.paymentMethod,
        reference_number: data.referenceNumber,
        notes: data.notes || "",
        status: "pending",
      },
      include: {
        users: true,
      },
    });

    // Log activity
    await prisma.activityLogs.create({
      data: {
        userId: userId,
        companyId: companyId,
        action: "created expense",
        userAgent: typeof window !== "undefined" ? navigator.userAgent : "",

        details: `Expense: ${data.description}, Amount: ${data.amount}`,
      },
    });
    await prisma.journalEvent.create({
      data: {
        companyId,
        eventType: "expense",
        status: "pending",
        entityType: "expense",
        payload: {
          companyId,
          expense: {
            id: expense.id,
            accountId: data.account_id, // 🔑 THIS is the key
            amount: data.amount,
            paymentMethod: data.paymentMethod,
            referenceNumber: data.referenceNumber,
            description: data.description,
            expenseDate: data.expense_date,
            bankId: data.bankId ?? "",
            currency_code: data.currency_code ?? "YER",
          },
          userId,
        },
        processed: false,
      },
    });

    revalidatePath("/expenses");
    return { success: true, expense };
  } catch (error) {
    console.error("Error creating expense:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل إنشاء المصروف",
    };
  }
}

export async function updateExpense(
  expenseId: string,
  companyId: string,
  userId: string,
  data: {
    account_id: string;
    description?: string;
    amount?: number;
    expense_date?: Date;
    payment_method?: string;
    status?: string;
    notes?: string;
  },
) {
  try {
    const expense = await prisma.$transaction(async (tx) => {
      const existingExpense = await tx.expenses.findUnique({
        where: { id: expenseId },
        select: {
          id: true,
          description: true,
          amount: true,
          expense_date: true,
          payment_method: true,
          status: true,
          notes: true,
          account_id: true,
          branchId: true,
        },
      });

      if (!existingExpense) {
        throw new Error("Expense not found");
      }

      const updatedExpense = await tx.expenses.update({
        where: { id: expenseId },
        data: {
          ...(data.account_id !== undefined
            ? { account_id: data.account_id }
            : {}),
          ...(data.description !== undefined
            ? { description: data.description }
            : {}),
          ...(data.amount !== undefined ? { amount: data.amount } : {}),
          ...(data.expense_date !== undefined
            ? { expense_date: data.expense_date }
            : {}),
          ...(data.payment_method !== undefined
            ? { payment_method: data.payment_method }
            : {}),
          ...(data.status !== undefined ? { status: data.status } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
        },
        include: {
          users: true,
        },
      });

      const finalDescription =
        updatedExpense.description ?? existingExpense.description ?? "";
      const finalAmount = Number(updatedExpense.amount);
      const finalPaymentMethod =
        updatedExpense.payment_method ??
        existingExpense.payment_method ??
        "cash";
      const finalExpenseDate =
        updatedExpense.expense_date ?? existingExpense.expense_date;
      const finalAccountId =
        updatedExpense.account_id ?? existingExpense.account_id;

      const journalHeader = await tx.journalHeader.findFirst({
        where: {
          companyId,
          referenceId: expenseId,
        },
        include: {
          lines: true,
        },
      });

      if (journalHeader) {
        const accountMap = await getDefaultAccountMap(tx, companyId);
        const settlementAccount = resolveSettlementAccount(
          accountMap,
          finalPaymentMethod,
        );

        if (!finalAccountId) {
          throw new Error("Expense account is required for journal entry");
        }

        if (!settlementAccount) {
          throw new Error(
            "Missing settlement account mapping for expense payment",
          );
        }

        await tx.journalHeader.update({
          where: { id: journalHeader.id },
          data: {
            description: finalDescription,
            entryDate: finalExpenseDate,
            branchId: existingExpense.branchId ?? undefined,
          },
        });

        const debitLine = journalHeader.lines.find(
          (line) => Number(line.debit) > 0,
        );
        const creditLine = journalHeader.lines.find(
          (line) => Number(line.credit) > 0,
        );

        if (debitLine) {
          await tx.journalLine.update({
            where: { id: debitLine.id },
            data: {
              accountId: finalAccountId,
              debit: finalAmount,
              credit: 0,
              baseAmount: finalAmount,
              memo: finalDescription,
            },
          });
        }

        if (creditLine) {
          await tx.journalLine.update({
            where: { id: creditLine.id },
            data: {
              accountId: settlementAccount,
              debit: 0,
              credit: finalAmount,
              baseAmount: finalAmount,
              memo: `${finalDescription} - payment`,
            },
          });
        }
      }

      await tx.financialTransaction.updateMany({
        where: {
          companyId,
          expenseId,
        },
        data: {
          amount: finalAmount,
          baseAmount: finalAmount,
          paymentMethod: finalPaymentMethod,
          notes:
            data.notes !== undefined
              ? data.notes
              : (updatedExpense.notes ?? undefined),
          date: finalExpenseDate,
          status: updatedExpense.status ?? undefined,
        },
      });

      return updatedExpense;
    });

    // Log activity
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "جهاز غير معروف";

    await prisma.activityLogs.create({
      data: {
        userId,
        companyId,
        userAgent: userAgent,

        // النص المحدث للعربية
        action: "تعديل مصروف",

        // تفاصيل العملية بالعربية
        details: `تم تعديل المصروف: ${expense.description}، القيمة الجديدة: ${expense.amount}`,
      },
    });

    revalidatePath("/expenses");
    return { success: true, expense };
  } catch (error) {
    console.error("Error updating expense:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update expense",
    };
  }
}

export async function deleteExpense(
  expenseId: string,
  companyId: string,
  userId: string,
) {
  try {
    const expense = await prisma.expenses.delete({
      where: { company_id: companyId, id: expenseId },
    });
    await prisma.journalHeader.deleteMany({
      where: {
        companyId: companyId,
        referenceId: expenseId, // This matches your referenceId: referenceId logic
      },
    });
    // Log activity
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "جهاز غير معروف";

    await prisma.activityLogs.create({
      data: {
        userId,
        companyId,
        userAgent: userAgent,

        // تغيير نوع العملية للعربية
        action: "حذف مصروف",

        // صياغة التفاصيل بالعربية بشكل منظم
        details: `المصروف: ${expense.description}، المبلغ: ${expense.amount}، رمز المصروف: ${expense.id}`,
      },
    });

    revalidatePath("/expenses");
    return { success: true };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to delete expense",
    };
  }
}
