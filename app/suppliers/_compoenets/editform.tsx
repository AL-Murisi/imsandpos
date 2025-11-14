"use client";
import { z } from "zod";

// 🧾 Create Supplier Schema
const CreateSupplierSchema = z.object({
  name: z.string().min(1, "اسم المورد مطلوب"),
  contactPerson: z.string().optional(),
  email: z
    .string()
    .trim()
    .email("البريد الإلكتروني غير صالح")
    .optional()
    .or(z.literal("")),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
});

type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

// 🛠 Update Supplier Schema (allows same fields, plus optional isActive)

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { toast } from "sonner";
import { updateSupplier } from "@/app/actions/suppliers";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Dailogreuse from "@/components/common/dailogreuse";

interface EditSupplierFormProps {
  supplier: {
    id: string;
    companyId: string;
  } & Partial<CreateSupplierInput>;
  onSuccess?: () => void;
}

export function EditSupplierForm({
  supplier,
  onSuccess,
}: EditSupplierFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateSupplierInput>({
    resolver: zodResolver(CreateSupplierSchema),
    defaultValues: {
      name: supplier.name || "",
      contactPerson: supplier.contactPerson || "",
      email: supplier.email || "",
      phoneNumber: supplier.phoneNumber || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      country: supplier.country || "",
      postalCode: supplier.postalCode || "",
      taxId: supplier.taxId || "",
      paymentTerms: supplier.paymentTerms || "",
    },
  });
  const [open, setOpen] = useState(false);
  const onSubmit = async (data: CreateSupplierInput) => {
    setLoading(true);
    try {
      const res = await updateSupplier(supplier.id, data);
      if (res.success) {
        toast.success("تم تحديث المورد بنجاح");
        onSuccess?.();
      } else {
        toast.error(res.error || "فشل تحديث المورد");
      }
      setOpen(false);
    } catch (err) {
      setOpen(false);

      toast.error("حدث خطأ أثناء تحديث المورد");
    } finally {
      setLoading(false);
    }
  };

  const { register, handleSubmit } = form;

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={supplier ? "تعديل المورد" : "إضافة مورد جديد"}
      style="sm:max-w-6xl"
      titel={supplier ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
      description="أدخل تفاصيل المورد واحفظها"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="">
        <div className="grid gap-3">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>اسم المورد</Label>
              <Input {...register("name")} placeholder="اسم المورد" />
            </div>

            <div className="grid gap-2">
              <Label>الشخص المسؤول</Label>
              <Input {...register("contactPerson")} />
            </div>

            <div className="grid gap-2">
              <Label>البريد الإلكتروني</Label>
              <Input {...register("email")} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>رقم الهاتف</Label>
              <Input {...register("phoneNumber")} />
            </div>

            <div className="grid gap-2">
              <Label>العنوان</Label>
              <Input {...register("address")} />
            </div>

            <div className="grid gap-2">
              {" "}
              <Label>المدينة</Label>
              <Input {...register("city")} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>الدولة</Label>
              <Input {...register("country")} />
            </div>

            <div className="grid gap-2">
              <Label>الرقم الضريبي</Label>
              <Input {...register("taxId")} />
            </div>

            <div className="col-span-2 mt-4 flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "جارٍ التحديث..." : "تحديث"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </Dailogreuse>
  );
}
