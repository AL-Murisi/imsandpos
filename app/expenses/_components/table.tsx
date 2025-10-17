// "use client";

// import { useEffect, useState } from "react";
// import { DataTable } from "@/components/common/test";
// import { Button } from "@/components/ui/button";

// import { useAuth } from "@/lib/context/AuthContext";

// import { expenseColumns } from "./columns";
// import SearchInput from "@/components/common/searchtest";
// import dynamic from "next/dynamic";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Plus } from "lucide-react";

// const Calendar22 = dynamic(
//   () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
//   { ssr: false, loading: () => <input type="date" /> },
// );

// export default function ExpensesPage() {
//   const {
//     pagination,
//     sorting,
//     globalFilter,
//     setPagination,
//     setSorting,
//     setGlobalFilter,
//   } = useTableParams();
//   const { user } = useAuth();

//   const [expenses, setExpenses] = useState<any[]>([]);
//   const [total, setTotal] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [categories, setCategories] = useState<any[]>([]);
//   const [categoryFilter, setCategoryFilter] = useState<string>("");
//   const [statusFilter, setStatusFilter] = useState<string>("all");
//   const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>(
//     {},
//   );

//   useEffect(() => {
//     if (!user) return;

//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         setExpenses(expensesData.data);
//         setTotal(expensesData.total);
//         setCategories(categoriesData);
//       } catch (error) {
//         console.error("Error fetching data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [user, pagination, sorting, categoryFilter, statusFilter, dateRange]);

//   if (!user) return null;

//   return (
//     <div
//       className="bg-accent w-full rounded-2xl p-2 shadow-xl/20 shadow-gray-500"
//       dir="rtl"
//     >
//       <div className="flex flex-wrap justify-between gap-2 p-1 md:flex-row lg:flex-row">
//         <div className="flex gap-2">
//           <Calendar22 />
//           <SearchInput placeholder="بحث" paramKey="expense" />
//         </div>

//         <Dialog>
//           <DialogTrigger asChild>
//             <Button className="bg-green-600 hover:bg-green-700">
//               <Plus className="h-4 w-4" /> إضافة مصروف
//             </Button>
//           </DialogTrigger>
//           <DialogContent dir="rtl">
//             <DialogHeader>
//               <DialogTitle>إضافة مصروف جديد</DialogTitle>
//             </DialogHeader>
//             <ExpenseCreateForm categories={categories} />
//           </DialogContent>
//         </Dialog>
//       </div>

//       <div className="flex gap-2 p-2">
//         <select
//           value={categoryFilter}
//           onChange={(e) => {
//             setCategoryFilter(e.target.value);
//             setPagination({ ...pagination, pageIndex: 0 });
//           }}
//           className="rounded-md border px-3 py-2 text-sm"
//         >
//           <option value="">جميع الفئات</option>
//           {categories.map((cat) => (
//             <option key={cat.id} value={cat.id}>
//               {cat.name}
//             </option>
//           ))}
//         </select>

//         <select
//           value={statusFilter}
//           onChange={(e) => {
//             setStatusFilter(e.target.value);
//             setPagination({ ...pagination, pageIndex: 0 });
//           }}
//           className="rounded-md border px-3 py-2 text-sm"
//         >
//           <option value="all">جميع الحالات</option>
//           <option value="pending">قيد الانتظار</option>
//           <option value="approved">موافق عليه</option>
//           <option value="rejected">مرفوض</option>
//           <option value="paid">مدفوع</option>
//         </select>
//       </div>

//       <DataTable
//         data={expenses}
//         columns={expenseColumns}
//         initialPageSize={pagination.pageSize}
//         pageCount={Math.ceil(total / pagination.pageSize)}
//         pageAction={setPagination}
//         onSortingChange={setSorting}
//         onGlobalFilterChange={setGlobalFilter}
//         globalFilter={globalFilter}
//         sorting={sorting}
//         pagination={pagination}
//         height="h-[68vh]"
//         totalCount={total}
//       />
//     </div>
//   );
// }

// // ============================================
// // FILE: app/actions/expenses.ts
// // ============================================

// // import { prisma } from "@/lib/prisma";
// // import { revalidatePath } from "next/cache";

