"use client";

import { createPOS } from "@/lib/actions/pos";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/AuthContext";
import { CreatePosSchema, CreatePosType } from "@/lib/zod/pos";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Dailogreuse from "@/components/common/dailogreuse";
type Option = {
  users: {
    managers: {
      name: string;
      id: string;
    }[];
    cashiers: {
      name: string;
      id: string;
    }[];
  };
};

export default function POSForm(users: Option) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreatePosType>({
    resolver: zodResolver(CreatePosSchema),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  if (!user?.companyId) return null;

  const onSubmit = async (data: CreatePosType) => {
    setIsSubmitting(true);

    const result = await createPOS(data, user.companyId);
    // console.log(result);
    // if (result?.error) {
    //   toast.error(result.error);
    //   return;
    // }
    setIsSubmitting(false);
    toast.success("✅ تمت إضافة نقطة البيع بنجاح");
    setOpen(false);
    reset();
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={" إضافة فرع"}
      style="w-sm"
      description="أدخل تفاصيل المستخدم أدناه."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        <div className="grid gap-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">اسم نقطة البيع</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Location */}
          <div className="grid gap-2">
            <Label htmlFor="location">الموقع</Label>
            <Input id="location" {...register("location")} />
            {errors.location && (
              <p className="text-xs text-red-500">{errors.location.message}</p>
            )}
          </div>

          {/* Manager */}
          <div className="grid gap-2">
            <Label htmlFor="manager_id">معرّف المدير</Label>
            {/* Translate placeholder */}
            <SelectField
              placeholder="مستخدم"
              options={users.users.managers ?? []}
              action={(val) => setValue("managerId", val)}
            />
            {errors.managerId && (
              <p className="text-xs text-red-500">{errors.managerId.message}</p>
            )}
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px] bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ "}
            </Button>{" "}
          </div>
        </div>
      </form>
    </Dailogreuse>
  );
}
