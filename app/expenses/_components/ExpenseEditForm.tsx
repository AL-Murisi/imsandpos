"use client";

import { getExpenseCategories, updateExpense } from "@/lib/actions/exponses";
import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/AuthContext";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Fetchbanks } from "@/lib/actions/banks";

export function ExpenseEditForm({ expense }: { expense: any }) {
  const { register, handleSubmit, setValue, watch } = useForm({
    defaultValues: {
      description: expense.description,
      amount: Number(expense.amount),
      payment_method: expense.payment_method,
      status: expense.status,
      notes: expense.notes || "",
      expenseDate: new Date(expense.expenseDate).toISOString().slice(0, 16),
      account_id: expense.account_id ?? "",
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const paymentMethod = watch("payment_method");
  const [banks, setBanks] = useState<{ id: string; name: string }[]>([]);
  const [selectedBankId, setSelectedBankId] = useState("");

  const status = watch("status");
  const account_id = watch("account_id");
  const { user } = useAuth();
  if (!user) return;
  const [categories, setCategories] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (user) {
      getExpenseCategories(user.companyId).then(setCategories);
    }
  }, [open]);
  useEffect(() => {
    if (categories.length && expense.account_id) {
      setValue("account_id", expense.account_id); // تعيين القيمة الافتراضية بعد تحميل الفئات
    }
  }, [categories, expense.account_id, setValue]);
  useEffect(() => {
    if (paymentMethod !== "bank" || !open) {
      setBanks([]);
      setSelectedBankId("");
      return;
    }

    const loadBanks = async () => {
      try {
        const result = await Fetchbanks();
        setBanks(result);
      } catch (err) {
        console.error(err);
        toast.error("فشل في جلب البنوك");
      }
    };

    loadBanks();
  }, [open, paymentMethod]);
  const onSubmit = async (data: any) => {
    try {
      if (!user) return;
      setIsSubmitting(true);
      const result = await updateExpense(
        expense.id,
        user.companyId,
        user.userId,
        {
          description: data.description,
          amount: Number(data.amount),
          payment_method: data.payment_method,
          status: data.status,
          notes: data.notes,
          expense_date: new Date(data.expenseDate),
          account_id: data.account_id ?? "",
        },
      );

      if (result.success) {
        toast.success("تم تحديث المصروف بنجاح");
        setOpen(false);
        setIsSubmitting(false);
      } else {
        toast.error(result.error || "فشل التحديث");
      }
    } catch (error) {
      toast.error("حدث خطأ في التحديث");
      console.error(error);
    }
  };
  const paymentMethods = [
    { id: "cash", name: "نقداً" },
    { id: "bank_transfer", name: "تحويل بنكي" },
    { id: "check", name: "شيك" },
    { id: "credit", name: "ائتمان" },
  ];

  const statusOptions = [
    { id: "pending", name: "قيد الانتظار" },
    { id: "approved", name: "موافق عليه" },
    { id: "rejected", name: "مرفوض" },
    { id: "paid", name: "مدفوع" },
  ];

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="تسديد"
      style="bg-accent sm:max-w-md"
      titel=">إضافة فئة جديدة للمصروف"
      description="قم بإدخال المبلغ الجديد لتسديد جزء أو كل الدين."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="" dir="rtl">
        <div className="grid gap-2">
          <Label>الوصف</Label>
          <Input {...register("description")} />
        </div>

        <div className="grid gap-2">
          <Label>الفئة</Label>

          <SelectField
            options={categories}
            value={account_id}
            action={(val) => setValue("account_id", val)}
            placeholder="اختر الفئة"
          />
        </div>

        <div className="grid gap-2">
          <Label>المبلغ</Label>
          <Input type="number" step="0.01" {...register("amount")} />
        </div>

        <div className="grid gap-2">
          ` <Label>طريقة الدفع</Label>
          <SelectField
            options={paymentMethods}
            value={paymentMethod}
            action={(val) => setValue("payment_method", val)}
            placeholder="اختر الفئة"
          />
          `
        </div>

        <div className="grid gap-2">
          <Label>الحالة</Label>
          <SelectField
            options={statusOptions}
            value={status}
            action={(val) => setValue("status", val)}
            placeholder="اختر الفئة"
          />
          {/* <select
              {...register("status")}
              className="rounded-md border px-3 py-2"
            >
              <option value="pending">قيد الانتظار</option>
              <option value="approved">موافق عليه</option>
              <option value="rejected">مرفوض</option>
              <option value="paid">مدفوع</option>
            </select> */}
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
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            إلغاء
          </Button>
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "جاري الحفظ..." : "تحديث"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
