// // ============================================
// // FILE: app/actions/expenses.ts
// // ============================================

// import prisma from "@/lib/prisma";
// import { revalidatePath } from "next/cache";

// export async function getExpensesByCompany(
//   companyId: string,
//   {
//     from,
//     to,
//     pageIndex = 0,
//     pageSize = 10,
//     categoryId,
//     status,
//     parsedSort,
//   }: {
//     from?: string;
//     to?: string;
//     pageIndex?: number;
//     pageSize?: number;
//     categoryId?: string;
//     status?: string;
//     parsedSort?: { id: string; desc: boolean }[];
//   } = {},
// ) {
//   try {
//     const filters: any = { companyId };

//     // Date range
//     if (from || to) {
//       filters.expenseDate = {};
//       if (from) filters.expenseDate.gte = new Date(from);
//       if (to) filters.expenseDate.lte = new Date(to);
//     }

//     // Category filter
//     if (categoryId) filters.categoryId = categoryId;

//     // Status filter
//     if (status && status !== "all") filters.status = status;

//     // Count total
//     const total = await prisma.expense.count({ where: filters });

//     // Sort
//     const orderBy = parsedSort?.length
//       ? parsedSort.map((s) => ({ [s.id]: s.desc ? "desc" : "asc" }))
//       : [{ expenseDate: "desc" }];

//     // Fetch
//     const expenses = await prisma.expense.findMany({
//       where: filters,
//       include: {
//         category: true,
//         user: { select: { id: true, name: true, email: true } },
//       },
//       skip: pageIndex * pageSize,
//       take: pageSize,
//       orderBy,
//     });

//     return { data: expenses, total, pageIndex, pageSize };
//   } catch (error) {
//     console.error("Error fetching expenses:", error);
//     throw error;
//   }
// }

// export async function getExpenseCategories(companyId: string) {
//   try {
//     return await prisma.expenseCategory.findMany({
//       where: { companyId, isActive: true },
//       orderBy: { name: "asc" },
//     });
//   } catch (error) {
//     console.error("Error fetching expense categories:", error);
//     throw error;
//   }
// }

// export async function createExpense(
//   companyId: string,
//   userId: string,
//   data: {
//     categoryId: string;
//     description: string;
//     amount: number;
//     expenseDate: Date;
//     paymentMethod: string;
//     referenceNumber?: string;
//     notes?: string;
//   },
// ) {
//   try {
//     // Generate expense number
//     const lastExpense = await prisma.expense.findFirst({
//       where: { companyId },
//       orderBy: { createdAt: "desc" },
//       select: { expenseNumber: true },
//     });

//     const expenseNumber = `EXP-${Date.now()}`;

//     const expense = await prisma.expense.create({
//       data: {
//         companyId,
//         userId,
//         categoryId: data.categoryId,
//         expenseNumber,
//         description: data.description,
//         amount: data.amount,
//         expenseDate: data.expenseDate,
//         paymentMethod: data.paymentMethod,
//         referenceNumber: data.referenceNumber,
//         notes: data.notes,
//         status: "pending",
//       },
//       include: {
//         category: true,
//         user: true,
//       },
//     });

//     // Log activity
//     await prisma.activityLogs.create({
//       data: {
//         userId,
//         companyId,
//         action: "created expense",
//         details: `Expense: ${data.description}, Amount: ${data.amount}`,
//       },
//     });

//     revalidatePath("/expenses");
//     return { success: true, expense };
//   } catch (error) {
//     console.error("Error creating expense:", error);
//     return {
//       success: false,
//       error:
//         error instanceof Error ? error.message : "Failed to create expense",
//     };
//   }
// }

// export async function updateExpense(
//   expenseId: string,
//   companyId: string,
//   userId: string,
//   data: {
//     categoryId?: string;
//     description?: string;
//     amount?: number;
//     expenseDate?: Date;
//     paymentMethod?: string;
//     status?: string;
//     notes?: string;
//   },
// ) {
//   try {
//     const expense = await prisma.expense.update({
//       where: { id: expenseId },
//       data: {
//         ...(data.categoryId && { categoryId: data.categoryId }),
//         ...(data.description && { description: data.description }),
//         ...(data.amount && { amount: data.amount }),
//         ...(data.expenseDate && { expenseDate: data.expenseDate }),
//         ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
//         ...(data.status && { status: data.status }),
//         ...(data.notes && { notes: data.notes }),
//       },
//       include: {
//         category: true,
//         user: true,
//       },
//     });

//     // Log activity
//     await prisma.activityLogs.create({
//       data: {
//         userId,
//         companyId,
//         action: "updated expense",
//         details: `Expense: ${expense.description}, Amount: ${expense.amount}`,
//       },
//     });

//     revalidatePath("/expenses");
//     return { success: true, expense };
//   } catch (error) {
//     console.error("Error updating expense:", error);
//     return {
//       success: false,
//       error:
//         error instanceof Error ? error.message : "Failed to update expense",
//     };
//   }
// }

// export async function deleteExpense(
//   expenseId: string,
//   companyId: string,
//   userId: string,
// ) {
//   try {
//     const expense = await prisma.expense.delete({
//       where: { id: expenseId },
//     });

//     // Log activity
//     await prisma.activityLogs.create({
//       data: {
//         userId,
//         companyId,
//         action: "deleted expense",
//         details: `Expense: ${expense.description}, Amount: ${expense.amount}`,
//       },
//     });

//     revalidatePath("/expenses");
//     return { success: true };
//   } catch (error) {
//     console.error("Error deleting expense:", error);
//     return {
//       success: false,
//       error:
//         error instanceof Error ? error.message : "Failed to delete expense",
//     };
//   }
// }
