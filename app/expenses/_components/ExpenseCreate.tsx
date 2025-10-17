"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";

import { useState } from "react";
import { createExpense } from "@/app/actions/exponses";

const expenseSchema = z.object({
  categoryId: z.string().min(1, "الفئة مطلوبة"),
  description: z.string().min(3, "الوصف مطلوب"),
  amount: z.number().min(0.01, "المبلغ مطلوب"),
  expenseDate: z.string().min(1, "التاريخ مطلوب"),
  paymentMethod: z.string().min(1, "طريقة الدفع مطلوبة"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

export function ExpenseCreateForm({
  categories,
  onClose,
}: {
  categories: any[];
  onClose?: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expenseDate: new Date().toISOString().slice(0, 16),
      paymentMethod: "cash",
    },
  });

  const { user } = useAuth();

  const onSubmit = async (data: ExpenseFormData) => {
    try {
      if (!user) {
        toast.error("المستخدم غير مصرح");
        return;
      }

      const result = await createExpense(user.companyId, user.userId, {
        expense_categoriesId: data.categoryId,
        description: data.description,
        amount: data.amount,
        expense_date: new Date(data.expenseDate),
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber ?? "",
        notes: data.notes,
      });

      if (result.success) {
        toast.success("تم إضافة المصروف بنجاح");
        onClose?.();
      } else {
        toast.error(result.error || "فشل إضافة المصروف");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء إضافة المصروف");
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
      <div className="grid gap-2">
        <Label>الفئة *</Label>
        <select
          {...register("categoryId")}
          className="rounded-md border px-3 py-2"
        >
          <option value="">-- اختر الفئة --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {errors.categoryId && (
          <p className="text-xs text-red-500">{errors.categoryId.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>الوصف *</Label>
        <Input {...register("description")} placeholder="اكتب وصف المصروف" />
        {errors.description && (
          <p className="text-xs text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>المبلغ *</Label>
          <Input
            type="number"
            step="0.01"
            {...register("amount", { valueAsNumber: true })}
          />
          {errors.amount && (
            <p className="text-xs text-red-500">{errors.amount.message}</p>
          )}
        </div>

        <div className="grid gap-2">
          <Label>طريقة الدفع *</Label>
          <select
            {...register("paymentMethod")}
            className="rounded-md border px-3 py-2"
          >
            <option value="cash">نقداً</option>
            <option value="bank_transfer">تحويل بنكي</option>
            <option value="check">شيك</option>
            <option value="credit">ائتمان</option>
          </select>
          {errors.paymentMethod && (
            <p className="text-xs text-red-500">
              {errors.paymentMethod.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-2">
        <Label>التاريخ *</Label>
        <Input type="datetime-local" {...register("expenseDate")} />
        {errors.expenseDate && (
          <p className="text-xs text-red-500">{errors.expenseDate.message}</p>
        )}
      </div>

      <div className="grid gap-2">
        <Label>رقم المرجع</Label>
        <Input
          {...register("referenceNumber")}
          placeholder="رقم الفاتورة أو الإيصال (اختياري)"
        />
      </div>

      <div className="grid gap-2">
        <Label>ملاحظات</Label>
        <textarea
          {...register("notes")}
          className="rounded-md border px-3 py-2"
          rows={3}
          placeholder="ملاحظات إضافية (اختياري)"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
        >
          إلغاء
        </Button>
        <Button
          type="submit"
          className="bg-green-600 hover:bg-green-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? "جاري الحفظ..." : "إضافة المصروف"}
        </Button>
      </div>
    </form>
  );
}
