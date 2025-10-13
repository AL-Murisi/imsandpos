"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppDispatch, useAppSelector } from "@/lib/store";

import { Minus, Plus, Trash2Icon, User } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardFooter } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import Addtouserrecod from "../_components/Addtouserrecod";
import Reservation from "../reservation/reserveItems";

import { useAuth } from "@/lib/context/AuthContext";
import {
  selectActiveCartItems,
  selectAvailableStock,
  selectCartTotals,
} from "@/lib/selectors";
import {
  addCart,
  changeSellingUnit,
  clearAllCart,
  clearCart,
  removeCart,
  removeFromCart,
  setActiveCart,
  setDiscount,
  updateQty,
} from "@/lib/slices/cartSlice";
import { ReactNode, useEffect, useRef, useState, useTransition } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { FormatPrice } from "@/hooks/usePrice";
import { useTranslations } from "next-intl";
import { Cashier, CashierItem, type CashierSchema } from "@/lib/zod";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "@/components/common/recipt";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/common/searchtest";
import { useTablePrams } from "@/hooks/useTableParams";
import { processSale } from "@/app/actions/cashier";
export type SellingUnit = "carton" | "packet" | "unit";
export type discountType = "fixed" | "percentage";
type CartItem = CashierItem & {
  id: string;
  name: string;
  sellingUnit: SellingUnit;
  selectedQty: number;

  originalStockQuantity: number;
  unitsPerPacket: number;
  packetsPerCarton: number;
};
interface CustomDialogProps {
  users: {
    id?: string;
    name?: string;
    phoneNumber?: string | null;
    totalDebt?: number;
  } | null;
}

