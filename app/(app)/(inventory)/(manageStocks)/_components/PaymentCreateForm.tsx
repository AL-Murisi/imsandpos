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

import {
  ReusablePayment,
  PaymentState,
} from "@/components/common/ReusablePayment";
import { useCompany } from "@/hooks/useCompany";

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
  // const [banks, setBanks] = useState<bankcash[]>([]);
  // const [cash, setCash] = useState<bankcash[]>([]);
  const { company } = useCompany();

  const [payment, setPayment] = useState<PaymentState>({
    paymentMethod: "cash",
    accountId: "",
    financialAccountId: "",
    selectedCurrency: company?.base_currency || "YER",
    amountBase: 0,
    amountFC: 0,
    exchangeRate: 1,
    transferNumber: "",
  });
  const [accounts, setAccounts] = useState<bankcash[]>([]);

  const paymentMethod = watch("paymentMethod");
  const selectedAccountId = watch("accountId");

  useEffect(() => {
    const allAccounts = [...accounts];
    const selected = allAccounts.find((acc) => acc.id === selectedAccountId);
    if (selected && selected.currency) {
      setValue("currency_code", selected.currency);
    }
  }, [selectedAccountId, accounts, setValue]);

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

          paymentMethod: payment.paymentMethod,
          bankId: payment.accountId,
          branchId: company?.branches[0].id ?? "",
          amount: payment.amountBase, // دائماً بالعملة الأساسية
          exchangeRate: payment.exchangeRate ?? 0,
          referenceNumber: payment.transferNumber ?? "",
          currency_code: payment.selectedCurrency || "",
          note: payment.transferNumber,
          amountFC: payment.amountFC ?? 0, // إن وُجد
          baseCurrency: company?.base_currency ?? "",
          financialAccountId: payment.financialAccountId,
          accountId: payment.accountId,
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
        <ReusablePayment value={payment} action={setPayment} />

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
