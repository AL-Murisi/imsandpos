"use client";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { getExpenseCategories, updateExpense } from "@/app/actions/exponses";

export function ExpenseEditForm({
  expense,
  onClose,
}: {
  expense: any;
  onClose?: () => void;
}) {
  const { register, handleSubmit, setValue } = useForm({
    defaultValues: {
      description: expense.description,
      amount: Number(expense.amount),
      paymentMethod: expense.paymentMethod,
      status: expense.status,
      notes: expense.notes || "",
      expenseDate: new Date(expense.expenseDate).toISOString().slice(0, 16),
      categoryId: expense.categoryId,
    },
  });

  const { user } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (user) {
      getExpenseCategories(user.companyId).then(setCategories);
    }
  }, [user]);

  const onSubmit = async (data: any) => {
    try {
      if (!user) return;

      const result = await updateExpense(
        expense.id,
        user.companyId,
        user.userId,
        {
          description: data.description,
          amount: Number(data.amount),
          paymentMethod: data.paymentMethod,
          status: data.status,
          notes: data.notes,
          expense_date: new Date(data.expenseDate),
          expense_categoriesId: data.categoryId,
        },
      );

      if (result.success) {
        toast.success("تم تحديث المصروف بنجاح");
        onClose?.();
      } else {
        toast.error(result.error || "فشل التحديث");
      }
    } catch (error) {
      toast.error("حدث خطأ في التحديث");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">تسديد الدين</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>تأكيد الدفع</DialogTitle>
          <DialogDescription>
            قم بإدخال المبلغ الجديد لتسديد جزء أو كل الدين.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-accent space-y-4"
          dir="rtl"
        >
          <div className="grid gap-2">
            <Label>الوصف</Label>
            <Input {...register("description")} />
          </div>

          <div className="grid gap-2">
            <Label>الفئة</Label>
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
          </div>

          <div className="grid gap-2">
            <Label>المبلغ</Label>
            <Input type="number" step="0.01" {...register("amount")} />
          </div>

          <div className="grid gap-2">
            <Label>طريقة الدفع</Label>
            <select
              {...register("paymentMethod")}
              className="rounded-md border px-3 py-2"
            >
              <option value="cash">نقداً</option>
              <option value="bank_transfer">تحويل بنكي</option>
              <option value="check">شيك</option>
              <option value="credit">ائتمان</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label>الحالة</Label>
            <select
              {...register("status")}
              className="rounded-md border px-3 py-2"
            >
              <option value="pending">قيد الانتظار</option>
              <option value="approved">موافق عليه</option>
              <option value="rejected">مرفوض</option>
              <option value="paid">مدفوع</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label>التاريخ</Label>
            <Input type="datetime-local" {...register("expenseDate")} />
          </div>

          <div className="grid gap-2">
            <Label>ملاحظات</Label>
            <textarea
              {...register("notes")}
              className="rounded-md border px-3 py-2"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              إلغاء
            </Button>
            <Button type="submit">تحديث</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
