"use client";

import { createExpense } from "@/lib/actions/exponses";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import Dailogreuse from "@/components/common/dailogreuse";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/context/AuthContext";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

interface ExpenseFormInput {
  account_id: string;
  description: string;
  amount: string;
  expense_date: string;
  paymentMethod: string;
  referenceNumber: string;
  notes?: string;
}

interface ExpenseFormProps {
  companyId: string;
  userId: string;
  categories: { id: string; name: string }[];
}

export default function ExpenseForm({
  companyId,
  userId,
  categories,
}: ExpenseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
    setError,
  } = useForm<ExpenseFormInput>();
  const { user } = useAuth();
  if (!user) return;

  const onSubmit = (values: ExpenseFormInput) => {
    const parsedAmount = Number(values.amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("amount", {
        type: "manual",
        message: "يجب أن يكون المبلغ رقماً أكبر من صفر",
      });
      return;
    }

    startTransition(async () => {
      const payload = {
        ...values,

        amount: parsedAmount,
        expense_date: new Date(),
      };

      const res = await createExpense(user.companyId, user.userId, payload);

      if (res.success) {
        toast.success(`تمت إضافة المصروف بنجاح (المبلغ: ${parsedAmount})`);
        setOpen(false);
        reset();
      } else {
        toast.error(res.error || "حدث خطأ أثناء إنشاء المصروف");
      }
    });
  };
  const account_id = watch("account_id");
  // ✅ Inside onSubmit: just close dialog on success
  const paymentMethods = [
    { id: "cash", name: "نقداً" },
    { id: "bank_transfer", name: "تحويل بنكي" },
    { id: "check", name: "شيك" },
    { id: "credit", name: "ائتمان" },
  ];
  const accountCategories = [
    {
      id: "COST_OF_GOODS_SOLD",
      name: "تكلفة البضاعة المباعة",
      type: "EXPENSE",
    },
    { id: "OPERATING_EXPENSES", name: "مصاريف تشغيلية", type: "EXPENSE" },
    { id: "PAYROLL_EXPENSES", name: "مصاريف رواتب", type: "EXPENSE" },
    {
      id: "ADMINISTRATIVE_EXPENSES",
      name: "مصاريف إدارية",
      type: "EXPENSE",
    },
    { id: "OTHER_EXPENSES", name: "مصاريف أخرى", type: "EXPENSE" },
    { id: "HOUSE_EXPENSES", name: "مصاريف منزلية", type: "EXPENSE" },
  ];
  // ...
  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إضافة مصروف"
      style="sm:max-w-md"
      titel="إضافة مصروف"
    >
      <ScrollArea>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-lg border border-gray-800 bg-gray-900 p-6 shadow-xl"
          dir="rtl"
        >
          <h2 className="border-b border-gray-700 pb-3 text-2xl font-bold text-gray-100">
            ➕ إضافة مصروف جديد
          </h2>

          {/* Category */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              فئة المصروف
            </label>

            <SelectField
              options={categories}
              value={account_id}
              action={(val) => setValue("account_id", val)}
              placeholder="اختر الفئة"
            />

            {errors.account_id && (
              <p className="mt-1 text-xs text-red-400">
                {errors.account_id.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              الوصف
            </label>
            <Input
              type="text"
              placeholder="أدخل وصف المصروف"
              {...register("description", { required: "يرجى إدخال الوصف" })}
              className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              المبلغ
            </label>
            <Input
              type="number"
              placeholder="أدخل المبلغ"
              {...register("amount", {
                required: "يرجى إدخال المبلغ",
              })}
              className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-red-400">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* Expense Date */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              تاريخ المصروف
            </label>
            <Input
              type="date"
              defaultValue={new Date().toISOString().split("T")[0]} // "YYYY-MM-DD"
              {...register("expense_date", {
                required: "يرجى تحديد تاريخ المصروف",
              })}
              className="border-gray-700 bg-gray-800 text-gray-100"
            />
            {errors.expense_date && (
              <p className="mt-1 text-xs text-red-400">
                {errors.expense_date.message}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              طريقة الدفع
            </label>
            <Controller
              name="paymentMethod"
              control={control}
              rules={{ required: "يرجى تحديد طريقة الدفع" }}
              render={({ field }) => (
                <SelectField
                  options={paymentMethods}
                  value={field.value}
                  action={field.onChange}
                  placeholder="اختر طريقة الدفع"
                />
              )}
            />
            {errors.paymentMethod && (
              <p className="mt-1 text-xs text-red-400">
                {errors.paymentMethod.message}
              </p>
            )}
          </div>

          {/* Reference Number */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              رقم المرجع (رقم الفاتورة)
            </label>
            <Input
              type="text"
              placeholder="أدخل رقم الفاتورة أو المرجع"
              {...register("referenceNumber", {
                required: "يرجى إدخال رقم المرجع",
              })}
              className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
            />
            {errors.referenceNumber && (
              <p className="mt-1 text-xs text-red-400">
                {errors.referenceNumber.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-200">
              ملاحظات (اختياري)
            </label>
            <Textarea
              rows={3}
              placeholder="أدخل أي ملاحظات إضافية"
              {...register("notes")}
              className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
            />
          </div>

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-blue-600 font-semibold text-white hover:bg-blue-700 disabled:bg-gray-600"
          >
            {isPending ? "جارٍ الحفظ..." : "💾 حفظ المصروف"}
          </Button>
        </form>
      </ScrollArea>
    </Dailogreuse>
  );
}
