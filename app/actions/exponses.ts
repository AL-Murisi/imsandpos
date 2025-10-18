// ============================================
// FILE: app/actions/expenses.ts
// ============================================
"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
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
        expense_categories: true,
        users: { select: { id: true, name: true, email: true } },
      },
      skip: pageIndex * pageSize,
      take: pageSize,
      orderBy,
    });

    // Serialize and transform data
    const serialized = expenses.map((expense) => ({
      id: expense.id,
      expenseNumber: expense.expense_number,
      description: expense.description,
      amount: expense.amount,
      expenseDate: expense.expense_date,
      paymentMethod: expense.payment_method,
      referenceNumber: expense.reference_number,
      notes: expense.notes,
      status: expense.status,
      category: {
        id: expense.expense_categories?.id,
        name: expense.expense_categories?.name,
      },
      user: expense.users
        ? {
            id: expense.users.id,
            name: expense.users.name,
            email: expense.users.email,
          }
        : null,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
    }));
    const result = serializeData(serialized);
    return { data: result, total, pageIndex, pageSize };
  } catch (error) {
    console.error("Error fetching expenses:", error);
    throw error;
  }
}
export async function createExpenseCategory(
  companyId: string,
  data: CreateCategoryData,
): Promise<ActionResponse> {
  // Basic server-side validation
  if (!data.name || data.name.trim() === "") {
    return { success: false, error: "يجب إدخال اسم الفئة." };
  }

  try {
    const category = await prisma.expense_categories.create({
      data: {
        company_id: companyId,
        name: data.name,
        description: data.description || null, // Ensure empty string becomes null if DB requires it
      },
    });

    // Revalidate any path that displays expense categories (adjust as needed)
    revalidatePath("/expenses/categories");

    return { success: true, category };
  } catch (error: any) {
    console.error("Error creating expense category:", error);

    // Handle unique constraint error (P2002) for company_id and name
    if (error.code === "P2002") {
      return { success: false, error: "اسم الفئة موجود مسبقًا في هذه الشركة." };
    }

    return {
      success: false,
      error: error.message || "فشل إنشاء فئة المصروف.",
    };
  }
}
export async function getExpenseCategories(companyId: string) {
  try {
    return await prisma.expense_categories.findMany({
      where: { company_id: companyId, is_active: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("Error fetching expense categories:", error);
    throw error;
  }
}

export async function createExpense(
  companyId: string,
  userId: string,
  data: {
    expense_categoriesId: string;
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
        category_id: data.expense_categoriesId,
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
        expense_categories: true,
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
    expense_categoriesId?: string;
    description?: string;
    amount?: number;
    expense_date?: Date;
    paymentMethod?: string;
    status?: string;
    notes?: string;
  },
) {
  try {
    const expense = await prisma.expenses.update({
      where: { id: expenseId },
      data: {
        ...(data.expense_categoriesId && {
          expense_categoriesId: data.expense_categoriesId,
        }),
        ...(data.description && { description: data.description }),
        ...(data.amount && { amount: data.amount }),
        ...(data.expense_date && { expense_date: data.expense_date }),
        ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
        ...(data.status && { status: data.status }),
        ...(data.notes && { notes: data.notes }),
      },
      include: {
        expense_categories: true,
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
