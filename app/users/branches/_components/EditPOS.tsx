"use client";

import { createCutomer } from "@/lib/actions/customers";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateCustomerSchema } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import Dailogreuse from "@/components/common/dailogreuse";
import { useEffect, useState } from "react";
import { CreatePosSchema, CreatePosType } from "@/lib/zod/pos";
import { fetchPOSManagers, updateBranch } from "@/lib/actions/pos";

type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
type user = {
  id: string;
  name: string;
};
export default function EditPoS({ branch }: any) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreatePosType>({
    resolver: zodResolver(CreatePosSchema),
    defaultValues: {
      name: branch.name,
      managerId: branch.manager.id,
      location: branch.location,
    },
  });
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<user[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const currentManagerId = watch("managerId");
  if (!user?.companyId) return;
  useEffect(() => {
    if (!open) return;
    const fetchUser = async () => {
      const userSelection = await fetchPOSManagers(user.companyId);
      setUsers(userSelection);
    };
    fetchUser();
  }, [open]);
  const onSubmit = async (data: CreatePosType) => {
    const result = await updateBranch(data, branch.id, user.companyId);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("✅ تمت إضافة  بنجاح");
    setOpen(false);
    reset();
  };
  const customerType = [
    { id: "individual ", name: "فردي" },
    { id: "business ", name: "تجاري" },
  ];

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={"تعديل "}
      style="w-sm"
      description="   "
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
              options={users}
              value={currentManagerId}
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
