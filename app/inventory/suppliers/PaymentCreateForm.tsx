// ============================================
// PAYMENT CREATE FORM
// ============================================
"use client";

import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";
import { Button } from "@/components/ui/button";
import { createSupplierPaymentFromPurchases } from "@/app/actions/suppliers"; // 👈 your new function
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Edit } from "lucide-react";
export function PaymentCreateForm({
  supplier,
  supplier_name,
}: {
  supplier: string;
  supplier_name: string;
}) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      amount: "",
      paymentMethod: "cash",
      note: "",
      paymentDate: new Date().toISOString().slice(0, 16),
    },
  });
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  const onSubmit = async (data: any) => {
    try {
      if (!user) return;

      const res = await createSupplierPaymentFromPurchases(
        user.userId,
        user.companyId,
        {
          supplierId: supplier,
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
      } else {
        toast.error(`❌ ${res.error || "Failed to create payment"}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("❌ Failed to create payment");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Edit className="h-4 w-4" />
          Payment
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader>
          <DialogTitle>Edit Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Supplier</Label>
            <Input value={supplier_name} disabled className="font-semibold" />
          </div>

          <div className="grid gap-2">
            <Label>Amount</Label>
            <Input
              type="number"
              step="0.01"
              required
              {...register("amount")}
              placeholder="Enter payment amount"
            />
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
              placeholder="Optional note"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit">Create Payment</Button>
          </div>
        </form>{" "}
      </DialogContent>
    </Dialog>
  );
}
