"use client";

import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateCustomer, CreateCustomerSchema } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updatedCustomer } from "@/lib/actions/customers";
import { useEffect, useState } from "react";
import Dailogreuse from "@/components/common/dailogreuse";
import { Check } from "lucide-react";
import { currencyOptions } from "@/lib/actions/currnciesOptions";
import { useCompany } from "@/hooks/useCompany";

export default function CustomerEditForm({ customer }: { customer: any }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateCustomer>({
    resolver: zodResolver(CreateCustomerSchema),
  });
  useEffect(() => {
    if (!customer) return;
    reset({
      name: customer.name ?? "",
      email: customer.email ?? "",
      phoneNumber: customer.phoneNumber ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      state: customer.state ?? "",
      country: customer.country ?? "",
      postalCode: customer.postalCode ?? "",
      customerType: customer.customerType ?? "individual",
      taxId: customer.taxId ?? "",
      preferred_currency: customer.preferred_currency || "",
      creditLimit: customer.creditLimit ?? undefined,
    });
  }, [customer]);

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const { company } = useCompany();
  const basCurrncy = company?.base_currency;
  if (!user) return null;

  const customerTypes = watch("customerType");

  const onSubmit = async (data: CreateCustomer) => {
    setIsSubmitting(true);
    const result = await updatedCustomer(data, customer.id, user.companyId);
    if (result.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }
    toast.success("✅ تم تحديث العميل بنجاح");
    setOpen(false);
    setIsSubmitting(false);
  };
  useEffect(() => {
    if (basCurrncy) {
      setValue("preferred_currency", [basCurrncy]);
    }
  }, [basCurrncy, setValue]);
  const customerType = [
    { id: "individual", name: "فردي" },
    { id: "business", name: "تجاري" },
  ];

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={"تحديث"}
      style="sm:max-w-6xl"
      description="تحديث  العميل "
    >
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
          <div className="grid gap-3">
            <Label className="text-right">العملات المسموحة</Label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
              {currencyOptions.map((option) => {
                // Check if this currency is currently in the array
                const isSelected = watch("preferred_currency")?.includes(
                  option.id,
                );

                return (
                  <div
                    key={option.id}
                    onClick={() => {
                      const currentValues = watch("preferred_currency") || [];
                      const newValues = isSelected
                        ? currentValues.filter((v: string) => v !== option.id) // Remove if already there
                        : [...currentValues, option.id]; // Add if not there

                      setValue("preferred_currency", newValues, {
                        shouldValidate: true,
                      });
                    }}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "bg-gray border-gray-200 hover:border-gray-300"
                    } `}
                  >
                    {/* The "Tick" Icon */}
                    <div
                      className={`flex h-4 w-4 items-center justify-center rounded-sm border ${isSelected ? "bg-primary border-primary" : "border-gray-300"} `}
                    >
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>

                    <span className="font-medium">{option.name}</span>
                    {/* <span className="text-muted-foreground text-xs">
                        ({option.name})
                      </span> */}
                  </div>
                );
              })}
            </div>
            {errors.preferred_currency && (
              <p className="text-xs text-red-500">
                {errors.preferred_currency.message}
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="creditLimit">حد دين</Label>
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
          </div>
          <div className="flex justify-end">
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "جاري الحفظ..." : "حفظ "}
            </Button>
          </div>
        </div>
      </form>
    </Dailogreuse>
  );
}
