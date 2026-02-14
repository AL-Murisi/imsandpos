"use client";

import { SelectField } from "@/components/common/selectproduct";
import Dailogreuse from "@/components/common/dailogreuse";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/AuthContext";
import { fetchPOSManagers, updateBranch } from "@/lib/actions/pos";
import { CreatePosInputType, CreatePosSchema } from "@/lib/zod/pos";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

type UserOption = {
  id: string;
  name: string;
};

type BranchFormData = {
  name?: string;
  location?: string | null;
  manager?: { id?: string | null } | null;
  cashiers?: { id: string; name?: string | null }[];
};

export default function EditPoS({
  branch,
}: {
  branch: BranchFormData & { id: string };
}) {
  const { user } = useAuth();

  const [open, setOpen] = useState(false);
  const [managers, setManagers] = useState<UserOption[]>([]);
  const [cashiers, setCashiers] = useState<UserOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePosInputType>({
    resolver: zodResolver(CreatePosSchema),
    defaultValues: {
      name: branch.name ?? "",
      managerId: branch.manager?.id ?? "",
      location: branch.location ?? "",
      cashierIds: branch.cashiers?.map((c) => c.id) ?? [],
    },
  });

  const currentManagerId = watch("managerId");
  const selectedCashierIds = watch("cashierIds") ?? [];

  useEffect(() => {
    if (!open || !user?.companyId) return;

    const fetchUsers = async () => {
      const result = await fetchPOSManagers(user.companyId);
      setManagers(result?.managers ?? []);
      setCashiers(result?.cashiers ?? []);
    };

    fetchUsers();
  }, [open, user?.companyId]);

  if (!user?.companyId) return null;

  const toggleCashier = (cashierId: string, checked: boolean) => {
    const current = selectedCashierIds;

    const next = checked
      ? Array.from(new Set([...current, cashierId]))
      : current.filter((id) => id !== cashierId);

    setValue("cashierIds", next, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const onSubmit = async (data: CreatePosInputType) => {
    try {
      setIsSubmitting(true);

      const result = await updateBranch(data, branch.id, user.companyId);

      if (result?.error) {
        toast.error(result.error);
        return;
      }

      toast.success("تم تحديث بيانات نقطة البيع بنجاح");
      setOpen(false);

      reset({
        name: data.name,
        location: data.location ?? "",
        managerId: data.managerId,
        cashierIds: data.cashierIds ?? [],
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={"تعديل الفرع"}
      style="w-sm"
      description="تعديل بيانات نقطة البيع"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        <div className="grid gap-4">
          {/* اسم الفرع */}
          <div className="grid gap-2">
            <Label htmlFor="name">اسم نقطة البيع</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* الموقع */}
          <div className="grid gap-2">
            <Label htmlFor="location">الموقع</Label>
            <Input id="location" {...register("location")} />
            {errors.location && (
              <p className="text-xs text-red-500">{errors.location.message}</p>
            )}
          </div>

          {/* المدير */}
          <div className="grid gap-2">
            <Label htmlFor="manager_id">مدير الفرع</Label>
            <SelectField
              placeholder="اختر المدير"
              options={managers}
              value={currentManagerId}
              action={(val) =>
                setValue("managerId", val, {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            />
            {errors.managerId && (
              <p className="text-xs text-red-500">{errors.managerId.message}</p>
            )}
          </div>

          {/* الكاشيرين */}
          <div className="grid gap-2">
            <Label>الكاشيرون (يمكن اختيار أكثر من واحد)</Label>

            <div className="max-h-40 space-y-2 overflow-auto rounded-md border p-2">
              {cashiers.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  لا يوجد كاشيرين متاحين
                </p>
              )}

              {cashiers.map((cashier) => {
                const checked = selectedCashierIds.includes(cashier.id);

                return (
                  <label
                    key={cashier.id}
                    className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded px-2 py-1"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        toggleCashier(cashier.id, value === true)
                      }
                    />
                    <span className="text-sm">{cashier.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* زر الحفظ */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px] bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </div>
      </form>
    </Dailogreuse>
  );
}
