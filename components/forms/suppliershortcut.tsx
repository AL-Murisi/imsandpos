"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTransition, useState } from "react";
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

import { CreateSupplierSchema } from "@/lib/zod";
import { createSupplier } from "@/app/actions/suppliers";
import { useAuth } from "@/lib/context/AuthContext";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type FormValues = z.infer<typeof CreateSupplierSchema>;

export default function SupplierForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
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

  const { user } = useAuth();
  if (!user) return null;

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      try {
        const res = await createSupplier(data, user.companyId);

        if (res) {
          toast.success(`تم إنشاء المورد: ${data.name} بنجاح`);
          reset();
          setOpen(false);
        } else {
          toast.error(res || "حدث خطأ في إنشاء المورد");
        }
      } catch (error) {
        toast.error("حدث خطأ في إنشاء المورد");
        console.error(error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          جديد
        </Button>
      </DialogTrigger>

      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>إضافة مورد جديد</DialogTitle>
          <DialogDescription>أدخل تفاصيل المورد</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">اسم المورد</Label>
              <Input id="name" {...register("name")} disabled={isPending} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="grid gap-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                disabled={isPending}
              />
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
                type="text"
                {...register("contactPerson")}
                disabled={isPending}
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
                disabled={isPending}
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
              <Input
                id="address"
                type="text"
                {...register("address")}
                disabled={isPending}
              />
              {errors.address && (
                <p className="text-xs text-red-500">{errors.address.message}</p>
              )}
            </div>

            {/* City */}
            <div className="grid gap-2">
              <Label htmlFor="city">المدينة</Label>
              <Input
                id="city"
                type="text"
                {...register("city")}
                disabled={isPending}
              />
              {errors.city && (
                <p className="text-xs text-red-500">{errors.city.message}</p>
              )}
            </div>

            {/* State */}
            <div className="grid gap-2">
              <Label htmlFor="state">الولاية/المحافظة</Label>
              <Input
                id="state"
                type="text"
                {...register("state")}
                disabled={isPending}
              />
              {errors.state && (
                <p className="text-xs text-red-500">{errors.state.message}</p>
              )}
            </div>

            {/* Country */}
            <div className="grid gap-2">
              <Label htmlFor="country">البلد</Label>
              <Input
                id="country"
                type="text"
                {...register("country")}
                disabled={isPending}
              />
              {errors.country && (
                <p className="text-xs text-red-500">{errors.country.message}</p>
              )}
            </div>

            {/* Postal Code */}
            <div className="grid gap-2">
              <Label htmlFor="postalCode">الرمز البريدي</Label>
              <Input
                id="postalCode"
                type="text"
                {...register("postalCode")}
                disabled={isPending}
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
              <Input
                id="taxId"
                type="text"
                {...register("taxId")}
                disabled={isPending}
              />
              {errors.taxId && (
                <p className="text-xs text-red-500">{errors.taxId.message}</p>
              )}
            </div>

            {/* Payment Terms */}
            <div className="grid gap-2">
              <Label htmlFor="paymentTerms">شروط الدفع</Label>
              <Input
                id="paymentTerms"
                type="text"
                {...register("paymentTerms")}
                disabled={isPending}
              />
              {errors.paymentTerms && (
                <p className="text-xs text-red-500">
                  {errors.paymentTerms.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isPending}>
              {isPending ? "جاري الحفظ..." : "تأكيد"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
