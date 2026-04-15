"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { SelectField } from "@/components/common/selectproduct";
import Dailogreuse from "@/components/common/dailogreuse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchbranches } from "@/lib/actions/pos";
import { createUser } from "@/lib/actions/users";
import { ROLE_DEFINITIONS } from "@/lib/constants/roles";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateUserSchema, UserInput } from "@/lib/zod";
import { toast } from "sonner";

type SelectOption = {
  id: string;
  name: string;
};

type LimitInfo = {
  limit: number | null;
  used: number;
  remaining: number | null;
  atLimit: boolean;
} | null;

const roleOptions: SelectOption[] = ROLE_DEFINITIONS.map((role) => ({
  id: role.name,
  name: role.name,
}));

export default function UserForm({
  userLimit,
  cashierLimit,
}: {
  userLimit?: LimitInfo;
  cashierLimit?: LimitInfo;
}) {
  const [branch, setBranch] = useState<SelectOption[]>([]);
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
      email: "",
      name: "",
      phoneNumber: "",
      password: "",
      role: "",
      branchId: undefined,
    },
  });

  const { user } = useAuth();
  const selectedRole = watch("role");
  const selectedRoleObj = useMemo(
    () => ROLE_DEFINITIONS.find((role) => role.name === selectedRole),
    [selectedRole],
  );

  if (!user) return;
  const isUserLimitReached = userLimit?.atLimit ?? false;

  useEffect(() => {
    if (!open) return;
    const loadFormData = async () => {
      const branches = await fetchbranches();
      setBranch(branches ?? []);
      if (roleOptions.length > 0) {
        setValue("role", roleOptions[0].id);
      }
    };
    void loadFormData();
  }, [open, setValue]);

  const isCashier = selectedRoleObj?.name === "cashier";
  const createsLinkedProfile =
    selectedRoleObj?.name === "customer" ||
    selectedRoleObj?.name === "supplier";
  const isCashierLimitReached = isCashier && (cashierLimit?.atLimit ?? false);

  const onSubmit = async (data: UserInput) => {
    if (isUserLimitReached) {
      toast.error("تم الوصول إلى الحد الأقصى للمستخدمين في الخطة الحالية");
      return;
    }

    if (isCashierLimitReached) {
      toast.error("تم الوصول إلى الحد الأقصى للكاشير في الخطة الحالية");
      return;
    }

    setIsSubmitting(true);

    setOpen(true);
    const result = await createUser(data, user.companyId);

    if (result.error) {
      toast.error(result.error);

      setIsSubmitting(false);
      return;
    }

    if (result.warning) {
      toast.warning(result.warning);
    } else {
      toast.success("User created successfully");
    }
    setOpen(false);
    setIsSubmitting(false);
    reset();
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={"إضافة مستخدم"}
      style="w-sm"
      description="أدخل تفاصيل المنتج واحفظه"
      disabled={isUserLimitReached}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        <div className="grid gap-4">
          {isUserLimitReached && (
            <p className="text-sm text-red-500">
              تم الوصول إلى الحد الأقصى للمستخدمين في الاشتراك.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input id="name" {...register("name")} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phoneNumber">رقم الهاتف</Label>
              <Input id="phoneNumber" type="tel" {...register("phoneNumber")} />
            </div>

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

          <div className="grid gap-2">
            <Label htmlFor="role">الدور</Label>
            <SelectField
              options={roleOptions}
              action={(value) => setValue("role", value)}
              value={selectedRole}
            />
            {errors.role && (
              <p className="text-xs text-red-500">{errors.role.message}</p>
            )}
            {createsLinkedProfile ? (
              <p className="text-xs text-blue-600">
                سيتم إنشاء سجل مرتبط تلقائيا في{" "}
                {selectedRoleObj?.name === "customer" ? "العملاء" : "الموردين"}.
              </p>
            ) : null}
            {isCashierLimitReached && (
              <p className="text-xs text-red-500">
                تم الوصول إلى الحد الأقصى للكاشير في الاشتراك.
              </p>
            )}
            {isCashier && (
              <div className="grid gap-2">
                <Label>الفرع</Label>
                <SelectField
                  options={branch}
                  action={(value) => setValue("branchId", value)}
                  value={watch("branchId")}
                />
                {errors.branchId && (
                  <p className="text-xs text-red-500">
                    {errors.branchId.message}
                  </p>
                )}
              </div>
            )}{" "}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={
              isSubmitting || isUserLimitReached || isCashierLimitReached
            }
            className="min-w-[120px] bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ "}
          </Button>{" "}
        </div>
      </form>
    </Dailogreuse>
  );
}
