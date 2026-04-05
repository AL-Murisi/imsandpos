"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";

import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCompany } from "@/hooks/useCompany";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";
import { createCutomer } from "@/lib/actions/customers";
import { fallbackCurrencyOptions } from "@/lib/actions/currnciesOptions";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateCustomer, CreateCustomerSchema } from "@/lib/zod";

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
      balance: 0,
      phoneNumber: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      customerType: "individual",
      taxId: "",
      preferred_currency: [],
    },
  });

  const { user } = useAuth();
  const { company } = useCompany();
  const { options } = useCurrencyOptions();
  const currencyOptions = options.length ? options : fallbackCurrencyOptions;
  const baseCurrency = company?.base_currency;

  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (baseCurrency) {
      setValue("preferred_currency", [baseCurrency]);
    }
  }, [baseCurrency, setValue]);

  if (!user?.companyId) return null;

  const customerType = [
    { id: "individual", name: "فردي" },
    { id: "business", name: "تجاري" },
  ];

  const selectedCustomerType = watch("customerType");
  const hasEmail = Boolean(watch("email")?.trim());

  const onSubmit = async (data: CreateCustomer) => {
    setIsSubmitting(true);

    const result = await createCutomer(data, user.companyId);

    if (result?.error) {
      toast.error(result.error);
      setIsSubmitting(false);
      return;
    }

    toast.success("تمت إضافة العميل بنجاح");
    setOpen(false);
    setIsSubmitting(false);
    reset({
      name: "",
      email: "",
      preferred_currency: baseCurrency ? [baseCurrency] : [],
      phoneNumber: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      customerType: "individual",
      taxId: "",
      outstandingBalance: 0,
      balance: 0,
      creditLimit: undefined,
    });
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={
        <>
          <Plus className="ml-1" />
          إضافة عميل
        </>
      }
      titel="إضافة عميل"
      style="sm:max-w-6xl"
      description="أدخل بيانات العميل أدناه."
    >
      <ScrollArea className="max-h-[85vh]" dir="rtl">
        <form onSubmit={handleSubmit(onSubmit)} dir="rtl">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="name">الاسم الكامل</Label>
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
                <Label htmlFor="phoneNumber">رقم الهاتف</Label>
                <Input id="phoneNumber" type="tel" {...register("phoneNumber")} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password">كلمة مرور الحساب</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder="مطلوبة فقط عند إنشاء حساب دخول"
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
                {hasEmail && !watch("password") && (
                  <p className="text-xs text-amber-600">
                    إذا أدخلت البريد الإلكتروني فسيتم إنشاء مستخدم للعميل ويجب إدخال كلمة المرور.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="address">العنوان</Label>
                <Input id="address" {...register("address")} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="city">المدينة</Label>
                <Input id="city" {...register("city")} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="state">المحافظة</Label>
                <Input id="state" {...register("state")} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="country">الدولة</Label>
                <Input id="country" {...register("country")} />
              </div>

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
                  value={selectedCustomerType}
                  placeholder="اختر النوع"
                />
                {errors.customerType && (
                  <p className="text-xs text-red-500">{errors.customerType.message}</p>
                )}
              </div>
            </div>

            <div className="grid gap-3">
              <Label className="text-right">العملات المسموحة</Label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                {currencyOptions.map((option) => {
                  const isSelected = watch("preferred_currency")?.includes(option.id);

                  return (
                    <div
                      key={option.id}
                      onClick={() => {
                        const currentValues = watch("preferred_currency") || [];
                        const newValues = isSelected
                          ? currentValues.filter((v: string) => v !== option.id)
                          : [...currentValues, option.id];

                        setValue("preferred_currency", newValues, {
                          shouldValidate: true,
                        });
                      }}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "bg-gray border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-sm border ${
                          isSelected ? "border-primary bg-primary" : "border-gray-300"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className="font-medium">{option.name}</span>
                    </div>
                  );
                })}
              </div>
              {errors.preferred_currency && (
                <p className="text-xs text-red-500">{errors.preferred_currency.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="creditLimit">حد الدين</Label>
                <Input id="creditLimit" {...register("creditLimit", { valueAsNumber: true })} />
                {errors.creditLimit && (
                  <p className="text-xs text-red-500">{errors.creditLimit.message}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="taxId">الرقم الضريبي</Label>
                <Input id="taxId" {...register("taxId")} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="outstandingBalance">رصيد افتتاحي للديون</Label>
                <Input
                  id="outstandingBalance"
                  {...register("outstandingBalance", { valueAsNumber: true })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="balance">رصيد افتتاحي دائن</Label>
                <Input id="balance" {...register("balance", { valueAsNumber: true })} />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px] bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </Dailogreuse>
  );
}