// // export async function getExpensesByCompany(
// //   companyId: string,
// //   {
// //     from,
// //     to,
// //     pageIndex = 0,
// //     pageSize = 10,
// //     categoryId,
// //     status,
// //     parsedSort,
// //   }: {
// //     from?: string;
// //     to?: string;
// //     pageIndex?: number;
// //     pageSize?: number;
// //     categoryId?: string;
// //     status?: string;
// //     parsedSort?: { id: string; desc: boolean }[];
// //   } = {},
// // ) {
// //   try {
// //     const filters: any = { companyId };

// //     // Date range
// //     if (from || to) {
// //       filters.expenseDate = {};
// //       if (from) filters.expenseDate.gte = new Date(from);
// //       if (to) filters.expenseDate.lte = new Date(to);
// //     }

// //     // Category filter
// //     if (categoryId) filters.categoryId = categoryId;

// //     // Status filter
// //     if (status && status !== "all") filters.status = status;

// //     // Count total
// //     const total = await prisma.expense.count({ where: filters });

// //     // Sort
// //     const orderBy = parsedSort?.length
// //       ? parsedSort.map((s) => ({ [s.id]: s.desc ? "desc" : "asc" }))
// //       : [{ expenseDate: "desc" }];

// //     // Fetch
// //     const expenses = await prisma.expense.findMany({
// //       where: filters,
// //       include: {
// //         category: true,
// //         user: { select: { id: true, name: true, email: true } },
// //       },
// //       skip: pageIndex * pageSize,
// //       take: pageSize,
// //       orderBy,
// //     });

// //     return { data: expenses, total, pageIndex, pageSize };
// //   } catch (error) {
// //     console.error("Error fetching expenses:", error);
// //     throw error;
// //   }
// // }

// // export async function getExpenseCategories(companyId: string) {
// //   try {
// //     return await prisma.expenseCategory.findMany({
// //       where: { companyId, isActive: true },
// //       orderBy: { name: "asc" },
// //     });
// //   } catch (error) {
// //     console.error("Error fetching expense categories:", error);
// //     throw error;
// //   }
// // }

// // export async function createExpense(
// //   companyId: string,
// //   userId: string,
// //   data: {
// //     categoryId: string;
// //     description: string;
// //     amount: number;
// //     expenseDate: Date;
// //     paymentMethod: string;
// //     referenceNumber?: string;
// //     notes?: string;
// //   },
// // ) {
// //   try {
// //     // Generate expense number
// //     const lastExpense = await prisma.expense.findFirst({
// //       where: { companyId },
// //       orderBy: { createdAt: "desc" },
// //       select: { expenseNumber: true },
// //     });

// //     const expenseNumber = `EXP-${Date.now()}`;

// //     const expense = await prisma.expense.create({
// //       data: {
// //         companyId,
// //         userId,
// //         categoryId: data.categoryId,
// //         expenseNumber,
// //         description: data.description,
// //         amount: data.amount,
// //         expenseDate: data.expenseDate,
// //         paymentMethod: data.paymentMethod,
// //         referenceNumber: data.referenceNumber,
// //         notes: data.notes,
// //         status: "pending",
// //       },
// //       include: {
// //         category: true,
// //         user: true,
// //       },
// //     });

// //     // Log activity
// //     await prisma.activityLogs.create({
// //       data: {
// //         userId,
// //         companyId,
// //         action: "created expense",
// //         details: `Expense: ${data.description}, Amount: ${data.amount}`,
// //       },
// //     });

// //     revalidatePath("/expenses");
// //     return { success: true, expense };
// //   } catch (error) {
// //     console.error("Error creating expense:", error);
// //     return {
// //       success: false,
// //       error:
// //         error instanceof Error ? error.message : "Failed to create expense",
// //     };
// //   }
// // }

// // export async function updateExpense(
// //   expenseId: string,
// //   companyId: string,
// //   userId: string,
// //   data: {
// //     categoryId?: string;
// //     description?: string;
// //     amount?: number;
// //     expenseDate?: Date;
// //     paymentMethod?: string;
// //     status?: string;
// //     notes?: string;
// //   },
// // ) {
// //   try {
// //     const expense = await prisma.expense.update({
// //       where: { id: expenseId },
// //       data: {
// //         ...(data.categoryId && { categoryId: data.categoryId }),
// //         ...(data.description && { description: data.description }),
// //         ...(data.amount && { amount: data.amount }),
// //         ...(data.expenseDate && { expenseDate: data.expenseDate }),
// //         ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
// //         ...(data.status && { status: data.status }),
// //         ...(data.notes && { notes: data.notes }),
// //       },
// //       include: {
// //         category: true,
// //         user: true,
// //       },
// //     });

