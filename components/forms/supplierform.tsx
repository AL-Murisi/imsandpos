"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { CreateSupplierSchema, CreateSupplierInput } from "@/lib/zod";
import { createSupplier } from "@/app/actions/suppliers";
import { useAuth } from "@/lib/context/AuthContext";
import { useState } from "react";
import { Plus } from "lucide-react";
import Dailogreuse from "../common/dailogreuse";
import { ScrollArea } from "../ui/scroll-area";

export default function SupplierForm() {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateSupplierInput>({
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
      totalPaid: 0,
      totalPurchased: 0,
      outstandingBalance: 0,
    },
  });
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useAuth();
  if (!user) return;
  // Load roles on mount
  const onSubmit = async (data: CreateSupplierInput) => {
    setIsSubmitting(true);

    await createSupplier(data, user.companyId);
    setOpen(false);
    setIsSubmitting(false);
    reset();
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={
        <>
          <Plus className="ml-1" />{" "}
          {/* Change mr-1 to ml-1 for RTL icon placement */}
          جديد
        </>
      }
      titel="إضافة المورد"
      style="sm:max-w-6xl"
      description="أدخل تفاصيل المورد أدناه."
    >
      <ScrollArea className="max-h-[85vh]" dir="rtl">
        <form onSubmit={handleSubmit(onSubmit)} className="" dir="rtl">
          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                <Input
                  id="phoneNumber"
                  type="tel"
                  {...register("phoneNumber")}
                />
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
                  <p className="text-xs text-red-500">
                    {errors.address.message}
                  </p>
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
                  <p className="text-xs text-red-500">
                    {errors.country.message}
                  </p>
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
              <div className="grid gap-2">
                <Label htmlFor="totalPurchased">
                  إجمالي المشتريات الافتتاحي
                </Label>
                <Input
                  dir="rtl"
                  id="totalPurchased"
                  {...register("totalPurchased", { valueAsNumber: true })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="totalPaid">إجمالي المدفوع الافتتاحي</Label>
                <Input
                  id="totalPaid"
                  {...register("totalPaid", { valueAsNumber: true })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="outstandingBalance">
                  الرصيد الافتتاحي (الديون)
                </Label>
                <Input
                  id="outstandingBalance"
                  {...register("outstandingBalance", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px] bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ المنتج"}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </Dailogreuse>
  );
}
