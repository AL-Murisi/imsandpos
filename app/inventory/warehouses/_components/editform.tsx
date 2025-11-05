"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CreateWarehouseSchema, WarehouseInput } from "@/lib/zod/warehouse";
import { updateWarehouse, deleteWarehouse } from "@/lib/actions/warehouse";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Dailogreuse from "@/components/common/dailogreuse";

interface WarehouseUpdateDialogProps {
  warehouse?: {
    id: string;
  } & Partial<{
    name: string | null;
    location: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    postalCode: string | null;
    phoneNumber: string | null;
    email: string | null;
  }>;
}

export function WarehouseUpdateDialog({
  warehouse,
}: WarehouseUpdateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const form = useForm<WarehouseInput>({
    resolver: zodResolver(CreateWarehouseSchema),
    defaultValues: {
      name: warehouse?.name || "",
      location: warehouse?.location || "",
      address: warehouse?.address || "",
      city: warehouse?.city || "",
      state: warehouse?.state || "",
      country: warehouse?.country || "",
      postalCode: warehouse?.postalCode || "",
      phoneNumber: warehouse?.phoneNumber || "",
      email: warehouse?.email || "",
    },
  });

  const { register, handleSubmit, reset } = form;

  const onSubmit = async (data: WarehouseInput) => {
    if (!warehouse?.id) return toast.error("معرف المستودع مفقود");

    setLoading(true);
    try {
      const res = await updateWarehouse(warehouse.id, data);

      if (res.success) {
        toast.success("تم تحديث المستودع بنجاح");
        reset();
        setOpen(false);
      } else {
        toast.error(res.error || "حدث خطأ أثناء التحديث");
      }
    } catch (error) {
      toast.error("حدث خطأ أثناء تحديث المستودع");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!warehouse?.id) return;
    if (!confirm("هل أنت متأكد من حذف هذا المستودع؟")) return;

    setLoading(true);
    try {
      const res = await deleteWarehouse(warehouse.id);
      if (res.success) {
        toast.success("تم حذف المستودع بنجاح");
        setOpen(false);
      } else {
        toast.error(res.error || "فشل حذف المستودع");
      }
    } catch {
      toast.error("حدث خطأ أثناء الحذف");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="تعديل المستودع"
      style="sm:max-w-6xl"
      titel="تعديل بيانات المستودع"
      description="قم بتحديث تفاصيل المستودع واحفظ التغييرات"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-2 gap-4 p-4"
      >
        <div className="col-span-2">
          <Label>اسم المستودع</Label>
          <Input {...register("name")} placeholder="اسم المستودع" />
        </div>

        <div>
          <Label>الموقع</Label>
          <Input {...register("location")} placeholder="الموقع" />
        </div>

        <div>
          <Label>العنوان</Label>
          <Input {...register("address")} placeholder="العنوان" />
        </div>

        <div>
          <Label>المدينة</Label>
          <Input {...register("city")} placeholder="المدينة" />
        </div>

        <div>
          <Label>المنطقة / الولاية</Label>
          <Input {...register("state")} placeholder="المنطقة / الولاية" />
        </div>

        <div>
          <Label>الدولة</Label>
          <Input {...register("country")} placeholder="الدولة" />
        </div>

        <div>
          <Label>الرمز البريدي</Label>
          <Input {...register("postalCode")} placeholder="الرمز البريدي" />
        </div>

        <div>
          <Label>رقم الهاتف</Label>
          <Input {...register("phoneNumber")} placeholder="رقم الهاتف" />
        </div>

        <div>
          <Label>البريد الإلكتروني</Label>
          <Input {...register("email")} placeholder="البريد الإلكتروني" />
        </div>

        <div className="col-span-2 mt-4 flex justify-between">
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
          >
            حذف
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "جارٍ التحديث..." : "تحديث"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