// //     // Log activity
// //     await prisma.activityLogs.create({
// //       data: {
// //         userId,
// //         companyId,
// //         action: "updated expense",
// //         details: `Expense: ${expense.description}, Amount: ${expense.amount}`,
// //       },
// //     });

// //     revalidatePath("/expenses");
// //     return { success: true, expense };
// //   } catch (error) {
// //     console.error("Error updating expense:", error);
// //     return {
// //       success: false,
// //       error:
// //         error instanceof Error ? error.message : "Failed to update expense",
// //     };
// //   }
// // }

// // export async function deleteExpense(
// //   expenseId: string,
// //   companyId: string,
// //   userId: string,
// // ) {
// //   try {
// //     const expense = await prisma.expense.delete({
// //       where: { id: expenseId },
// //     });

// //     // Log activity
// //     await prisma.activityLogs.create({
// //       data: {
// //         userId,
// //         companyId,
// //         action: "deleted expense",
// //         details: `Expense: ${expense.description}, Amount: ${expense.amount}`,
// //       },
// //     });

// //     revalidatePath("/expenses");
// //     return { success: true };
// //   } catch (error) {
// //     console.error("Error deleting expense:", error);
// //     return {
// //       success: false,
// //       error:
// //         error instanceof Error ? error.message : "Failed to delete expense",
// //     };
// //   }
// // }

// // ============================================
// // FILE: app/expenses/columns.tsx
// // ============================================

// // import { ColumnDef } from "@tanstack/react-table";
// // import { Checkbox } from "@/components/ui/checkbox";
// // import { Badge } from "@/components/ui/badge";
// // import { Button } from "@/components/ui/button";
// // import {
// //   Dialog,
// //   DialogContent,
// //   DialogHeader,
// //   DialogTitle,
// //   DialogTrigger,
// // } from "@/components/ui/dialog";
// // import { Edit, Trash2 } from "lucide-react";
// // import { ExpenseEditForm } from "./ExpenseEditForm";

// // export const expenseColumns: ColumnDef<any>[] = [
// //   {
// //     id: "select",
// //     header: ({ table }) => (
// //       <Checkbox
// //         checked={
// //           table.getIsAllPageRowsSelected() ||
// //           (table.getIsSomePageRowsSelected() && "indeterminate")
// //         }
// //         onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
// //         aria-label="تحديد الكل"
// //       />
// //     ),
// //     cell: ({ row }) => (
// //       <Checkbox
// //         checked={row.getIsSelected()}
// //         onCheckedChange={(value) => row.toggleSelected(!!value)}
// //         aria-label="تحديد الصف"
// //       />
// //     ),
// //     enableSorting: false,
// //     enableHiding: false,
// //   },

// //   {
// //     accessorKey: "#",
// //     header: "#",
// //     cell: ({ row }) => row.index + 1,
// //   },

// //   {
// //     accessorKey: "expenseNumber",
// //     header: "رقم المصروف",
// //     cell: ({ row }) => (
// //       <span className="font-mono text-sm">{row.original.expenseNumber}</span>
// //     ),
// //   },

// //   {
// //     accessorKey: "description",
// //     header: "الوصف",
// //     cell: ({ row }) => (
// //       <div className="max-w-xs truncate">{row.original.description}</div>
// //     ),
// //   },

// //   {
// //     accessorKey: "category.name",
// //     header: "الفئة",
// //     cell: ({ row }) => (
// //       <Badge variant="outline">{row.original.category?.name}</Badge>
// //     ),
// //   },

// //   {
// //     accessorKey: "amount",
// //     header: "المبلغ",
// //     cell: ({ row }) => (
// //       <div className="font-semibold">
// //         {Number(row.original.amount).toFixed(2)}
// //       </div>
// //     ),
// //   },

// //   {
// //     accessorKey: "paymentMethod",
// //     header: "طريقة الدفع",
// //     cell: ({ row }) => {
// //       const methods: Record<string, string> = {
// //         cash: "نقداً",
// //         bank_transfer: "تحويل بنكي",
// //         check: "شيك",
// //         credit: "ائتمان",
// //       };
// //       return <span>{methods[row.original.paymentMethod] || row.original.paymentMethod}</span>;
// //     },
// //   },