export default function CartDisplay({ users }: CustomDialogProps) {
  const { user, hasAnyRole, logout } = useAuth();
  const [discountType, setDiscountType] = useState<discountType>("fixed");
  const [discountValue, setDiscountsValue] = useState(10);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const totals = useAppSelector(selectCartTotals);
  const tt = useTranslations("payment");

  const hasAddedCart = useRef(false);

  useEffect(() => {
    if (hasAddedCart.current) return; // prevent double
    if (!activeCartId) {
      const newCartId = Date.now().toString();
      dispatch(
        addCart({
          id: newCartId,
          name: `Cart-${newCartId.slice(-3)}`,
        }),
      );
    }
    hasAddedCart.current = true;
  }, []);

  const [saleNumber, setSaleNumber] = useState(
    () => `SALE-${Date.now().toString().slice(-3)}`,
  );

  const getItemPrice = (item: CartItem) => {
    const prices = {
      unit: item.pricePerUnit ?? 0,
      packet: item.pricePerPacket ?? 0,
      carton: item.pricePerCarton ?? 0,
    };
    return prices[item.sellingUnit] || 0;
  };
  const calculatedChange =
    receivedAmount >= totals.totalAfter
      ? receivedAmount - totals.totalAfter
      : 0;
  const [pending, startTransition] = useTransition();
  const params = useSearchParams();
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectAvailableStock);
  const carts = useAppSelector((state) => state.cart.carts);
  const activeCartId = useAppSelector((state) => state.cart.activeCartId);
  const items = useAppSelector(selectActiveCartItems);
  const cartState = useAppSelector((s) => s.cart);
  const t = useTranslations("cashier");
  const isCash = receivedAmount >= totals.totalAfter;
  const isDebt = !isCash;
  const router = useRouter();
  const canPay =
    (isCash && receivedAmount >= totals.totalAfter) || (isDebt && users?.name);
  const handelpayment = async () => {
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
      await processSale(payment); // ✅ await server action
      toast("✅ تم الدفع بنجاح!");

      // 1️⃣ Clear current cart
      dispatch(clearCart());
      setReceivedAmount(0);
      dispatch(setDiscount({ type: "fixed", value: 0 }));

      // 2️⃣ Generate new sale number
      const newSaleNumber = `SALE-${Date.now().toString().slice(-66)}`;
      setSaleNumber(newSaleNumber);
      dispatch(removeCart(activeCartId ?? ""));

      // 3️⃣ Create new cart with the new sale number
      const newCartId = Date.now().toString();
      dispatch(
        addCart({
          id: newCartId,
          name: `Chart-${newCartId.slice(-3)}`,
        }),
      );

      dispatch(setActiveCart(newCartId)); // set the new cart as active
    } catch (err: any) {
      alert(`❌ حدث خطأ: ${err.message}`);
    }
  };

  return (
    <div className="bg-background flex h-[50hv] flex-col rounded-2xl p-2 shadow-xl/20 shadow-gray-500 lg:col-span-1">
      {/* Header */}
      <div className="flex justify-between">
        <div className="flex justify-between gap-1">
          <Button
            className="rounded-[5px] bg-green-500 px-3 py-1 text-white"
            onClick={() =>
              dispatch(
                addCart({
                  id: Date.now().toString(),
                  name: `Chart-${Date.now().toString().slice(-5)}`,
                }),
              )
            }
          >
            {t("newCart")}
          </Button>
          {carts.length > 1 && (
            <Button
              className="bg-red-500"
              onClick={() => dispatch(clearAllCart())}
            >
              {t("deleteAll")}
            </Button>
          )}
        </div>
        <div className="flex w-60 flex-row justify-end sm:w-2xs md:w-sm">
          <SearchInput placeholder={tt("search_customer")} paramKey="users" />
        </div>
      </div>

      <ScrollArea className="w-full py-2" dir="rtl">
        <div className="grid max-h-20 w-full grid-cols-2 gap-5 md:grid-cols-4">
          {carts.map((cart) => (
            <div className="flex flex-row gap-1">
              <Button
                key={cart.id}
                className={`rounded ${
                  cart.id === activeCartId
                    ? "bg-card border-primary text-foreground hover:bg-secondary rounded-md border-2 hover:scale-100"
                    : "bg-primary text-black"
                }`}
                onClick={() => dispatch(setActiveCart(cart.id))}
              >
                {cart.name}
              </Button>

              <div
                className="mt-1"
                onClick={() => dispatch(removeCart(cart.id))}
              >
                <Trash2Icon color="red" />
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      <div className="w-full">
        {/* Single ScrollArea with proper height and both scrollbars */}
        <ScrollArea className="h-[60vh] w-full rounded-2xl border border-amber-300 p-2">
          <Table className="w-full">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="border-amber-300">
                <TableHead>{t("product")}</TableHead>
                <TableHead>{t("sku")}</TableHead>
                <TableHead>{t("product")}</TableHead>
                <TableHead>{t("warehouse")}</TableHead>
                <TableHead>{t("quantity")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("price")}</TableHead>
                <TableHead>{t("total")}</TableHead>
                <TableHead>{t("actions")}</TableHead>{" "}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item, index) => {
                  const itemPrice = getItemPrice(item);

                  return (
                    <TableRow
                      key={`${item.id}-${item.sellingUnit}`}
                      className="border-amber-300 border-r-amber-300"
                    >
                      <TableCell className="border-l-red-400">
                        {index + 1}
                      </TableCell>
                      <TableCell className="border-l-red-400">
                        {item.sku}
                      </TableCell>
                      <TableCell className="border-l-red-400">
                        {item.name}
                      </TableCell>
                      <TableCell> {item.warehousename}</TableCell>
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
                            const qty = Math.max(
                              1,
                              Number(e.target.value) || 1,
                            );
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
                            (item.sellingUnit === "carton" &&
                              item.selectedQty >=
                                products[0].availableCartons) ||
                            (item.sellingUnit === "packet" &&
                              item.selectedQty >=
                                products[0].availablePackets) ||
                            (item.sellingUnit === "unit" &&
                              item.selectedQty >= products[0].availableUnits)
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
                          <SelectTrigger className="rounded border px-2 py-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="carton">كرتون</SelectItem>
                            <SelectItem value="packet">حزمة</SelectItem>
                            <SelectItem value="unit">حبة</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-16 text-center text-sm whitespace-nowrap">
                        ${itemPrice}
                      </TableCell>
                      <TableCell className="w-16 text-center text-sm whitespace-nowrap">
                        ${(itemPrice * item.selectedQty).toFixed(2)}
                      </TableCell>
                      <TableCell className="flex w-12 justify-center">
                        <Button
                          onClick={() =>
                            dispatch(
                              removeFromCart(
                                item.id,
                                // sellingUnit: item.sellingUnit,
                              ),
                            )
                          }
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
                    className="h-140 py-6 text-center text-gray-500"
                  >
                    {t("noProducts")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>
      {/* Footer with totals and actions */}
      <div
        className="border-t border-gray-200 p-4 dark:border-gray-700"
        dir="ltr"
      >
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-end justify-between">
            {/* Discount controls */}
            <div className="flex flex-col gap-1">
              {" "}
              {tt("customer")}: <Badge>{users?.name ?? ""}</Badge>
              <label
                htmlFor="discount"
                className="text-sm font-semibold text-gray-700 dark:text-gray-300"
              >
                {t("discount")}
              </label>
              <div className="flex gap-2">
                <Select
                  value={discountType}
                  onValueChange={(value: "fixed" | "percentage") => {
                    dispatch(
                      setDiscount({
                        type: value,
                        value: discountValue || 0,
                      }),
                    );
                    setDiscountType(value);
                  }}
                >
                  <SelectTrigger className="rounded border px-2 py-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">{t("fixed")}</SelectItem>
                    <SelectItem value="percentage">
                      {t("percentage")}
                    </SelectItem>
                  </SelectContent>
                </Select>

                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value));
                    dispatch(
                      setDiscount({
                        type: discountType ?? "fixed",
                        value: val,
                      }),
                    );
                    setDiscountsValue(val);
                  }}
                  min={0}
                  className="w-20 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600"
                  max={discountType === "percentage" ? 100 : totals.totalBefore}
                />
              </div>{" "}
            </div>

            {/* Totals display */}
            <div className="flex flex-col gap-1 text-right">
              <div className="flex justify-between gap-4">
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("beforeDiscount")}
                </Label>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  ${FormatPrice(totals.totalBefore)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("discountValue")}
                </Label>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  ${FormatPrice(totals.discount)}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-gray-200 pt-1 dark:border-gray-700">
                <Label className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {t("afterDiscount")}
                </Label>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  Total: ${FormatPrice(totals.totalAfter)}
                </span>
              </div>{" "}
              <Input
                value={receivedAmount === 0 ? "" : receivedAmount} // show empty instead of 0
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setReceivedAmount(isNaN(val) ? 0 : val); // store 0 if input is empty or invalid
                }}
                placeholder="المبلغ المستلم"
                className="w-40 border-2 sm:w-2xs md:w-sm"
                type="number"
              />
            </div>
          </div>

          {items.length !== 0 ? (
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
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
                t={tt}
              />
              <Button
                disabled={pending && !canPay}
                onClick={() =>
                  startTransition(async () => {
                    await handelpayment(); // ✅ call the function
                  })
                }
                className={`${
                  canPay
                    ? "bg-green-600 hover:bg-green-700"
                    : "cursor-not-allowed bg-gray-400"
                } sm:w-4xs w-40 flex-1 rounded-md border-amber-500 py-3 text-amber-100 shadow-md hover:bg-amber-50 md:w-sm`}
              >
                {tt("pay_now")}
              </Button>
              <Reservation
                cart={items}
                total={totals.totalAfter}
                discount={totals.discount}
                discountType={"fixed"}
                //   onSuccess={onPaymentSuccess}
              />
              <Button
                onClick={() => {
                  (dispatch(clearCart()),
                    setDiscountsValue(0),
                    setDiscountType("fixed"));
                  //  dispatch(removeCart(cart.id))
                }}
                className="flex-1 rounded-md bg-red-500 py-3 text-white shadow-md transition-shadow hover:bg-red-600 hover:shadow-lg"
              >
                إلغاء
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <p className="text-center">اختر المنتج</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
