"use client";

import { createPOS } from "@/lib/actions/pos";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/AuthContext";
import { CreatePosSchema, CreatePosType } from "@/lib/zod/pos";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
type Option = {
  users: {
    id: string;
    name: string;
  }[];
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

  const { user } = useAuth();
  if (!user?.companyId) return null;

  const onSubmit = async (data: CreatePosType) => {
    const result = await createPOS(data, user.companyId);
    // console.log(result);
    // if (result?.error) {
    //   toast.error(result.error);
    //   return;
    // }

    toast.success("✅ تمت إضافة نقطة البيع بنجاح");
    reset();
  };

  return (
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
            options={users.users}
            action={(val) => setValue("manager_id", val)}
          />
          {errors.manager_id && (
            <p className="text-xs text-red-500">{errors.manager_id.message}</p>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="submit">تأكيد</Button>
        </div>
      </div>
    </form>
  );
}