// //   {
// //     accessorKey: "expenseDate",
// //     header: "التاريخ",
// //     cell: ({ row }) => {
// //       const date = new Date(row.original.expenseDate);
// //       return <div>{date.toLocaleDateString("ar-EG")}</div>;
// //     },
// //   },

// //   {
// //     accessorKey: "status",
// //     header: "الحالة",
// //     cell: ({ row }) => {
// //       const status = row.original.status;
// //       const colors: Record<string, string> = {
// //         pending: "bg-yellow-500",
// //         approved: "bg-green-500",
// //         rejected: "bg-red-500",
// //         paid: "bg-purple-500",
// //       };
// //       const labels: Record<string, string> = {
// //         pending: "قيد الانتظار",
// //         approved: "موافق عليه",
// //         rejected: "مرفوض",
// //         paid: "مدفوع",
// //       };
// //       return (
// //         <Badge className={colors[status]}>
// //           {labels[status] || status}
// //         </Badge>
// //       );
// //     },
// //   },

// //   {
// //     id: "actions",
// //     header: "الإجراءات",
// //     cell: ({ row }) => (
// //       <div className="flex gap-2">
// //         <Dialog>
// //           <DialogTrigger asChild>
// //             <Button variant="outline" size="sm">
// //               <Edit className="h-4 w-4" />
// //             </Button>
// //           </DialogTrigger>
// //           <DialogContent dir="rtl">
// //             <DialogHeader>
// //               <DialogTitle>تعديل المصروف</DialogTitle>
// //             </DialogHeader>
// //             <ExpenseEditForm expense={row.original} />
// //           </DialogContent>
// //         </Dialog>
// //       </div>
// //     ),
// //   },
// // ];

// // // ============================================
// // // FILE: app/expenses/ExpenseEditForm.tsx
// // // ============================================

// // "use client";

// // import { useForm } from "react-hook-form";
// // import { Input } from "@/components/ui/input";
// // import { Label } from "@/components/ui/label";
// // import { Button } from "@/components/ui/button";
// // import { toast } from "sonner";
// // import { useAuth } from "@/lib/context/AuthContext";
// // import { updateExpense } from "@/app/actions/expenses";
// // import { useState, useEffect } from "react";
// // import { getExpenseCategories } from "@/app/actions/expenses";

// // export function ExpenseEditForm({
// //   expense,
// //   onClose,
// // }: {
// //   expense: any;
// //   onClose?: () => void;
// // }) {
// //   const { register, handleSubmit, setValue } = useForm({
// //     defaultValues: {
// //       description: expense.description,
// //       amount: Number(expense.amount),
// //       paymentMethod: expense.paymentMethod,
// //       status: expense.status,
// //       notes: expense.notes || "",
// //       expenseDate: new Date(expense.expenseDate)
// //         .toISOString()
// //         .slice(0, 16),
// //       categoryId: expense.categoryId,
// //     },
// //   });

// //   const { user } = useAuth();
// //   const [categories, setCategories] = useState<any[]>([]);

// //   useEffect(() => {
// //     if (user) {
// //       getExpenseCategories(user.companyId).then(setCategories);
// //     }
// //   }, [user]);

// //   const onSubmit = async (data: any) => {
// //     try {
// //       if (!user) return;

// //       const result = await updateExpense(
// //         expense.id,
// //         user.companyId,
// //         user.userId,
// //         {
// //           description: data.description,
// //           amount: Number(data.amount),
// //           paymentMethod: data.paymentMethod,
// //           status: data.status,
// //           notes: data.notes,
// //           expenseDate: new Date(data.expenseDate),
// //           categoryId: data.categoryId,
// //         },
// //       );

// //       if (result.success) {
// //         toast.success("تم تحديث المصروف بنجاح");
// //         onClose?.();
// //       } else {
// //         toast.error(result.error || "فشل التحديث");
// //       }
// //     } catch (error) {
// //       toast.error("حدث خطأ في التحديث");
// //       console.error(error);
// //     }
// //   };

// //   return (
// //     <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
// //       <div className="grid gap-2">
// //         <Label>الوصف</Label>
// //         <Input {...register("description")} />
// //       </div>

// //       <div className="grid gap-2">
// //         <Label>الفئة</Label>
// //         <select
// //           {...register("categoryId")}
// //           className="rounded-md border px-3 py-2"
// //         >
// //           <option value="">-- اختر الفئة --</option>
// //           {categories.map((cat) => (
// //             <option key={cat.id} value={cat.id}>
// //               {cat.name}
// //             </option>
// //           ))}
// //         </select>
// //       </div>

