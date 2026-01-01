"use client";

import { createSupplierPaymentFromPurchases } from "@/lib/actions/suppliers";
import Dailogreuse from "@/components/common/dailogreuse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/context/AuthContext";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { SelectField } from "@/components/common/selectproduct";
import { fetchPayments } from "@/lib/actions/banks";

interface bankcash {
  id: string;
  name: string;
  currency: string | null;
}

export function PaymentCreateForm({
  supplier,
  supplier_name,
  purchaseId,
}: {
  supplier: any;
  purchaseId: string;
  supplier_name: string;
}) {
  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: {
      amount: "",
      paymentMethod: "cash",
      note: "",
      currency_code: "YER",
      accountId: "",
      supplier_name: supplier.supplier?.name ?? "",
      paymentDate: new Date().toISOString().slice(0, 16),
    },
  });

  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [banks, setBanks] = useState<bankcash[]>([]);
  const [cash, setCash] = useState<bankcash[]>([]);

  const paymentMethod = watch("paymentMethod");
  const selectedAccountId = watch("accountId");

  // Load bank/cash accounts
  useEffect(() => {
    if (!isOpen) return;

    const loadAccounts = async () => {
      try {
        const { banks, cashAccounts } = await fetchPayments();
        setBanks(banks);
        setCash(cashAccounts);
      } catch (err) {
        console.error(err);
        toast.error("فشل في جلب الحسابات");
      }
    };

    loadAccounts();
  }, [isOpen]);
  // Automatically set currency_code from selected account

  // Automatically set currency code when account changes
  useEffect(() => {
    const allAccounts = [...banks, ...cash];
    const selected = allAccounts.find((acc) => acc.id === selectedAccountId);
    if (selected && selected.currency) {
      setValue("currency_code", selected.currency);
    }
  }, [selectedAccountId, banks, cash, setValue]);

  const paymentMethods = [
    { id: "cash", name: "نقداً" },
    { id: "bank", name: "تحويل بنكي" },
    { id: "debt", name: "دين" },
  ];

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
          currency_code: data.currency_code,
          bankId: data.accountId,
          paymentDate: new Date(data.paymentDate),
        },
      );

      if (res.success) {
        toast.success(`✅ Payment created for ${supplier_name}`);
        reset();
        setIsOpen(false);
      } else {
        toast.error(`❌ ${res.error || "Failed to create payment"}`);
      }

      setIsSubmitting(false);
    } catch (error) {
      console.error(error);
      toast.error("❌ Failed to create payment");
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={isOpen}
      setOpen={setIsOpen}
      style="sm"
      btnLabl="دفع"
      titel="تعديل"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label>المورد</Label>
          <Input
            value={watch("supplier_name")}
            disabled
            className="font-semibold"
          />
        </div>
        <div className="grid gap-2">
          <Label>المبلغ المتبقي:</Label>
          {supplier.amountDue}
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
          <SelectField
            options={paymentMethods}
            value={paymentMethod}
            action={(val) => setValue("paymentMethod", val)}
            placeholder="اختر طريقة الدفع"
          />
        </div>

        {/* Bank accounts */}
        {paymentMethod === "bank" && (
          <div className="grid gap-2">
            <Label>البنك</Label>
            <SelectField
              options={banks}
              value={selectedAccountId}
              action={(val) => setValue("accountId", val)}
              placeholder="اختر البنك"
            />
            <Label>رقم المرجع</Label>
            <Input
              type="text"
              {...register("note")}
              placeholder="رقم الحوالة / المرجع"
            />
          </div>
        )}

        {/* Cash accounts */}
        {paymentMethod === "cash" && (
          <div className="grid gap-2">
            <Label>الصندوق النقدي</Label>
            <SelectField
              options={cash}
              value={selectedAccountId}
              action={(val) => setValue("accountId", val)}
              placeholder="اختر الصندوق"
            />
          </div>
        )}

        <div className="grid gap-2">
          <Label>تاريخ الدفع</Label>
          <Input type="datetime-local" {...register("paymentDate")} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "جاري الحفظ..." : "تأكيد الدفع"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
