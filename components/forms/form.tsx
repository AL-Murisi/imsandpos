"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CreateWarehouseSchema } from "@/lib/zod";
import { createWarehouse } from "@/app/actions/warehouse";
import { useAuth } from "@/lib/context/AuthContext";
import { Plus } from "lucide-react";
import { useState } from "react";

type FormValues = z.infer<typeof CreateWarehouseSchema>;

export default function WarehouseForm() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return;
  const warehouse = `warehouse-${Date.now().toString().slice(-2)}`;
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateWarehouseSchema),
    defaultValues: {
      name: warehouse,
      email: "",
      phoneNumber: "",
      address: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    },
  });

  // Load roles on mount
  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    await createWarehouse(data, user.companyId);
    setOpen(false);
    reset();
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          جديد
        </Button>
      </DialogTrigger>

      <DialogContent dir="rtl" className="sm:w-md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">اسم warehoue</Label>
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
                <Label htmlFor="location">الموقع</Label>
                <Input id="location" type="text" {...register("location")} />
                {errors.location && (
                  <p className="text-xs text-red-500">
                    {errors.location.message}
                  </p>
                )}
              </div>
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

              {/* Payment Terms */}
            </div>
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
        </form>{" "}
      </DialogContent>
    </Dialog>
  );
}
