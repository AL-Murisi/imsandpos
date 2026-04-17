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
import { Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCompany } from "@/hooks/useCompany";
import { fallbackCurrencyOptions } from "@/lib/actions/currnciesOptions";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";

export default function BankFormDialog({
  banks,
  bank,
  mode = "create",
}: {
  banks?: { id: string; name: string }[];
  bank?: any;
  mode?: "create" | "edit";
}) {
  const { user } = useAuth();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BankForm>({
    resolver: zodResolver(BankSchema),
    defaultValues: {
      name: bank?.name ?? "",
      accountId: bank?.accountId ?? "",
      preferred_currency: bank?.preferred_currency ?? [],
      branch: bank?.branch ?? "",
      accountNumber: bank?.accountNumber ?? "",
      iban: bank?.iban ?? "",
      swiftCode: bank?.swiftCode ?? "",
    },
  });

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { company } = useCompany();
  const basCurrncy = company?.base_currency;
  const { options } = useCurrencyOptions();
  const currencyOptions = options.length ? options : fallbackCurrencyOptions;

  const [bankOptions, setBankOptions] = useState<
    { id: string; name: string }[]
  >(banks ?? []);

  useEffect(() => {
    if (!open) return;
    if (!banks) {
      getbanks().then((res) => {
        setBankOptions(res);
      });
    }
  }, [open, banks]);

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

  return (
    <Dialogreuse
      btnLabl={mode === "create" ? "إضافة بنك" : "تعديل"}
      titel="بيانات البنك"
      open={open}
      setOpen={setOpen}
      style="sm:max-w-6xl"
    >
      <ScrollArea className="max-h-[85vh]" dir="rtl">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 p-4">
          <div className="grid gap-2">
            <Label>اسم البنك</Label>
            <Input {...register("name")} />
          </div>

          <div className="grid gap-2">
            <Label>الفرع</Label>
            <Input {...register("branch")} />
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

          <div className="grid gap-3">
            <Label className="text-right">العملات المسموحة</Label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
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
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "bg-gray border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <span className="font-medium">{option.name}</span>
                  </div>
                );
              })}
            </div>
            {errors.preferred_currency && (
              <p className="text-xs text-red-500">
                {errors.preferred_currency.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>الحساب المحاسبي</Label>
            <SelectField
              options={bankOptions}
              value={watch("accountId")}
              action={(v) => setValue("accountId", v)}
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </form>
      </ScrollArea>
    </Dialogreuse>
  );
}
