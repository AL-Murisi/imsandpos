"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import Dailogreuse from "@/components/common/dailogreuse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEmployee } from "@/lib/actions/employees";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateEmployeeInput, CreateEmployeeSchema } from "@/lib/zod/employee";

export default function EditEmployeeForm({ employee }: { employee: any }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(CreateEmployeeSchema),
  });

  useEffect(() => {
    if (!employee) return;

    reset({
      name: employee.name ?? "",
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      position: employee.position ?? "",
      department: employee.department ?? "",
      salary: employee.salary ?? undefined,
      hireDate: employee.hireDate
        ? new Date(employee.hireDate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
      password: "",
    });
  }, [employee, reset]);

  if (!user?.companyId) return null;

  const hasEmail = Boolean(watch("email")?.trim());

  const onSubmit = async (data: CreateEmployeeInput) => {
    setIsSubmitting(true);
    const result = await updateEmployee(employee.id, user.companyId, data);

    if (result?.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("تم تحديث الموظف بنجاح");
    setOpen(false);
    setIsSubmitting(false);
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="تعديل"
      style="sm:max-w-4xl"
      description="حدّث بيانات الموظف من هنا."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
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
            <Label htmlFor="password">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              {...register("password")}
              placeholder="اتركها فارغة إذا لا تريد تغييرها"
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
            {hasEmail && !employee?.userId && !watch("password") && (
              <p className="text-xs text-amber-600">
                هذا الموظف لا يملك حسابا حتى الآن. أدخل كلمة المرور لإنشاء
                الحساب.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="position">الوظيفة</Label>
            <Input id="position" {...register("position")} />
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
            disabled={isSubmitting}
            className="min-w-[120px] bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