// //       <div className="grid gap-2">
// //         <Label>المبلغ</Label>
// //         <Input type="number" step="0.01" {...register("amount")} />
// //       </div>

// //       <div className="grid gap-2">
// //         <Label>طريقة الدفع</Label>
// //         <select
// //           {...register("paymentMethod")}
// //           className="rounded-md border px-3 py-2"
// //         >
// //           <option value="cash">نقداً</option>
// //           <option value="bank_transfer">تحويل بنكي</option>
// //           <option value="check">شيك</option>
// //           <option value="credit">ائتمان</option>
// //         </select>
// //       </div>

// //       <div className="grid gap-2">
// //         <Label>الحالة</Label>
// //         <select
// //           {...register("status")}
// //           className="rounded-md border px-3 py-2"
// //         >
// //           <option value="pending">قيد الانتظار</option>
// //           <option value="approved">موافق عليه</option>
// //           <option value="rejected">مرفوض</option>
// //           <option value="paid">مدفوع</option>
// //         </select>
// //       </div>

// //       <div className="grid gap-2">
// //         <Label>التاريخ</Label>
// //         <Input type="datetime-local" {...register("expenseDate")} />
// //       </div>

// //       <div className="grid gap-2">
// //         <Label>ملاحظات</Label>
// //         <textarea
// //           {...register("notes")}
// //           className="rounded-md border px-3 py-2"
// //           rows={3}
// //         />
// //       </div>

// //       <div className="flex justify-end gap-2">
// //         <Button type="button" variant="outline" onClick={onClose}>
// //           إلغاء
// //         </Button>
// //         <Button type="submit">تحديث</Button>
// //       </div>
// //     </form>
// //   );
// // }

// // // ============================================
// // // FILE: app/expenses/ExpenseCreateForm.tsx
// // // ============================================

// // "use client";

// // import { useForm } from "react-hook-form";
// // import { zodResolver } from "@hookform/resolvers/zod";
// // import { z } from "zod";
// // import { Input } from "@/components/ui/input";
// // import { Label } from "@/components/ui/label";
// // import { Button } from "@/components/ui/button";
// // import { toast } from "sonner";
// // import { useAuth } from "@/lib/context/AuthContext";
// // import { createExpense } from "@/app/actions/expenses";
// // import { useState } from "react";

// // const expenseSchema = z.object({
// //   categoryId: z.string().min(1, "الفئة مطلوبة"),
// //   description: z.string().min(3, "الوصف مطلوب"),
// //   amount: z.number().min(0.01, "المبلغ مطلوب"),
// //   expenseDate: z.string().min(1, "التاريخ مطلوب"),
// //   paymentMethod: z.string().min(1, "طريقة الدفع مطلوبة"),
// //   referenceNumber: z.string().optional(),
// //   notes: z.string().optional(),
// // });

// // type ExpenseFormData = z.infer<typeof expenseSchema>;

// // export function ExpenseCreateForm({
// //   categories,
// //   onClose,
// // }: {
// //   categories: any[];
// //   onClose?: () => void;
// // }) {
// //   const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ExpenseFormData>({
// //     resolver: zodResolver(expenseSchema),
// //     defaultValues: {
// //       expenseDate: new Date().toISOString().slice(0, 16),
// //       paymentMethod: "cash",
// //     },
// //   });

// //   const { user } = useAuth();

// //   const onSubmit = async (data: ExpenseFormData) => {
// //     try {
// //       if (!user) {
// //         toast.error("المستخدم غير مصرح");
// //         return;
// //       }

// //       const result = await createExpense(
// //         user.companyId,
// //         user.userId,
// //         {
// //           categoryId: data.categoryId,
// //           description: data.description,
// //           amount: data.amount,
// //           expenseDate: new Date(data.expenseDate),
// //           paymentMethod: data.paymentMethod,
// //           referenceNumber: data.referenceNumber,
// //           notes: data.notes,
// //         },
// //       );

// //       if (result.success) {
// //         toast.success("تم إضافة المصروف بنجاح");
// //         onClose?.();
// //       } else {
// //         toast.error(result.error || "فشل إضافة المصروف");
// //       }
// //     } catch (error) {
// //       toast.error("حدث خطأ أثناء إضافة المصروف");
// //       console.error(error);
// //     }
// //   };

