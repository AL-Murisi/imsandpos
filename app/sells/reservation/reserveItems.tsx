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
import { CashierItem, CashierSchema } from "@/lib/zodType";
import { reserveStock } from "@/app/actions/warehouse";

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

  // Ensure the onSubmit function matches SubmitHandler<CashierFormValues>
  const onSubmit: SubmitHandler<CashierFormValues> = async (data) => {
    if (data.receivedAmount === 0) {
      await reserveStock(data);

      alert("تم الحجز بنجاح");
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
            className="flex-1 py-3 rounded-md shadow-md hover:shadow-lg transition-shadow border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-900"
          >
            حجز
          </Button>
        }
        title="نظام إدارة المخزون"
        description="إيصال بيع"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="text-mdfont-mono text-right w-full p-4 rounded-md"
        >
          <div className="text-md font-mono text-right w-full  mx-auto p-4 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700">
            <div className="flex justify-end font-semibold text-lg mb-1">
              اسم المتجر
            </div>

            <div className="text-center text-base font-bold mb-2">
              <Label>
                الكاشير: <Badge>محمد</Badge>
              </Label>
            </div>

            <Separator className="my-2" />

            <div className="flex justify-between mb-1">
              <Label>التاريخ:</Label>
              <Label>{new Date().toLocaleDateString("ar-EG")}</Label>
            </div>

            <div className="flex justify-between mb-2">
              <Label>الوقت:</Label>
              <Label>
                {new Date().toLocaleTimeString("ar-EG", { hour12: false })}
              </Label>
            </div>

            <Separator className="my-2" />

            {/* Header row for product list */}
            <div className="text-xs font-bold bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-t-md grid grid-cols-5 text-gray-700 dark:text-gray-200 border-b">
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
                  className="grid grid-cols-5 text-xs px-3 py-2 border-b last:border-none"
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
            <div className="flex justify-between text-sm my-1">
              <Label>الإجمالي:</Label>
              <Label>{total.toFixed(2)} ﷼</Label>
            </div>
            <div className="flex justify-between text-sm my-1">
              <Label>الخصم:</Label>
              <Label>{discount.toFixed(2)} ﷼</Label>
            </div>
            <div className="flex justify-between text-sm font-semibold my-1">
              <Label>المبلغ المستحق:</Label>
              <Label>{total.toFixed(2)} ﷼</Label>
            </div>
            <div className="flex justify-between text-sm my-1">
              <Label>المبلغ المدفوع:</Label>
              <Label>
                {receivedAmount !== undefined && !isNaN(receivedAmount)
                  ? receivedAmount.toFixed(2)
                  : "—"}{" "}
                ﷼
              </Label>
            </div>
            <div className="flex justify-between text-sm font-bold text-green-700 my-1">
              {receivedAmount >= totalAfterDiscount && (
                <div className="flex justify-between text-sm font-bold text-green-700 my-1">
                  <Label>المتبقي للعميل:</Label>
                  <Label>{calculatedChange.toFixed(2)} ﷼</Label>
                </div>
              )}
            </div>

            <Separator className="my-2" />

            <div className="text-center text-xs mt-4">
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
