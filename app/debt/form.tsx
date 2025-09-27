"use client"; // This component will be a Client Component

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { updateSales } from "@/app/actions/debtSells";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
      paymentAmount: 0, // Initialize with 0 or a placeholder
    },
  });

  const onSubmit = async (data: FormValues) => {
    try {
      // **IMPORTANT: Replace with actual cashier ID**

      await updateSales(debt.id, data.paymentAmount);

      // Reset the form after successful submission
      reset();

      //   }
      console.log("Payment successfully applied!");
    } catch (error) {
      console.error("Error updating debt sale:", error);
      // Display an error message to the user (e.g., using a toast notification)
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
      {/* Display relevant debt information */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold">تفاصيل الدين</h3>
        {/* <p>اسم الزبون: {debt.customer?.name}</p> */}
        <p>المبلغ الإجمالي للبيع: {debt.totalAmount} ريال</p>
        <p>المبلغ المدفوع سابقاً: {debt.amountPaid} ريال</p>
        <p>المبلغ المتبقي حالياً: {debt.amountDue} ريال</p>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="paymentAmount">مبلغ الدفع الجديد</Label>
          <Input
            id="paymentAmount"
            type="number"
            step="0.01" // Allow decimal payments
            {...register("paymentAmount", { valueAsNumber: true })}
          />
          {errors.paymentAmount && (
            <p className="text-red-500 text-xs">
              {errors.paymentAmount.message}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit">تأكيد الدفع</Button>
      </div>
    </form>
  );
}