// //   return (
// //     <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
// //       <div className="grid gap-2">
// //         <Label>الفئة *</Label>
// //         <select
// //           {...register("categoryId")}
// //           className="rounded-md border px-3 py-2"
// //         >
// //           <option value="">-- اختر الفئة --</option>
// //           {categories.map((cat) => (
// //             <option key={cat.id} value={cat.id}>
// //               {cat.name}
// //             </option>
// //           ))}
// //         </select>
// //         {errors.categoryId && (
// //           <p className="text-xs text-red-500">{errors.categoryId.message}</p>
// //         )}
// //       </div>

// //       <div className="grid gap-2">
// //         <Label>الوصف *</Label>
// //         <Input
// //           {...register("description")}
// //           placeholder="اكتب وصف المصروف"
// //         />
// //         {errors.description && (
// //           <p className="text-xs text-red-500">{errors.description.message}</p>
// //         )}
// //       </div>

// //       <div className="grid grid-cols-2 gap-4">
// //         <div className="grid gap-2">
// //           <Label>المبلغ *</Label>
// //           <Input
// //             type="number"
// //             step="0.01"
// //             {...register("amount", { valueAsNumber: true })}
// //           />
// //           {errors.amount && (
// //             <p className="text-xs text-red-500">{errors.amount.message}</p>
// //           )}
// //         </div>

// //         <div className="grid gap-2">
// //           <Label>طريقة الدفع *</Label>
// //           <select
// //             {...register("paymentMethod")}
// //             className="rounded-md border px-3 py-2"
// //           >
// //             <option value="cash">نقداً</option>
// //             <option value="bank_transfer">تحويل بنكي</option>
// //             <option value="check">شيك</option>
// //             <option value="credit">ائتمان</option>
// //           </select>
// //           {errors.paymentMethod && (
// //             <p className="text-xs text-red-500">{errors.paymentMethod.message}</p>
// //           )}
// //         </div>
// //       </div>

// //       <div className="grid gap-2">
// //         <Label>التاريخ *</Label>
// //         <Input
// //           type="datetime-local"
// //           {...register("expenseDate")}
// //         />
// //         {errors.expenseDate && (
// //           <p className="text-xs text-red-500">{errors.expenseDate.message}</p>
// //         )}
// //       </div>

// //       <div className="grid gap-2">
// //         <Label>رقم المرجع</Label>
// //         <Input
// //           {...register("referenceNumber")}
// //           placeholder="رقم الفاتورة أو الإيصال (اختياري)"
// //         />
// //       </div>

// //       <div className="grid gap-2">
// //         <Label>ملاحظات</Label>
// //         <textarea
// //           {...register("notes")}
// //           className="rounded-md border px-3 py-2"
// //           rows={3}
// //           placeholder="ملاحظات إضافية (اختياري)"
// //         />
// //       </div>

// //       <div className="flex justify-end gap-2 pt-4">
// //         <Button
// //           type="button"
// //           variant="outline"
// //           onClick={onClose}
// //           disabled={isSubmitting}
// //         >
// //           إلغاء
// //         </Button>
// //         <Button
// //           type="submit"
// //           className="bg-green-600 hover:bg-green-700"
// //           disabled={isSubmitting}
// //         >
// //           {isSubmitting ? "جاري الحفظ..." : "إضافة المصروف"}
// //         </Button>
// //       </div>
// //     </form>
// //   );
// // }

// // // ============================================
// // // FILE: app/expenses/page.tsx
// // // ============================================

// // "use client";

// // import { useEffect, useState } from "react";
// // import { DataTable } from "@/components/common/test";
// // import { Button } from "@/components/ui/button";
// // import { useTableParams } from "@/hooks/useTableParams";
// // import { useAuth } from "@/lib/context/AuthContext";
// // import { getExpensesByCompany, getExpenseCategories } from "@/app/actions/expenses";
// // import { expenseColumns } from "./columns";
// // import SearchInput from "@/components/common/searchtest";
// // import dynamic from "next/dynamic";
// // import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
// // import { Plus } from "lucide-react";
// // import { ExpenseCreateForm } from "./ExpenseCreateForm";

// // const Calendar22 = dynamic(
// //   () => import("@/components/common/DatePicker").then((m) => m.Calendar22),
// //   { ssr: false, loading: () => <input type="date" /> },
// // );

