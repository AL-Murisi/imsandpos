"use client";
import { ReceiptLaptop } from "@/components/common/receiptforlaptop";
import { Receipt } from "@/components/common/recipt";
import SearchInput from "@/components/common/searchtest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTablePrams } from "@/hooks/useTableParams";
import { useAuth } from "@/lib/context/AuthContext";
import { selectActiveCartItems, selectCartTotals } from "@/lib/selectors";
import {
  changeSellingUnit,
  clearCart,
  removeFromCart,
  setDiscount,
} from "@/lib/slices/cartSlice";

// Detect device
const isMobile =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );

import { useAppDispatch, useAppSelector } from "@/lib/store";
import { CashierItem, CashierSchema } from "@/lib/zod/cashier";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
// import html2pdf from "html2pdf.js";

type Cashier = z.infer<typeof CashierSchema>;

export interface PaymentProps {
  users: {
    id?: string;
    name?: string;
    phoneNumber?: string | null;
    totalDebt?: number;
  } | null;
}

export default function Payment({ users }: PaymentProps) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectActiveCartItems);
  const totals = useAppSelector(selectCartTotals);
  const cartState = useAppSelector((s) => s.cart);

  const {
    register,
    watch,
    formState: { errors },
  } = useForm<Cashier>({
    resolver: zodResolver(CashierSchema),
  });

  const receivedAmount = watch("receivedAmount");
  const calculatedChange =
    receivedAmount >= totals.totalAfter
      ? receivedAmount - totals.totalAfter
      : 0;
  const paymentType = receivedAmount >= totals.totalAfter ? "نقدي" : "آجل";
  const generateSaleNumber = () => {
    return `SALE-${Date.now().toString().slice(-5)}`;
  };
  const t = useTranslations("payment");
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
  const [saleNumber] = React.useState(
    () => `SALE-${Date.now().toString().slice(-5)}`,
  );
  const {
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
    warehouseId,
    supplierId,
    categoryId,
    setParam,
  } = useTablePrams();
  const handelpayment = async () => {
    const currenrSalasNum = generateSaleNumber();
    const payment: Cashier = {
      cart: items,
      discountValue: cartState.discountValue,
      discountType: cartState.discountType,
      totalBeforeDiscount: totals.totalBefore,
      totalDiscount: totals.discount,
      totalAfterDiscount: totals.totalAfter,
      cashierId: user?.userId ?? "",
      customerId: users?.id,
      saleNumber: saleNumber,
      receivedAmount,
      change: calculatedChange,
      paidAt: new Date(),
    };
    try {
      const response = await fetch("/api/cashier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payment),
      });
      if (!response.ok) throw new Error("خطأ أثناء المعالجة");
      await response.json();

      toast("✅ تم الدفع بنجاح!");
      setParam("categoryId", "");
      dispatch(clearCart());
      dispatch(setDiscount({ type: "fixed", value: 0 }));
    } catch (err: any) {
      alert(`❌ حدث خطأ: ${err.message}`);
    }
  };

  // const handleDownloadPDF = () => {
  //   const receipt = document.getElementById("receipt-content");
  //   if (receipt) {
  //     html2pdf().from(receipt).set({
  //       margin: 0.5,
  //       filename: `receipt-${payment.saleNumber}.pdf`,
  //       html2canvas: { scale: 2 },
  //       jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
  //     }).save();
  //   }
  // };
  const isCash = receivedAmount >= totals.totalAfter;
  const isDebt = !isCash;
  const canPay =
    (isCash && receivedAmount >= totals.totalAfter) || (isDebt && users?.name);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 rounded-md border-amber-500 py-3 text-amber-600 shadow-md hover:bg-amber-50"
        >
          {t("pay_now")}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-90 overflow-hidden md:max-w-4xl lg:max-w-6xl">
        <div id="receipt-content" className="rounded-md text-amber-50">
          <div className="p-x-5 mb-4 flex w-60 flex-col justify-end sm:w-2xs md:w-sm">
            <SearchInput placeholder={t("search_customer")} paramKey="users" />
            {t("customer")}: <Badge>{users?.name ?? ""}</Badge>
          </div>
          <div className="w-80 sm:w-[480px] md:w-3xl lg:w-full">
            <ScrollArea className="h-[30vh] w-full rounded-2xl border border-amber-300 p-2">
              <Table className="w-full">
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="border-amber-300">
                    <TableHead>#</TableHead>
                    <TableHead>{t("sku")}</TableHead>
                    <TableHead>{t("product")}</TableHead>
                    <TableHead>{t("warehouse")}</TableHead>
                    <TableHead>{t("quantity")}</TableHead>
                    <TableHead>{t("type")}</TableHead>
                    <TableHead>{t("price")}</TableHead>
                    <TableHead>{t("total")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {items.length > 0 ? (
                    items.map((item, index) => {
                      const itemPrice = getItemPrice(item);
                      return (
                        <TableRow
                          key={`${item.id}-${item.sellingUnit}`}
                          className="border-amber-300"
                        >
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{item.sku}</TableCell>
                          <TableCell className="max-w-[120px] truncate">
                            {item.name}
                          </TableCell>
                          <TableCell>{item.warehousename}</TableCell>
                          <TableCell>{item.selectedQty}</TableCell>
                          <TableCell>
                            <Select
                              value={item.sellingUnit}
                              onValueChange={(value) =>
                                dispatch(
                                  changeSellingUnit({
                                    id: item.id,
                                    from: item.sellingUnit,
                                    to: value as "unit" | "packet" | "carton",
                                    product: {
                                      packetsPerCarton: item.packetsPerCarton,
                                      unitsPerPacket: item.unitsPerPacket,
                                    },
                                    qty: item.selectedQty,
                                  }),
                                )
                              }
                            >
                              <SelectTrigger className="rounded border px-2 py-1 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="carton">كرتون</SelectItem>
                                <SelectItem value="packet">حزمة</SelectItem>
                                <SelectItem value="unit">وحدة</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {itemPrice}
                          </TableCell>
                          <TableCell className="text-center whitespace-nowrap">
                            {(itemPrice * item.selectedQty).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              onClick={() => dispatch(removeFromCart(item.id))}
                              variant="ghost"
                              size="icon"
                            >
                              <Trash2Icon color="red" size={18} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-6 text-center text-gray-500"
                      >
                        {t("noProducts")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              {/* Totals */}
              <Separator className="my-2 bg-black" />
              <div
                className="flex flex-col justify-between gap-4 text-sm sm:flex-row"
                dir="rtl"
              >
                <Label>
                  {t("total_before")}: {totals.totalBefore.toFixed(2)} ﷼
                </Label>
                <Label>
                  {t("discount")}: {totals.discount.toFixed(2)} ﷼
                </Label>
                <Label>
                  {t("total_after")}: {totals.totalAfter.toFixed(2)} ﷼
                </Label>
                <Label>
                  {t("received_amount")}: {receivedAmount ?? 0} ﷼
                </Label>
                <Label>
                  {t("remaining_to_customer")}: {calculatedChange.toFixed(2)} ﷼
                </Label>

                {users?.totalDebt && users.totalDebt > 0 && (
                  <div className="mt-2">
                    <Label>
                      {t("previous_debts")}: {users.totalDebt} ﷼
                    </Label>
                  </div>
                )}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        </div>

        {/* Payment Input + Buttons */}
        <Separator className="my-2 bg-black" />
        <div
          className="flex space-y-2 sm:w-2xs md:w-sm md:justify-self-end"
          dir="rtl"
        >
          <Label htmlFor="receivedAmount">{t("received_amount")}:</Label>
          <Input
            id="receivedAmount"
            type="number"
            {...register("receivedAmount", { valueAsNumber: true })}
            className="w-60 border-2 sm:w-2xs md:w-sm"
            placeholder="أدخل المبلغ المستلم"
          />
          {errors.receivedAmount && (
            <p className="text-sm text-red-500">
              {errors.receivedAmount.message}
            </p>
          )}
        </div>

        <div className="mt-4 flex flex-row gap-3 md:justify-between">
          <Button
            onClick={handelpayment}
            disabled={!canPay}
            className={`${
              canPay
                ? "bg-green-600 hover:bg-green-700"
                : "cursor-not-allowed bg-gray-400"
            } sm:w-4xs w-40 text-white md:w-sm`}
          >
            {t("confirm_payment")}
          </Button>

          {isMobile ? (
            <Receipt
              saleNumber={saleNumber}
              items={items}
              totals={totals}
              receivedAmount={receivedAmount}
              calculatedChange={calculatedChange}
              userName={user?.name}
              customerName={users?.name}
              customerDebt={users?.totalDebt}
              isCash={receivedAmount >= totals.totalAfter}
              t={t}
            />
          ) : (
            <ReceiptLaptop
              saleNumber={saleNumber}
              items={items}
              totals={totals}
              receivedAmount={receivedAmount}
              calculatedChange={calculatedChange}
              userName={user?.name}
              customerName={users?.name}
              customerDebt={users?.totalDebt}
              isCash={receivedAmount >= totals.totalAfter}
              t={t}
            />
          )}
          {/* <Receipt
            saleNumber={saleNumber}
            items={items}
            totals={totals}
            receivedAmount={receivedAmount}
            calculatedChange={calculatedChange}
            userName={user?.name}
            customerName={users?.name}
            customerDebt={users?.totalDebt}
            isCash={receivedAmount >= totals.totalAfter}
            t={t}
          /> */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
