"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";

import { CreateCustomerSchema, CreateUserSchema } from "@/lib/zodType";
import { createUser, fetchRolesForSelect } from "@/app/actions/roles";
import { createCutomer } from "@/app/actions/customers";
import { SelectField } from "@/components/common/selection";

type Role = {
  id: string;
  name: string;
};

type createCusomer = z.infer<typeof CreateCustomerSchema>;

export default function CustomerForm() {
  const [roles, setRoles] = useState<Role[]>([]);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<createCusomer>({
    resolver: zodResolver(CreateCustomerSchema),
  });
  const customertype = watch("customerType");
  //   // Load roles on mount
  //   useEffect(() => {
  //     const loadRoles = async () => {
  //       const result = await fetchRolesForSelect();
  //       setRoles(result);
  //       if (result.length > 0) {
  //         setValue("roleId", result[0].id);

  //         // Default role
  //       }
  //     };
  //     loadRoles();
  //   }, [setValue]);

  //   const selectedRole = watch("roleId");

  const onSubmit = async (data: createCusomer) => {
    console.log("Submitted:", data);

    await createCutomer(data);
    // await createUser(data)
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Email */}
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

          {/* Full Name */}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Phone */}
          <div className="grid gap-2">
            <Label htmlFor="phoneNumber">رقم الهاتف</Label>
            <Input id="phoneNumber" type="tel" {...register("phoneNumber")} />
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="address">كلمة address</Label>
            <Input id="address" type="address" {...register("address")} />
            {errors.address && (
              <p className="text-xs text-red-500">{errors.address.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="city">city المرور</Label>
            <Input id="city" type="address" {...register("city")} />
            {errors.city && (
              <p className="text-xs text-red-500">{errors.city.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="state">كلمة state</Label>
            <Input id="state" type="address" {...register("state")} />
            {errors.state && (
              <p className="text-xs text-red-500">{errors.state.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="country">country المرور</Label>
            <Input id="country" type="address" {...register("country")} />
            {errors.country && (
              <p className="text-xs text-red-500">{errors.country.message}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Phone */}
          <div className="grid gap-2">
            <Label htmlFor="postalCode">رقم postalCode</Label>
            <Input id="postalCode" type="number" {...register("postalCode")} />
          </div>

          {/* Password */}
          <div className="grid gap-2">
            <Label htmlFor="customerType">كلمة المرور</Label>
            <SelectField
              options={[
                { id: "individual", name: " فردي" },
                { id: "business", name: "business" },
              ]}
              paramKey="customerType"
              placeholder="اختر النوع"
            />
            {errors.customerType && (
              <p className="text-right text-xs text-red-500">
                {errors.customerType.message}
              </p>
            )}
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="taxId">taxId </Label>
          <Input id="taxId" {...register("taxId")} />
          {errors.taxId && (
            <p className="text-xs text-red-500">{errors.taxId.message}</p>
          )}
        </div>
        {/* <div className="grid gap-2">
          <Label htmlFor="creditLimit"> creditLimit</Label>
          <Input id="creditLimit" type="number" {...register("creditLimit")} />
          {errors.creditLimit && (
            <p className="text-red-500 text-xs">{errors.creditLimit.message}</p>
          )}
        </div> */}
        {/* 
        Role select
        <div className="grid gap-2">
          <Label htmlFor="role">الدور</Label>
          <Select
            value={customerType}
            onValueChange={(value) => setValue("roleId", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر الدور" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          {errors.roleId && (
            <p className="text-red-500 text-xs">{errors.roleId.message}</p>
          )} 
        </div>*/}

        <div className="flex justify-end">
          <Button type="submit">تأكيد</Button>
        </div>
      </div>
    </form>
  );
}
