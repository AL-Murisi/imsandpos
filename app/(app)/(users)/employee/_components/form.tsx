"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ROLE_DEFINITIONS } from "@/lib/constants/roles";
import Dailogreuse from "@/components/common/dailogreuse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEmployee } from "@/lib/actions/employees";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateEmployeeInput, CreateEmployeeSchema } from "@/lib/zod/employee";
import { fetchRolesForSelect } from "@/lib/actions/roles";
import { SelectField } from "@/components/common/selectproduct";

type LimitInfo = {
  limit: number | null;
  used: number;
  remaining: number | null;
  atLimit: boolean;
} | null;
type Role = {
  id: string;
  name: string;
};
const roleOptions: Role[] = ROLE_DEFINITIONS.map((role) => ({
  id: role.name,
  name: role.name,
}));
export default function EmployeeForm({ userLimit }: { userLimit?: LimitInfo }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(CreateEmployeeSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      position: "cashier",
      department: "",
      salary: undefined,
      hireDate: new Date().toISOString().split("T")[0],
      password: "",
    },
  });
  const selectedRole = watch("position");

  const selectedRoleObj = roles.find((r) => r.id === selectedRole);
  if (!user?.companyId) return null;
  useEffect(() => {
    if (!open) return;
    const loadRoles = async () => {
      // const branch = await fetchbranches();
      setRoles(roleOptions);
    };
    loadRoles();
  }, [open]);
  const hasEmail = Boolean(watch("email")?.trim());
  const isUserLimitReached = userLimit?.atLimit ?? false;

  const onSubmit = async (data: CreateEmployeeInput) => {
    if (hasEmail && isUserLimitReached) {
      toast.error("تم الوصول إلى الحد الأقصى للمستخدمين في الخطة الحالية");
      return;
    }

    setIsSubmitting(true);
    const result = await createEmployee(data, user.companyId);

    if (result?.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("تمت إضافة الموظف بنجاح");
    setOpen(false);
    setIsSubmitting(false);
    reset({
      name: "",
      email: "",
      phone: "",
      position: "cashier",
      department: "",
      salary: undefined,
      hireDate: new Date().toISOString().split("T")[0],
      password: "",
    });
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إضافة موظف"
      style="sm:max-w-4xl"
      description="أدخل بيانات الموظف وسيتم إنشاء حساب مستخدم عند إدخال البريد وكلمة المرور."
      disabled={isUserLimitReached}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        {isUserLimitReached && (
          <p className="text-sm text-red-500">
            تم الوصول إلى الحد الأقصى للمستخدمين في الاشتراك.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="name">الاسم</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input id="phone" {...register("phone")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="password">كلمة مرور الحساب</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder="مطلوبة فقط إذا أدخلت البريد"
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
            {hasEmail && !watch("password") && (
              <p className="text-xs text-amber-600">
                عند إدخال البريد سيتم إنشاء مستخدم للموظف ويجب إدخال كلمة
                المرور.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="position">الوظيفة</Label>
            <SelectField
              options={roles}
              action={(value) =>
                setValue(
                  "position",
                  value as
                    | "admin"
                    | "customer"
                    | "accountant"
                    | "manager_wh"
                    | "supplier"
                    | "cashier",
                )
              }
              value={selectedRole}
            />{" "}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="department">القسم</Label>
            <Input id="department" {...register("department")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="salary">الراتب</Label>
            <Input
              id="salary"
              type="number"
              step="0.01"
              {...register("salary", {
                setValueAs: (value) =>
                  value === "" || value === undefined
                    ? undefined
                    : Number(value),
              })}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hireDate">تاريخ التوظيف</Label>
            <Input id="hireDate" type="date" {...register("hireDate")} />
            {errors.hireDate && (
              <p className="text-xs text-red-500">{errors.hireDate.message}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || isUserLimitReached}
            className="min-w-[120px] bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
