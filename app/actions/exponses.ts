// ============================================
// FILE: app/actions/expenses.ts
// ============================================
"use server";
import prisma from "@/lib/prisma";
import { account_category, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
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
    expense_categoriesId,
    status,
    parsedSort,
  }: {
    from?: string;
    to?: string;
    pageIndex?: number;
    pageSize?: number;
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
    // Serialize and transform data
    const serialized = expenses.map((expense) => {
      const account = accounts.find((a) => a.id === expense.account_id);

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
        createdAt: expense.created_at,
        updatedAt: expense.updated_at,
      };
    });

    return { data: serialized, total };
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

export async function createExpense(
  companyId: string,
  userId: string,
  data: {
    account_id: string;
    description: string;
    amount: number;
    expense_date: Date;
    paymentMethod: string;
    referenceNumber: string;
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
        details: `Expense: ${data.description}, Amount: ${data.amount}`,
      },
    });
    console.log(expense);
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
    const expense = await prisma.expenses.update({
      where: { id: expenseId },
      data: {
        ...(data.account_id && {
          account_id: data.account_id,
        }),
        ...(data.description && { description: data.description }),
        ...(data.amount && { amount: data.amount }),
        ...(data.expense_date && { expense_date: data.expense_date }),
        ...(data.payment_method && { payment_method: data.payment_method }),
        ...(data.status && { status: data.status }),
        ...(data.notes && { notes: data.notes }),
      },
      include: {
        users: true,
      },
    });

    // Log activity
    await prisma.activityLogs.create({
      data: {
        userId,
        companyId,
        action: "updated expense",
        details: `Expense: ${expense.description}, Amount: ${expense.amount}`,
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
      where: { id: expenseId },
    });

    // Log activity
    await prisma.activityLogs.create({
      data: {
        userId,
        companyId,
        action: "deleted expense",
        details: `Expense: ${expense.description}, Amount: ${expense.amount}`,
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
