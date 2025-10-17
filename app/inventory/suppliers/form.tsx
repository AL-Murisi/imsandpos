// ============================================
// PAYMENT EDIT FORM
// ============================================
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateSupplierPayment } from "@/app/actions/suppliers";

export function PaymentEditForm({
  payment,
  onClose,
}: {
  payment: any;
  onClose: () => void;
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      amount: Number(payment.amount),
      paymentMethod: payment.paymentMethod,
      note: payment.note || "",
      paymentDate: new Date(payment.paymentDate).toISOString().slice(0, 16),
    },
  });

  const { user } = useAuth();

  const onSubmit = async (data: any) => {
    try {
      if (!user) return;

      await updateSupplierPayment(
        payment.id,
        {
          amount: Number(data.amount),
          paymentMethod: data.paymentMethod,
          note: data.note,
          paymentDate: new Date(data.paymentDate),
        },
        user.userId,
        user.companyId,
      );

      toast.success("✅ Payment updated successfully");
      onClose();
    } catch (error) {
      toast.error("❌ Failed to update payment");
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-2">
        <Label>Amount</Label>
        <Input type="number" step="0.01" {...register("amount")} />
      </div>

      <div className="grid gap-2">
        <Label>Payment Method</Label>
        <select
          {...register("paymentMethod")}
          className="rounded-md border px-3 py-2"
        >
          <option value="cash">Cash</option>
          <option value="bank_transfer">Bank Transfer</option>
          <option value="check">Check</option>
          <option value="credit">Credit</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label>Payment Date</Label>
        <Input type="datetime-local" {...register("paymentDate")} />
      </div>

      <div className="grid gap-2">
        <Label>Note</Label>
        <textarea
          {...register("note")}
          className="rounded-md border px-3 py-2"
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Update Payment</Button>
      </div>
    </form>
  );
}
