"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { updateSales } from "@/app/actions/debtSells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
import { useFormatter } from "@/hooks/usePrice";

import { useState } from "react";
import Dailogreuse from "@/components/common/dailogreuse";

// This schema needs to be defined for the payment input
// Example: Create a new schema like PaymentAmountSchema
const PaymentAmountSchema = z.object({
  paymentAmount: z.number().nonnegative("المبلغ المستلم مطلوب"),
});
type FormValues = z.infer<typeof PaymentAmountSchema>;

// Assuming the `debt` object passed to this component will have the necessary sale details
interface DebtSaleProps {
  debt: {
    id: string; // The sale ID
    totalAmount: string; // From FetchDebtSales, these are strings
    amountPaid: string;
    amountDue: string;

    // Add other relevant properties you want to display
  };
  //   onPaymentSuccess?: () => void; // Optional callback to re-fetch data or close dialog
}
export default function Debtupdate({ debt }: DebtSaleProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(PaymentAmountSchema),
    defaultValues: {
      paymentAmount: undefined, // Initialize with 0 or a placeholder
    },
  });
  const { user, hasAnyRole, logout } = useAuth();
  if (!user) return;
  const { formatCurrency, formatPriceK, formatQty } = useFormatter();
  const [open, setOpen] = useState(false);

  const onSubmit = async (data: FormValues) => {
    try {
      // **IMPORTANT: Replace with actual cashier ID**

      await updateSales(
        user.companyId,
        debt.id,
        data.paymentAmount,
        user.userId,
      );
      setOpen(false);
      // Reset the form after successful submission
      reset();

      //   }
      toast("Payment successfully applied!");
    } catch (error) {
      console.error("Error updating debt sale:", error);
      // Display an error message to the user (e.g., using a toast notification)
    }
  };
  //  قم بإدخال المبلغ الجديد لتسديد جزء أو كل الدين.
  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="تسديد الدين"
      style="sm:max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ✅ تفاصيل الدين */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold">تفاصيل الدين</h3>
          <p>
            المبلغ الإجمالي للبيع: {formatCurrency(Number(debt.totalAmount))}
          </p>
          <p>
            المبلغ المدفوع سابقاً: {formatCurrency(Number(debt.amountPaid))}
          </p>
          <p>المبلغ المتبقي حالياً: {formatCurrency(Number(debt.amountDue))}</p>
        </div>

        {/* ✅ حقل المبلغ */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="paymentAmount">مبلغ الدفع الجديد</Label>
            <Input
              id="paymentAmount"
              type="number"
              {...register("paymentAmount", { valueAsNumber: true })}
            />
            {errors.paymentAmount && (
              <p className="text-xs text-red-500">
                {errors.paymentAmount.message}
              </p>
            )}
          </div>
        </div>

        {/* ✅ زر التأكيد */}
        <div className="flex justify-end">
          <Button type="submit">تأكيد الدفع</Button>
        </div>
      </form>
    </Dailogreuse>
  );
  {
    /* <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"/Button>
      </DialogTrigger>
      <DialogContent className= dir="rtl">
        <DialogHeader>
          <DialogTitle>تأكيد الدفع</DialogTitle>
          <DialogDescription>
          
          </DialogDescription>
        </DialogHeader>

        
      </DialogContent>
    </Dialog></> */
  }
}
