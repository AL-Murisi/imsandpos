import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import CustomDialog from "@/components/common/Dailog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useForm, SubmitHandler } from "react-hook-form"; // Import SubmitHandler
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CashierItem, CashierSchema } from "@/lib/zod";
import { reserveStock } from "@/app/actions/warehouse";
import { toast } from "sonner";
import { useAuth } from "@/lib/context/AuthContext";

type CashierFormValues = z.infer<typeof CashierSchema>;

export default function Reservation({
  cart,
  total,
  discount,
  discountType,
  onSuccess, // ✅ callback
}: {
  cart: CashierItem[];
  total: number;
  discount: number;
  discountType: "fixed" | "percentage";
  onSuccess?: () => void; // ✅ declare prop
}) {
  // Define the default values that match CashierFormValues directly.
  // Ensure 'paidAt' is initialized as a Date object.
  const initialDefaultValues: CashierFormValues = useMemo(() => {
    return {
      cart: cart,

      discountValue: discount,
      discountType: discountType,
      totalBeforeDiscount: total + discount,
      totalDiscount: discount,
      totalAfterDiscount: total,
      paymentMethod: "cash", // Default to cash
      receivedAmount: 0, // Default to total for cash payment
      change: 0,
      cashierId: "",
      customerId: undefined,
      customerName: undefined,
      paidAt: new Date(),
    };
  }, [cart, discount, total]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
    setValue,
  } = useForm<CashierFormValues>({
    resolver: zodResolver(CashierSchema),
    defaultValues: initialDefaultValues, // Use the pre-initialized default values
  });

  const receivedAmount = watch("receivedAmount");
  const totalAfterDiscount = watch("totalAfterDiscount");

  const calculatedChange =
    receivedAmount >= totalAfterDiscount
      ? receivedAmount - totalAfterDiscount
      : 0;

  // Use useEffect to update form values when props change, especially when dialog opens
  const { user } = useAuth();
  if (!user) return;
  // Ensure the onSubmit function matches SubmitHandler<CashierFormValues>
  const onSubmit: SubmitHandler<CashierFormValues> = async (data) => {
    if (data.receivedAmount === 0) {
      await reserveStock(data, user.companyId);

      toast("✅تم الحجز بنجاح");
      onSuccess?.();
      return;
    }

    // Handle full or partial payment with customerId if needed
    const response = await fetch("/api/cashier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
      }),
    });
  };
  const getItemPrice = (item: CashierItem) => {
    switch (item.sellingUnit) {
      case "unit":
        return item.pricePerUnit ?? 0;
      case "packet":
        return item.pricePerPacket ?? 0;
      case "carton":
        return item.pricePerCarton ?? 0;
      default:
        return 0;
    }
  };

  return (
    <>
      <CustomDialog
        trigger={
          <Button
            variant="outline"
            className="flex-1 rounded-md border-amber-500 py-3 text-amber-600 shadow-md transition-shadow hover:bg-amber-50 hover:shadow-lg dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900"
          >
            حجز
          </Button>
        }
        title="نظام إدارة المخزون"
        description="إيصال بيع"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="text-mdfont-mono w-full rounded-md p-4 text-right"
        >
          <div className="text-md mx-auto w-full rounded-md border border-gray-300 bg-white p-4 text-right font-mono dark:border-gray-700 dark:bg-gray-900">
            <div className="mb-1 flex justify-end text-lg font-semibold">
              اسم المتجر
            </div>

            <div className="mb-2 text-center text-base font-bold">
              <Label>
                الكاشير: <Badge>محمد</Badge>
              </Label>
            </div>

            <Separator className="my-2" />

            <div className="mb-1 flex justify-between">
              <Label>التاريخ:</Label>
              <Label>{new Date().toLocaleDateString("ar-EG")}</Label>
            </div>

            <div className="mb-2 flex justify-between">
              <Label>الوقت:</Label>
              <Label>
                {new Date().toLocaleTimeString("ar-EG", { hour12: false })}
              </Label>
            </div>

            <Separator className="my-2" />

            {/* Header row for product list */}
            <div className="grid grid-cols-5 rounded-t-md border-b bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 dark:bg-gray-800 dark:text-gray-200">
              <div className="text-right">اسم المنتج</div>
              <div className="text-right">الكمية</div>
              <div className="text-right"> النوع</div>{" "}
              <div className="text-right">السعر </div>
              <div className="text-right"> الإجمالي</div>
            </div>

            {/* Products list */}
            {cart.map((item) => {
              const itemPrice = getItemPrice(item);
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-5 border-b px-3 py-2 text-xs last:border-none"
                >
                  <div className="text-right">{item.name}</div>
                  <div className="text-right">{item.selectedQty} </div>
                  <div className="text-right">
                    {item.sellingUnit === "carton"
                      ? "كرتون"
                      : item.sellingUnit === "packet"
                        ? "حزمة"
                        : "وحدة"}
                  </div>
                  <div className="text-right">{itemPrice.toFixed(2)}</div>{" "}
                  <div className="text-right">
                    {(itemPrice * item.selectedQty).toFixed(2)} ﷼
                  </div>
                </div>
              );
            })}

            <Separator className="my-2" />

            {/* Totals */}
            <div className="my-1 flex justify-between text-sm">
              <Label>الإجمالي:</Label>
              <Label>{total.toFixed(2)} ﷼</Label>
            </div>
            <div className="my-1 flex justify-between text-sm">
              <Label>الخصم:</Label>
              <Label>{discount.toFixed(2)} ﷼</Label>
            </div>
            <div className="my-1 flex justify-between text-sm font-semibold">
              <Label>المبلغ المستحق:</Label>
              <Label>{total.toFixed(2)} ﷼</Label>
            </div>
            <div className="my-1 flex justify-between text-sm">
              <Label>المبلغ المدفوع:</Label>
              <Label>
                {receivedAmount !== undefined && !isNaN(receivedAmount)
                  ? receivedAmount.toFixed(2)
                  : "—"}{" "}
                ﷼
              </Label>
            </div>
            <div className="my-1 flex justify-between text-sm font-bold text-green-700">
              {receivedAmount >= totalAfterDiscount && (
                <div className="my-1 flex justify-between text-sm font-bold text-green-700">
                  <Label>المتبقي للعميل:</Label>
                  <Label>{calculatedChange.toFixed(2)} ﷼</Label>
                </div>
              )}
            </div>

            <Separator className="my-2" />

            <div className="mt-4 text-center text-xs">
              <p>شكرًا لتسوقك معنا!</p>
            </div>
          </div>
          <Separator className="my-2" />
          <Input
            className="max-w-md"
            {...register("receivedAmount", { valueAsNumber: true })}
            placeholder="المبلغ المستلم"
          />

          {errors.receivedAmount && (
            <p className="text-red-500">{errors.receivedAmount.message}</p>
          )}
          <Separator className="my-2" />
          <div className="grid grid-cols-2 justify-between">
            <Button
              className="bg-popover-foreground text-background"
              type="submit"
            >
              تأكيد Reservation
            </Button>
          </div>
        </form>
      </CustomDialog>
    </>
  );
}
