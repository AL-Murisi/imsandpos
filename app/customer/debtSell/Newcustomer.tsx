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

type CreateCustomer = z.infer<typeof CreateCustomerSchema>;

export default function CustomerForm() {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateCustomer>({
    resolver: zodResolver(CreateCustomerSchema),
    defaultValues: {
      outstandingBalance: 0,

      phoneNumber: "",
      address: "",

      city: "",
      state: "",
      country: "",
      postalCode: "",
      customerType: "individual",
      taxId: "",
    },
  });
  const { user } = useAuth();
  if (!user?.companyId) return;
  const customerTypes = watch("customerType");
  const onSubmit = async (data: CreateCustomer) => {
    const result = await createCutomer(data, user.companyId);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("✅ تمت إضافة  بنجاح");
    reset();
  };
  const customerType = [
    { id: "individual ", name: "فردي" },
    { id: "business ", name: "تجاري" },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">الاسم الكامل</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="grid gap-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Phone & Address */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="phoneNumber">رقم الهاتف</Label>
            <Input id="phoneNumber" type="tel" {...register("phoneNumber")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">العنوان</Label>
            <Input id="address" {...register("address")} />
            {errors.address && (
              <p className="text-xs text-red-500">{errors.address.message}</p>
            )}
          </div>
        </div>

        {/* City / State / Country */}
        <div className="grid grid-cols-3 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="city">المدينة</Label>
            <Input id="city" {...register("city")} />
            {errors.city && (
              <p className="text-xs text-red-500">{errors.city.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="state">المحافظة</Label>
            <Input id="state" {...register("state")} />
            {errors.state && (
              <p className="text-xs text-red-500">{errors.state.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="country">الدولة</Label>
            <Input id="country" {...register("country")} />
            {errors.country && (
              <p className="text-xs text-red-500">{errors.country.message}</p>
            )}
          </div>
        </div>

        {/* Postal Code and Customer Type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="postalCode">الرمز البريدي</Label>
            <Input id="postalCode" type="number" {...register("postalCode")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="customerType">نوع العميل</Label>
            <SelectField
              options={customerType}
              action={(value) =>
                setValue("customerType", value as "individual" | "business")
              }
              value={customerTypes}
              placeholder="اختر النوع"
            />

            {errors.customerType && (
              <p className="text-xs text-red-500">
                {errors.customerType.message}
              </p>
            )}
          </div>
        </div>

        {/* Tax ID */}
        <div className="grid gap-2">
          <Label htmlFor="taxId">الرقم الضريبي</Label>
          <Input id="taxId" {...register("taxId")} />
          {errors.taxId && (
            <p className="text-xs text-red-500">{errors.taxId.message}</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="outstandingBalance">إجمالي الديون </Label>
          <Input
            type="number"
            id="outstandingBalance"
            {...register("outstandingBalance")}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit">تأكيد</Button>
        </div>
      </div>
    </form>
  );
}
