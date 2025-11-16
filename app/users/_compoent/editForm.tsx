"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

import { fetchRolesForSelect } from "@/app/actions/roles";
import { UpdatwUser } from "@/app/actions/users";
import { SelectField } from "@/components/common/selectproduct";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateUserSchema, UserInput } from "@/lib/zod";
import { toast } from "sonner";
import Dailogreuse from "@/components/common/dailogreuse";
import { Plus } from "lucide-react";

type Role = {
  id: string;
  name: string;
};

export default function EditUserForm({ users }: any) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserInput>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: {
      email: users.email,
      name: users.name,
      phoneNumber: users.phoneNumber,
      password: users.password,

      roleId: users.roleId,
    },
  });
  const { user } = useAuth();
  if (!user) return;
  // Load roles on mount
  useEffect(() => {
    const loadRoles = async () => {
      const result = await fetchRolesForSelect();
      setRoles(result);
      if (result.length > 0) {
        setValue("roleId", result[0].id);

        // Default role
      }
    };
    loadRoles();
  }, [setValue]);

  const selectedRole = watch("roleId");
  const onSubmit = async (data: UserInput) => {
    setIsSubmitting(true);

    setOpen(true);
    const result = await UpdatwUser(data, users.id, user.companyId);

    if (result.error) {
      toast.error(result.error);

      setIsSubmitting(false);
      return;
    }

    toast.success("✅ تمت إضافة المستخدم بنجاح");
    setOpen(false);
    setIsSubmitting(false);
    reset();
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={"تعديل مستخدم"}
      style="w-sm"
      description="أدخل تفاصيل المنتج واحفظه"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Full Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">رقم الهاتف</Label>
              <Input id="phoneNumber" type="tel" {...register("phoneNumber")} />
            </div>

            {/* Password */}
            <div className="grid gap-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          {/* Role select */}
          <div className="grid gap-2">
            <Label htmlFor="role">الدور</Label>

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

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="min-w-[120px] bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ "}
          </Button>{" "}
        </div>
      </form>
    </Dailogreuse>
  );
}