// // export default function ExpensesPage() {
// //   const { pagination, sorting, globalFilter, setPagination, setSorting, setGlobalFilter } = useTableParams();
// //   const { user } = useAuth();

// //   const [expenses, setExpenses] = useState<any[]>([]);
// //   const [total, setTotal] = useState(0);
// //   const [loading, setLoading] = useState(true);
// //   const [categories, setCategories] = useState<any[]>([]);
// //   const [categoryFilter, setCategoryFilter] = useState<string>("");
// //   const [statusFilter, setStatusFilter] = useState<string>("all");
// //   const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});
// //   const [dialogOpen, setDialogOpen] = useState(false);

// //   useEffect(() => {
// //     if (!user) return;

// //     const fetchData = async () => {
// //       setLoading(true);
// //       try {
// //         const [expensesData, categoriesData] = await Promise.all([
// //           getExpensesByCompany(user.companyId, {
// //             pageIndex: pagination.pageIndex,
// //             pageSize: pagination.pageSize,
// //             categoryId: categoryFilter,
// //             status: statusFilter,
// //             from: dateRange.from,
// //             to: dateRange.to,
// //             parsedSort: sorting,
// //           }),
// //           getExpenseCategories(user.companyId),
// //         ]);

// //         setExpenses(expensesData.data);
// //         setTotal(expensesData.total);
// //         setCategories(categoriesData);
// //       } catch (error) {
// //         console.error("Error fetching data:", error);
// //       } finally {
// //         setLoading(false);
// //       }
// //     };

// //     fetchData();
// //   }, [user, pagination, sorting, categoryFilter, statusFilter, dateRange]);

// //   if (!user) return null;

// //   return (
// //     <div
// //       className="bg-accent w-full rounded-2xl p-2 shadow-xl/20 shadow-gray-500"
// //       dir="rtl"
// //     >
// //       <div className="flex flex-wrap gap-2 p-1 md:flex-row lg:flex-row justify-between items-center">
// //         <div className="flex gap-2">
// //           <Calendar22 />
// //           <SearchInput placeholder="بحث" paramKey="expense" />
// //         </div>

// //         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
// //           <DialogTrigger asChild>
// //             <Button className="bg-green-600 hover:bg-green-700">
// //               <Plus className="h-4 w-4" /> إضافة مصروف
// //             </Button>
// //           </DialogTrigger>
// //           <DialogContent dir="rtl" className="sm:max-w-md">
// //             <DialogHeader>
// //               <DialogTitle>إضافة مصروف جديد</DialogTitle>
// //             </DialogHeader>
// //             <ExpenseCreateForm
// //               categories={categories}
// //               onClose={() => setDialogOpen(false)}
// //             />
// //           </DialogContent>
// //         </Dialog>
// //       </div>

// //       <div className="flex flex-wrap gap-2 p-2">
// //         <select
// //           value={categoryFilter}
// //           onChange={(e) => {
// //             setCategoryFilter(e.target.value);
// //             setPagination({ ...pagination, pageIndex: 0 });
// //           }}
// //           className="rounded-md border px-3 py-2 text-sm"
// //         >
// //           <option value="">جميع الفئات</option>
// //           {categories.map((cat) => (
// //             <option key={cat.id} value={cat.id}>
// //               {cat.name}
// //             </option>
// //           ))}
// //         </select>

// //         <select
// //           value={statusFilter}
// //           onChange={(e) => {
// //             setStatusFilter(e.target.value);
// //             setPagination({ ...pagination, pageIndex: 0 });
// //           }}
// //           className="rounded-md border px-3 py-2 text-sm"
// //         >
// //           <option value="all">جميع الحالات</option>
// //           <option value="pending">قيد الانتظار</option>
// //           <option value="approved">موافق عليه</option>
// //           <option value="rejected">مرفوض</option>
// //           <option value="paid">مدفوع</option>
// //         </select>
// //       </div>

// //       <DataTable
// //         data={expenses}
// //         columns={expenseColumns}
// //         initialPageSize={pagination.pageSize}
// //         pageCount={Math.ceil(total / pagination.pageSize)}
// //         pageAction={setPagination}
// //         onSortingChange={setSorting}
// //         onGlobalFilterChange={setGlobalFilter}
// //         globalFilter={globalFilter}
// //         sorting={sorting}
// //         pagination={pagination}
// //         height="h-[68vh]"
// //         totalCount={total}
// //       />
// //     </div>
// //   );
// // }
