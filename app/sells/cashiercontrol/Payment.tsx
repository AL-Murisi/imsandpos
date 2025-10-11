"use client";
import CustomDialog from "@/components/common/Dailog";
import { Receipt } from "@/components/common/recipt";
import SearchInput from "@/components/common/searchtest";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  updateQty,
} from "@/lib/slices/cartSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { CashierItem, CashierSchema } from "@/lib/zod/cashier";
import { zodResolver } from "@hookform/resolvers/zod";
import { Minus, Package2Icon, Plus, Printer, Trash2Icon } from "lucide-react";
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
    <CustomDialog
      trigger={
        <Button
          variant="outline"
          className="flex-1 rounded-md border-amber-500 py-3 text-amber-600 shadow-md hover:bg-amber-50"
        >
          {t("pay_now")}
        </Button>
      }
      title={t("receipt_title")}
      description={t("receipt_desc")}
    >
      <ScrollArea>
        <div className="mb-4">
          <SearchInput placeholder={t("search_customer")} paramKey="users" />
        </div>
        <div
          id="receipt-content"
          className="rounded-md bg-white p-4 text-black"
        >
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package2Icon />
              <span className="text-lg font-bold">{t("company_name")}</span>
            </div>
            <Label>{t("store_name")}</Label>
          </div>

          <Separator className="my-2 bg-black" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <Label>
              📅 {t("date")}: {new Date().toLocaleDateString("ar-EG")}
            </Label>
            <Label>
              ⏰ {t("time")}:{" "}
              {new Date().toLocaleTimeString("ar-EG", { hour12: false })}
            </Label>
            <Label>
              👨‍💼 {t("cashier")}: {user?.name ?? t("")}
            </Label>
            <Label>
              🧾 {t("invoice_number")}: {saleNumber}
            </Label>
            <Label>
              💳 {t("payment_type")}: {paymentType}
            </Label>
            <div>
              <Label>
                {t("customer")}: <Badge>{users?.name ?? ""}</Badge>
              </Label>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>م</TableHead>
                <TableHead>{t("product")}</TableHead>
                <TableHead>{t("warehouse")}</TableHead>
                <TableHead>{t("quantity")}</TableHead>{" "}
                <TableHead>{t("price")}</TableHead>
                <TableHead>{t("unit_type")}</TableHead>
                <TableHead>{t("total")}</TableHead>
                <TableHead>{t("total")}</TableHead>
                <TableHead>{t("action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, index) => {
                const itemPrice = getItemPrice(item);
                return (
                  <TableRow key={`${item.id}-${item.sellingUnit}`}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.warehousename}</TableCell>
                    <TableCell>
                      <button
                        disabled={item.selectedQty <= 1}
                        onClick={() => {
                          dispatch(
                            updateQty({
                              id: item.id,
                              sellingUnit: item.sellingUnit,
                              quantity: 1,
                              action: "mins",
                            }),
                          );
                        }}
                        className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
                      >
                        <Minus size={16} />
                      </button>
                      <input
                        type="number"
                        value={item.selectedQty}
                        onChange={(e) => {
                          const qty = Math.max(1, Number(e.target.value) || 1);
                          dispatch(
                            updateQty({
                              id: item.id,
                              sellingUnit: item.sellingUnit,
                              quantity: 1,
                              action: "",
                            }),
                          );
                        }}
                        className="w-16 rounded border bg-white px-2 py-1 text-center text-black dark:bg-gray-800 dark:text-white"
                        min={1}
                        // max={maxQty}
                      />
                      <button
                        disabled={
                          item.selectedQty >= item.originalStockQuantity
                        }
                        onClick={() => {
                          dispatch(
                            updateQty({
                              id: item.id,
                              sellingUnit: item.sellingUnit,
                              quantity: 1,
                              action: "plus",
                            }),
                          );
                        }}
                        className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
                      >
                        <Plus size={16} />
                      </button>
                    </TableCell>
                    <TableCell>{item.selectedQty}</TableCell>
                    <TableCell>{item.sellingUnit}</TableCell>
                    <TableCell>{itemPrice}</TableCell>
                    <TableCell>
                      {(itemPrice * item.selectedQty).toFixed(2)}
                    </TableCell>
                    <TableCell>
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
              })}
            </TableBody>
          </Table>

          <Separator className="my-2 bg-black" />
          <div className="flex flex-row justify-between">
            <div className="flex flex-col justify-end px-3">
              <div className="my-1 flex gap-4 text-sm">
                <Label>
                  {t("total_before")}: {totals.totalBefore.toFixed(2)} ﷼
                </Label>
              </div>
              <div className="my-1 flex gap-4 text-sm">
                <Label>
                  {t("discount")}: {totals.discount.toFixed(2)} ﷼
                </Label>
              </div>
              <div className="my-1 flex gap-4 text-sm">
                <Label>
                  {t("total_after")}: {totals.totalAfter.toFixed(2)} ﷼
                </Label>
              </div>
              <div className="my-1 flex gap-4 text-sm">
                <Label>
                  {t("received_amount")}: {receivedAmount ?? 0} ﷼
                </Label>
              </div>
              <div className="my-1 flex gap-4 text-sm">
                <Label>
                  {t("remaining_to_customer")}: {calculatedChange.toFixed(2)} ﷼
                </Label>
              </div>
            </div>
            <div className="flex flex-col justify-start">
              {users?.totalDebt && users.totalDebt > 0 && (
                <div className="mt-2">
                  <Label>
                    {t("previous_debts")}: {users.totalDebt} ﷼
                  </Label>
                </div>
              )}
            </div>
          </div>
          <Separator className="my-2 bg-black" />
          <div className="mt-4 text-center text-xs">
            <p>{t("thanks")}</p>
          </div>
        </div>

        <Separator className="my-2 bg-black" />
        <div className="max-w-md space-y-2">
          <Label htmlFor="receivedAmount">{t("received_amount")}:</Label>
          <Input
            id="receivedAmount"
            type="number"
            step="0.01"
            {...register("receivedAmount", { valueAsNumber: true })}
            className="border-2"
            placeholder={"أدخل المبلغ المستلم"}
          />
          {errors.receivedAmount && (
            <p className="text-sm text-red-500">
              {errors.receivedAmount.message}
            </p>
          )}
        </div>

        <div className="mt-4 flex justify-between gap-3">
          <Button
            onClick={handelpayment}
            disabled={!canPay}
            className={`${
              canPay
                ? "bg-green-600 hover:bg-green-700"
                : "cursor-not-allowed bg-gray-400"
            } text-white`}
          >
            {t("confirm_payment")}
          </Button>
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
        </div>
      </ScrollArea>
    </CustomDialog>
  );
}
