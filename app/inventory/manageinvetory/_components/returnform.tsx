"use client";

import { fetchAllFormData } from "@/app/actions/roles";
import { processPurchaseReturn } from "@/app/actions/warehouse";
import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/context/AuthContext";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const PurchaseReturnSchema = z.object({
  supplierId: z.string().min(1, "المورد مطلوب"),
  warehouseId: z.string().min(1, "المستودع مطلوب"),
  returnQuantity: z.number().positive("أدخل كمية صحيحة"),
  returnUnit: z.enum(["unit", "packet", "carton"]),
  unitCost: z.number().positive("أدخل سعر الوحدة"),
  paymentMethod: z.string().optional(),
  refundAmount: z.number().optional(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof PurchaseReturnSchema>;

interface Supplier {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
}

export default function PurchaseReturnForm({ inventory }: { inventory: any }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  if (!user) return null;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(PurchaseReturnSchema),
    defaultValues: {
      returnUnit: "unit",
      supplierId: inventory.product?.supplier?.id || "",
      warehouseId: inventory.warehouseId || "",
      unitCost:
        inventory.product?.costPrice && inventory.product.costPrice !== 0
          ? Number(inventory.product.costPrice)
          : undefined,
    },
  });

  const supplierId = watch("supplierId");
  const warehouseId = watch("warehouseId");
  const quantity = watch("returnQuantity");
  const unitCost = watch("unitCost");
  const refundAmount = watch("refundAmount");
  const paymentMethod = watch("paymentMethod");
  const returnUnit = watch("returnUnit");

  const totalCost = (quantity || 0) * (unitCost || 0);

  const paymentMethods = [
    { id: "cash", name: "نقداً" },
    { id: "bank", name: "تحويل بنكي" },
    { id: "check", name: "شيك" },
    { id: "credit", name: "ائتمان" },
  ];

  useEffect(() => {
    if (!open) {
      reset();
      setShowPayment(false);
      return;
    }

    const loadData = async () => {
      const data = await fetchAllFormData(user.companyId);
      setSuppliers(data.suppliers || []);
      setWarehouses(data.warehouses || []);
    };

    loadData();
  }, [open, user.companyId, reset]);

  const onSubmit = async (data: FormValues) => {
    if (!inventory.product?.id) {
      return toast.error("المنتج غير موجود");
    }

    if (!warehouseId) return toast.error("الرجاء اختيار المستودع");
    if (!supplierId) return toast.error("الرجاء اختيار المورد");

    if ((refundAmount ?? 0) > totalCost)
      return toast.error("مبلغ الاسترجاع أكبر من القيمة الإجمالية");

    setIsSubmitting(true);

    try {
      const payload = {
        productId: inventory.product.id,
        warehouseId,
        supplierId,
        returnQuantity: data.returnQuantity,
        returnUnit,
        unitCost,
        paymentMethod: showPayment ? paymentMethod : undefined,
        refundAmount: showPayment ? refundAmount : 0,
        reason: data.reason,
      };

      const result = await processPurchaseReturn(
        payload,
        user.userId,
        user.companyId,
      );

      if (result.success) {
        toast.success(result.message || "تم إرجاع المشتريات بنجاح");
        setOpen(false);
        reset();
      } else {
        toast.error(result.message || "فشل في عملية الإرجاع");
      }
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء الإرجاع");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إرجاع للمورد"
      titel="إرجاع مشتريات للمورد"
      description="أدخل تفاصيل عملية الإرجاع واحفظها"
      style="sm:max-w-5xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        {/* المورد والمستودع */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>اختر المورد</Label>
            <SelectField
              options={suppliers}
              value={supplierId || ""}
              placeholder="اختر المورد"
              action={(val) => setValue("supplierId", val)}
            />
            {errors.supplierId && (
              <p className="text-xs text-red-500">
                {errors.supplierId.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>اختر المستودع</Label>
            <SelectField
              options={warehouses}
              value={warehouseId || ""}
              placeholder="اختر المستودع"
              action={(val) => setValue("warehouseId", val)}
            />
            {errors.warehouseId && (
              <p className="text-xs text-red-500">
                {errors.warehouseId.message}
              </p>
            )}
          </div>
        </div>

        {/* الكمية والوحدة */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>كمية الإرجاع</Label>
            <Input {...register("returnQuantity", { valueAsNumber: true })} />
            {errors.returnQuantity && (
              <p className="text-xs text-red-500">
                {errors.returnQuantity.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>الوحدة</Label>
            <select
              {...register("returnUnit")}
              className="rounded-md border border-gray-300 px-2 py-2"
            >
              <option value="unit">وحدة</option>
              <option value="packet">علبة</option>
              <option value="carton">كرتون</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label>سعر الوحدة</Label>
            <Input {...register("unitCost", { valueAsNumber: true })} />
            {errors.unitCost && (
              <p className="text-xs text-red-500">{errors.unitCost.message}</p>
            )}
          </div>
        </div>

        {/* الإجمالي */}
        {quantity && unitCost ? (
          <div className="rounded-md bg-gray-50 p-3 text-sm font-medium">
            الإجمالي: <span className="font-bold">{totalCost}</span>
          </div>
        ) : null}

        {/* الدفع */}
        <div className="rounded-lg border border-gray-200 p-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showPayment}
              onChange={(e) => setShowPayment(e.target.checked)}
            />
            <span className="text-sm font-medium">تسجيل استرجاع مالي</span>
          </label>

          {showPayment && (
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>طريقة الدفع</Label>
                <SelectField
                  options={paymentMethods}
                  value={paymentMethod || ""}
                  placeholder="اختر الطريقة"
                  action={(val) => setValue("paymentMethod", val)}
                />
              </div>

              <div className="grid gap-2">
                <Label>مبلغ الاسترجاع</Label>
                <Input {...register("refundAmount", { valueAsNumber: true })} />
              </div>
            </div>
          )}
        </div>

        {/* السبب */}
        <div className="grid gap-3">
          <Label>سبب الإرجاع</Label>
          <Textarea placeholder="أدخل سبب الإرجاع" {...register("reason")} />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => reset()}
            disabled={isSubmitting}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? "جاري المعالجة..." : "تأكيد الإرجاع"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
