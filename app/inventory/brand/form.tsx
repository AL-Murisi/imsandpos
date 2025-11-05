"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";

import { CreateBrandSchema } from "@/lib/zod";
import { createBrand } from "@/app/actions/roles";
import { useAuth } from "@/lib/context/AuthContext";

type FormValues = z.infer<typeof CreateBrandSchema>;

export default function UserForm() {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateBrandSchema),
    defaultValues: {
      name: "",
      description: "",
      website: "",
      contactInfo: "",
    },
  });
  const { user } = useAuth();
  if (!user) return;
  // Load roles on mount
  const onSubmit = async (data: FormValues) => {
    console.log("Submitted:", data);

    await createBrand(data, user.companyId);
    // await createUser(data)
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Email */}

          {/* Full Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">الاسم </Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Phone */}
          <div className="grid gap-2">
            <Label htmlFor="description">description </Label>
            <Input id="description" type="tel" {...register("description")} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="website">website </Label>
            <Input id="website" type="tel" {...register("website")} />
          </div>
          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="contactInfo">كلمة contactInfo</Label>
            <Input
              id="contactInfo"
              type="contactInfo"
              {...register("contactInfo")}
            />
            {errors.contactInfo && (
              <p className="text-xs text-red-500">
                {errors.contactInfo.message}
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
