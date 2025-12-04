"use client";

import { createCutomer } from "@/lib/actions/customers";
import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateCustomerSchema } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useState } from "react";
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
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const customerTypes = watch("customerType");
  const onSubmit = async (data: CreateCustomer) => {
    setIsSubmitting(true);

    const result = await createCutomer(data, user.companyId);

    if (result?.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("✅ تمت إضافة  بنجاح");
    setOpen(false);
    setIsSubmitting(false);
    reset();
  };
  const customerType = [
    { id: "individual", name: "فردي" },
    { id: "business", name: "تجاري" },
  ];

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={
        <>
          <Plus className="ml-1" />{" "}
          {/* Change mr-1 to ml-1 for RTL icon placement */}
          إضافة عميل
        </>
      }
      titel="إضافة مستخدم"
      style="sm:max-w-6xl"
      description="أدخل تفاصيل المستخدم أدناه."
    >
      <ScrollArea className="max-h-[85vh]" dir="rtl">
        <form onSubmit={handleSubmit(onSubmit)} className="" dir="rtl">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              <div className="grid gap-2">
                <Label htmlFor="phoneNumber">رقم الهاتف</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  {...register("phoneNumber")}
                />
              </div>
            </div>

            {/* Phone & Address */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="address">العنوان</Label>
                <Input id="address" {...register("address")} />
                {errors.address && (
                  <p className="text-xs text-red-500">
                    {errors.address.message}
                  </p>
                )}
              </div>

              {/* City / State / Country */}

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
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="country">الدولة</Label>
                <Input id="country" {...register("country")} />
                {errors.country && (
                  <p className="text-xs text-red-500">
                    {errors.country.message}
                  </p>
                )}
              </div>

              {/* Postal Code and Customer Type */}
              <div className="grid gap-2">
                <Label htmlFor="postalCode">الرمز البريدي</Label>
                <Input
                  id="postalCode"
                  type="number"
                  {...register("postalCode")}
                />
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="creditLimit"> حد الديون</Label>
                <Input
                  id=" creditLimit"
                  {...register("creditLimit", { valueAsNumber: true })}
                />
                {errors.creditLimit && (
                  <p className="text-xs text-red-500">
                    {errors.creditLimit.message}
                  </p>
                )}
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
                <Label htmlFor="outstandingBalance">
                  رصيد افتتاحي (الديون)
                </Label>
                <Input
                  id="outstandingBalance"
                  {...register("outstandingBalance", { valueAsNumber: true })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="balance">رصيد افتتاحي (الرصيد)</Label>
                <Input
                  id="balance"
                  {...register("balance", { valueAsNumber: true })}
                />
              </div>
            </div>
            {/* Tax ID */}
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
      </ScrollArea>
    </Dailogreuse>
  );
}
