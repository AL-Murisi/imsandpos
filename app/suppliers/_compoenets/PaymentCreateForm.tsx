// ============================================
// PAYMENT CREATE FORM
// ============================================
"use client";

import { createSupplierPaymentFromPurchases } from "@/app/actions/suppliers"; // 👈 your new function
import Dailogreuse from "@/components/common/dailogreuse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/AuthContext";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
export function PaymentCreateForm({
  supplier,
  supplier_name,
  purchaseId,
}: {
  supplier: any;
  purchaseId: string;
  supplier_name: string;
}) {
  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      amount: "",
      paymentMethod: "cash",
      note: "",
      supplier_name: supplier.supplier?.name ?? "",
      paymentDate: new Date().toISOString().slice(0, 16),
    },
  });
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const suppliername = watch("supplier_name");
  const onSubmit = async (data: any) => {
    try {
      if (!user) return;
      setIsSubmitting(true);
      const res = await createSupplierPaymentFromPurchases(
        user.userId,
        user.companyId,
        {
          status: supplier.status,
          purchaseId,
          createdBy: user.userId,
          supplierId: supplier.supplier.id,
          amount: Number(data.amount),
          paymentMethod: data.paymentMethod,
          note: data.note,
          paymentDate: new Date(data.paymentDate),
        },
      );

      if (res.success) {
        toast.success(`✅ Payment created for ${supplier}`);
        reset();
        setIsOpen(false);
        setIsSubmitting(false);
      } else {
        toast.error(`❌ ${res.error || "Failed to create payment"}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
      toast.error("❌ Failed to create payment");
    }
  };

  return (
    <Dailogreuse
      open={isOpen}
      setOpen={setIsOpen}
      style="sm"
      btnLabl="دفع"
      titel=" تعديل"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>المورد</Label>
          <Input value={suppliername} disabled className="font-semibold" />
        </div>

        <div className="grid gap-2">
          <Label>المبلغ</Label>
          <Input
            type="number"
            step="0.01"
            required
            {...register("amount")}
            placeholder="أدخل مبلغ الدفع"
          />
        </div>

        <div className="grid gap-2">
          <Label>طريقة الدفع</Label>
          <select
            {...register("paymentMethod")}
            className="rounded-md border px-3 py-2"
          >
            <option value="cash">نقداً</option>
            <option value="bank_transfer">تحويل بنكي</option>
            <option value="check">شيك</option>
            <option value="credit">ائتمان</option>
          </select>
        </div>

        <div className="grid gap-2">
          <Label>تاريخ الدفع</Label>
          <Input type="datetime-local" {...register("paymentDate")} />
        </div>

        <div className="grid gap-2">
          <Label>ملاحظة</Label>
          <textarea
            {...register("note")}
            className="rounded-md border px-3 py-2"
            rows={3}
            placeholder="ملاحظة اختيارية"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "جاري الحفظ..." : "تأكيد الدفع "}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
