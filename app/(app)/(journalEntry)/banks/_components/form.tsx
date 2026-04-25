"use client";

import Dialogreuse from "@/components/common/dailogreuse";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/common/selectproduct";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BankForm, BankSchema } from "@/lib/zod";
import { createBank, getbanks, updateBank } from "@/lib/actions/banks";
import { useAuth } from "@/lib/context/AuthContext";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Check, Landmark, Wallet } from "lucide-react"; // Added icons
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCompany } from "@/hooks/useCompany";
import { fallbackCurrencyOptions } from "@/lib/actions/currnciesOptions";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";

export default function BankFormDialog({
  banks,
  bank,
  mode = "create",
}: {
  banks?: {
    banks: { id: string; name: string }[];
    branches: { id: string; name: string }[];
  };
  bank?: any;
  mode?: "create" | "edit";
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BankForm>({
    resolver: zodResolver(BankSchema),
    defaultValues: {
      type: bank?.type ?? "BANK", // Default to Bank
      name: bank?.name ?? "",
      accountId: bank?.accountId ?? "",
      preferred_currency: bank?.preferred_currency ?? [],
      branchId: bank?.branch ?? "",
      accountNumber: bank?.accountNumber ?? "",
      iban: bank?.iban ?? "",
      swiftCode: bank?.swiftCode ?? "",
    },
  });

  const accountType = watch("type"); // Watch type to toggle fields
  const { company } = useCompany();
  const basCurrncy = company?.base_currency;
  const { options } = useCurrencyOptions();
  const currencyOptions = options.length ? options : fallbackCurrencyOptions;

  useEffect(() => {
    if (basCurrncy && mode === "create") {
      setValue("preferred_currency", [basCurrncy]);
    }
  }, [basCurrncy, setValue, mode]);

  const onSubmit = async (data: BankForm) => {
    setIsSubmitting(true);
    const res =
      mode === "create"
        ? await createBank(data, user!.companyId)
        : await updateBank(bank.id, data, user!.companyId);

    if (res?.error) {
      setIsSubmitting(false);
      toast.error(res.error);
    } else {
      toast.success("تم الحفظ بنجاح");
      setIsSubmitting(false);
      setOpen(false);
    }
  };

  const types = [
    { id: "BANK", name: "حساب بنكي", icon: <Landmark className="h-4 w-4" /> },
    { id: "CASH", name: "صندوق نقدي", icon: <Wallet className="h-4 w-4" /> },
  ];

  return (
    <Dialogreuse
      btnLabl={mode === "create" ? "إضافة حساب مالي" : "تعديل"}
      titel={accountType === "BANK" ? "بيانات البنك" : "بيانات الصندوق"}
      open={open}
      setOpen={setOpen}
      style="bg-accent sm:max-w-md"
    >
      <ScrollArea className="max-h-[85vh]" dir="rtl">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 p-4">
          {/* Toggle Type */}
          <div className="grid gap-2">
            <Label>نوع الحساب</Label>
            <div className="flex gap-2">
              {types.map((t) => (
                <Button
                  key={t.id}
                  type="button"
                  variant={accountType === t.id ? "default" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => setValue("type", t.id as "BANK" | "CASH")}
                >
                  {t.icon}
                  {t.name}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>
              {accountType === "BANK" ? "اسم البنك" : "اسم الصندوق"}
            </Label>
            <Input
              {...register("name")}
              placeholder={
                accountType === "BANK"
                  ? "مثال: بنك سبأ"
                  : "مثال: صندوق المبيعات الرئيسي"
              }
            />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Conditional Bank Fields */}
          {accountType === "BANK" && (
            <>
              <div className="grid gap-2">
                <Label>الفرع</Label>
                <SelectField
                  options={banks?.branches ?? []}
                  value={watch("branchId")}
                  action={(v) => setValue("branchId", v)}
                />
              </div>

              <div className="grid gap-2">
                <Label>رقم الحساب</Label>
                <Input {...register("accountNumber")} />
              </div>

              <div className="grid gap-2">
                <Label>IBAN</Label>
                <Input {...register("iban")} />
              </div>

              <div className="grid gap-2">
                <Label>SWIFT</Label>
                <Input {...register("swiftCode")} />
              </div>
            </>
          )}

          {/* Currencies - Standard for both */}
          <div className="grid gap-3">
            <Label className="text-right">العملات المسموحة</Label>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
              {currencyOptions.map((option) => {
                const isSelected = watch("preferred_currency")?.includes(
                  option.id,
                );
                return (
                  <div
                    key={option.id}
                    onClick={() => {
                      const currentValues = watch("preferred_currency") || [];
                      const newValues = isSelected
                        ? currentValues.filter((v: string) => v !== option.id)
                        : [...currentValues, option.id];
                      setValue("preferred_currency", newValues, {
                        shouldValidate: true,
                      });
                    }}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border p-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary"
                        : "bg-background border-gray-200"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-sm border ${isSelected ? "bg-primary border-primary" : "border-gray-300"}`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="text-sm font-medium">{option.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>الربط مع شجرة الحسابات</Label>
            <SelectField
              options={banks?.banks ?? []}
              value={watch("accountId")}
              action={(v) => setValue("accountId", v)}
            />
            <p className="text-muted-foreground text-[10px]">
              اختر الحساب المقابل في الدليل المحاسبي لترحيل القيود.
            </p>
          </div>

          <Button type="submit" disabled={isSubmitting} className="mt-2">
            {isSubmitting ? "جاري الحفظ..." : "حفظ البيانات"}
          </Button>
        </form>
      </ScrollArea>
    </Dialogreuse>
  );
}
