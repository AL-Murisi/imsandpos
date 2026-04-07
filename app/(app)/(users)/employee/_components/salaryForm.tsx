"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCompany } from "@/hooks/useCompany";
import { createEmployeeSalaryPayment } from "@/lib/actions/employees";
import { useAuth } from "@/lib/context/AuthContext";
import {
  EmployeeSalaryPaymentInput,
  EmployeeSalaryPaymentSchema,
} from "@/lib/zod";

export default function EmployeeSalaryForm({ employee }: { employee: any }) {
  const { user } = useAuth();
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const branchOptions = useMemo(
    () =>
      (company?.branches ?? []).map((branch) => ({
        id: branch.id,
        name: branch.name,
      })),
    [company?.branches],
  );

  const paymentMethodOptions = [
    { id: "cash", name: "نقدي" },
    { id: "bank", name: "بنكي" },
  ];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmployeeSalaryPaymentInput>({
    resolver: zodResolver(EmployeeSalaryPaymentSchema),
    defaultValues: {
      amount: Number(employee.salary ?? 0) || undefined,
      paymentMethod: "cash",
      paymentDate: new Date().toISOString().split("T")[0],
      branchId: undefined,
      referenceNumber: "",
      notes: "",
      currencyCode: company?.base_currency ?? undefined,
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      amount: Number(employee.salary ?? 0) || undefined,
      paymentMethod: "cash",
      paymentDate: new Date().toISOString().split("T")[0],
      branchId: undefined,
      referenceNumber: "",
      notes: "",
      currencyCode: company?.base_currency ?? undefined,
    });
  }, [company?.base_currency, employee.salary, open, reset]);

  if (!user?.companyId) return null;

  const onSubmit = async (data: EmployeeSalaryPaymentInput) => {
    setIsSubmitting(true);
    const result = await createEmployeeSalaryPayment(
      employee.id,
      user.companyId,
      data,
    );

    if (result?.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("تم تسجيل صرف الراتب بنجاح");
    setOpen(false);
    setIsSubmitting(false);
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="صرف راتب"
      titel={`صرف راتب ${employee.name}`}
      style="sm:max-w-3xl"
      description="سيتم إنشاء سند صرف ومعاملة مالية وقيد يومية للراتب."
      disabled={!employee.isActive}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="amount">المبلغ</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="text-xs text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>طريقة الدفع</Label>
            <SelectField
              options={paymentMethodOptions}
              value={watch("paymentMethod")}
              action={(value) =>
                setValue("paymentMethod", value as "cash" | "bank")
              }
            />
            {errors.paymentMethod && (
              <p className="text-xs text-red-500">
                {errors.paymentMethod.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="paymentDate">تاريخ الدفع</Label>
            <Input id="paymentDate" type="date" {...register("paymentDate")} />
            {errors.paymentDate && (
              <p className="text-xs text-red-500">
                {errors.paymentDate.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="currencyCode">العملة</Label>
            <Input
              id="currencyCode"
              {...register("currencyCode")}
              defaultValue={company?.base_currency ?? ""}
            />
          </div>

          <div className="grid gap-2">
            <Label>الفرع</Label>
            <SelectField
              options={branchOptions}
              value={watch("branchId")}
              action={(value) => setValue("branchId", value)}
              placeholder="اختياري"
              disabled={branchOptions.length === 0}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="referenceNumber">المرجع</Label>
            <Input id="referenceNumber" {...register("referenceNumber")} />
          </div>

          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Input id="notes" {...register("notes")} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[120px] bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "جاري الحفظ..." : "تسجيل الراتب"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
