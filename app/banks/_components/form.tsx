"use client";

import Dialogreuse from "@/components/common/dailogreuse";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/common/selectproduct";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BankForm, BankSchema } from "@/lib/zod";
import { z } from "zod";
import { createBank, getbanks, updateBank } from "@/lib/actions/banks";
import { useAuth } from "@/lib/context/AuthContext";
import { toast } from "sonner";
import { useEffect, useState } from "react";

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
    reset,
    formState: { errors },
  } = useForm<BankForm>({
    resolver: zodResolver(BankSchema),
    defaultValues: {
      name: bank?.name ?? "",
      accountId: bank?.accountId ?? "",

      branch: bank?.branch ?? "",
      accountNumber: bank?.accountNumber ?? "",
      iban: bank?.iban ?? "",
      swiftCode: bank?.swiftCode ?? "",
    },
  });
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    }
  };

  return (
    <Dialogreuse
      btnLabl={mode === "create" ? "إضافة بنك" : "تعديل"}
      titel="بيانات البنك"
      open={open}
      setOpen={setOpen}
      style={undefined}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
        <div className="grid gap-4">
          <Label>اسم البنك</Label>
          <Input {...register("name")} />
        </div>

        <div className="grid gap-4">
          <Label>الفرع</Label>
          <Input {...register("branch")} />
        </div>

        <div className="grid gap-4">
          <Label>رقم الحساب</Label>
          <Input {...register("accountNumber")} />
        </div>

        <div className="grid gap-4">
          <Label>IBAN</Label>
          <Input {...register("iban")} />
        </div>

        <div className="grid gap-4">
          <Label>SWIFT</Label>
          <Input {...register("swiftCode")} />
        </div>

        <div className="grid gap-4">
          <Label>الحساب المحاسبي</Label>
          {/* <SelectField
            options={banks ?? []}
            value={watch("accountId")}
            action={(v) => setValue("accountId", v)}
          /> */}
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
    </Dialogreuse>
  );
}
