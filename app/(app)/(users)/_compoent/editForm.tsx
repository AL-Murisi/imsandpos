"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { fetchRolesForSelect } from "@/lib/actions/roles";
import { UpdatwUser } from "@/lib/actions/users"; // Note: Check for typo in 'UpdatwUser' in your actions file
import { SelectField } from "@/components/common/selectproduct";
import { useAuth } from "@/lib/context/AuthContext";
import { UpdateUserSchema } from "@/lib/zod";
import { toast } from "sonner";
import Dailogreuse from "@/components/common/dailogreuse";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { z } from "zod";

type Role = {
  id: string;
  name: string;
};

type EditUserInput = z.infer<typeof UpdateUserSchema>;

export default function EditUserForm({ users }: any) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentRoleName = users?.roles?.[0]?.role?.name as string | undefined;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<EditUserInput>({
    resolver: zodResolver(UpdateUserSchema),
    defaultValues: {
      email: users.email,
      name: users.name,
      phoneNumber: users.phoneNumber,
      roleId: users?.roles?.[0]?.role?.id,
    },
  });

  const { user } = useAuth();
  if (!user) return null;

  useEffect(() => {
    if (!open) return;

    const loadRoles = async () => {
      const result = await fetchRolesForSelect();
      setRoles(result);
      if (result.length > 0) {
        const currentRole = currentRoleName
          ? result.find((r) => r.name === currentRoleName)
          : undefined;
        setValue("roleId", currentRole?.id ?? result[0].id);
      }
    };

    void loadRoles();
  }, [open, currentRoleName, setValue]);

  const selectedRole = watch("roleId");

  const onSubmit = async (data: EditUserInput) => {
    setIsSubmitting(true);

    try {
      const result = await UpdatwUser(data, users.id, user.companyId);
      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("تم تحديث المستخدم بنجاح");
      setOpen(false);
      reset(data);
    } catch {
      toast.error("فشل في تحديث المستخدم");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={"تعديل المستخدم"}
      style="w-sm"
      description="قم بتحديث تفاصيل المستخدم وحفظ التغييرات"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2 text-right">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@mail.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="grid gap-2 text-right">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2 text-right">
              <Label htmlFor="phoneNumber">رقم الهاتف</Label>
              <Input id="phoneNumber" type="tel" {...register("phoneNumber")} />
            </div>
          </div>

          <div className="grid gap-2 text-right">
            <Label htmlFor="role">الدور (الصلاحية)</Label>

            <SelectField
              options={roles}
              action={(value) => setValue("roleId", value)}
              value={selectedRole}
            />

            {errors.roleId && (
              <p className="text-xs text-red-500">{errors.roleId.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[120px] bg-green-600 text-white hover:bg-green-700"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ التغييرات"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
