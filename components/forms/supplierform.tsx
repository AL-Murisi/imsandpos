"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { CreateSupplierSchema } from "@/lib/zod";
import { createSupplier } from "@/app/actions/roles";

type FormValues = z.infer<typeof CreateSupplierSchema>;

export default function SupplierForm() {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateSupplierSchema),
    defaultValues: {
      name: "",
      contactPerson: "",
      email: "",
      phoneNumber: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
      taxId: "",
      paymentTerms: "",
    },
  });

  // Load roles on mount
  const onSubmit = async (data: FormValues) => {
    console.log("Submitted:", data);

    await createSupplier(data);
    // await createUser(data)
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">اسم المورد</Label>
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

        <div className="grid grid-cols-2 gap-4">
          {/* Contact Person */}
          <div className="grid gap-2">
            <Label htmlFor="contactPerson">شخص الاتصال</Label>
            <Input
              id="contactPerson"
              type="text" // Changed type from tel to text as it's a name
              {...register("contactPerson")}
            />
            {errors.contactPerson && (
              <p className="text-xs text-red-500">
                {errors.contactPerson.message}
              </p>
            )}
          </div>
          {/* Phone Number */}
          <div className="grid gap-2">
            <Label htmlFor="phoneNumber">رقم الهاتف</Label>
            <Input id="phoneNumber" type="tel" {...register("phoneNumber")} />
            {errors.phoneNumber && (
              <p className="text-xs text-red-500">
                {errors.phoneNumber.message}
              </p>
            )}
          </div>
          {/* Address */}
          <div className="grid gap-2">
            <Label htmlFor="address">العنوان</Label>
            <Input id="address" type="text" {...register("address")} />
            {errors.address && (
              <p className="text-xs text-red-500">{errors.address.message}</p>
            )}
          </div>
          {/* City */}
          {/* NOTE: Original code had htmlFor="city" but register("phoneNumber") for this input.
                     Corrected to htmlFor="city" and register("city").
                     If it was intended for phoneNumber, please adjust accordingly. */}
          <div className="grid gap-2">
            <Label htmlFor="city">المدينة</Label>
            <Input id="city" type="text" {...register("city")} />
            {errors.city && (
              <p className="text-xs text-red-500">{errors.city.message}</p>
            )}
          </div>
          {/* State */}
          <div className="grid gap-2">
            <Label htmlFor="state">الولاية/المحافظة</Label>
            <Input id="state" type="text" {...register("state")} />
            {errors.state && (
              <p className="text-xs text-red-500">{errors.state.message}</p>
            )}
          </div>
          {/* Country */}
          <div className="grid gap-2">
            <Label htmlFor="country">البلد</Label>
            <Input id="country" type="text" {...register("country")} />
            {errors.country && (
              <p className="text-xs text-red-500">{errors.country.message}</p>
            )}
          </div>
          {/* Postal Code */}
          <div className="grid gap-2">
            <Label htmlFor="postalCode">الرمز البريدي</Label>
            <Input
              id="postalCode"
              type="text" // Changed type from postalCode to text
              {...register("postalCode")}
            />
            {errors.postalCode && (
              <p className="text-xs text-red-500">
                {errors.postalCode.message}
              </p>
            )}
          </div>
          {/* Tax ID */}
          <div className="grid gap-2">
            <Label htmlFor="taxId">الرقم الضريبي</Label>
            <Input id="taxId" type="text" {...register("taxId")} />
            {errors.taxId && (
              <p className="text-xs text-red-500">{errors.taxId.message}</p>
            )}
          </div>
          {/* Payment Terms */}
          <div className="grid gap-2">
            <Label htmlFor="paymentTerms">شروط الدفع</Label>
            <Input
              id="paymentTerms"
              type="text" // Changed type from paymentTerms to text
              {...register("paymentTerms")}
            />
            {errors.paymentTerms && (
              <p className="text-xs text-red-500">
                {errors.paymentTerms.message}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit">تأكيد</Button>
      </div>
    </form>
  );
}
