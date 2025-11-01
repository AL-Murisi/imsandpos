"use client";

import { processSale } from "@/app/actions/cashier";
import SearchInput from "@/components/common/searchlist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FormatPrice } from "@/hooks/usePrice";
import { useAuth } from "@/lib/context/AuthContext";
import { selectActiveCartItems, selectCartTotals } from "@/lib/selectors";
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
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { cn } from "@/lib/utils";
import { ProductForSale } from "@/lib/zod";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import dynamic from "next/dynamic";

const PrintButton = dynamic(
  () => import("./test").then((mod) => mod.PrintButton),
  { ssr: false },
);
const CartItemRow = dynamic(
  () => import("../_components/CartClient").then((mod) => mod.CartItemRow),
  { ssr: false },
);
const CartTab = dynamic(
  () => import("../_components/CartClient").then((mod) => mod.CartTab),
  { ssr: false },
);
const Receipt = dynamic(
  () => import("@/components/common/receipt").then((mod) => mod.Receipt),
  { ssr: false },
);
export type SellingUnit = "carton" | "packet" | "unit";
export type discountType = "fixed" | "percentage";
type forsale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
};
interface UserOption {
  id?: string;
  name?: string;
  phoneNumber?: string | null;
  outstandingBalance?: number;
}

interface CustomDialogProps {
  users: UserOption[] | null;
  product: forsale[];
}

export default function CartDisplay({ users, product }: CustomDialogProps) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const t = useTranslations("cashier");
  const tt = useTranslations("payment");

  // Selectors with memoization
  const items = useAppSelector(selectActiveCartItems);
  const totals = useAppSelector(selectCartTotals);
  const carts = useAppSelector((state) => state.cart.carts);
  const activeCartId = useAppSelector((state) => state.cart.activeCartId);
  // const products = useAppSelector(selectAvailableStock);
  const userAgent =
    typeof window !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  const isMobileUA =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent,
    );
  // Local state
  const [discountType, setDiscountType] = useState<discountType>("fixed");
  const [discountValue, setDiscountsValue] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);

  const [saleNumber, setSaleNumber] = useState(
    `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  );

  const hasAddedCart = useRef(false);

  useEffect(() => {
    if (hasAddedCart.current || !user) return;
    if (!activeCartId) {
      const newCartId = Date.now().toString();
      dispatch(addCart({ id: newCartId, name: `Cart-${newCartId.slice(-3)}` }));
    }
    hasAddedCart.current = true;
  }, [activeCartId, dispatch, user]);

  // 🚀 Memoized callbacks
  const handleUpdateQty = useCallback(
    (
      id: string,
      sellingUnit: SellingUnit,
      quantity: number,
      action: string,
    ) => {
      dispatch(updateQty({ id, sellingUnit, quantity, action }));
    },
    [dispatch],
  );

  const handleChangeUnit = useCallback(
    (id: string, from: SellingUnit, to: SellingUnit, item: any) => {
      dispatch(
        changeSellingUnit({
          id,
          from,
          to,
          product: {
            packetsPerCarton: item.packetsPerCarton,
            unitsPerPacket: item.unitsPerPacket,
          },
          qty: item.selectedQty,
        }),
      );
    },
    [dispatch],
  );

  const handleRemoveItem = useCallback(
    (id: string) => {
      dispatch(removeFromCart(id));
    },
    [dispatch],
  );

  const handlePayment = useCallback(async () => {
    if (!user) return;

    const calculatedChange =
      receivedAmount >= totals.totalAfter
        ? receivedAmount - totals.totalAfter
        : 0;

    const payment = {
      cart: items,
      discountValue,
      discountType,
      totalBeforeDiscount: totals.totalBefore,
      totalDiscount: totals.discount,
      totalAfterDiscount: totals.totalAfter,
      cashierId: user.userId ?? "",
      customerId: selectedUser?.id,
      saleNumber,
      receivedAmount,
      change: calculatedChange,
      paidAt: new Date(),
    };

    setIsSubmitting(true);

    try {
      await processSale(payment, user.companyId);
      toast("✅ تم الدفع بنجاح!");

      // Reset state
      dispatch(clearCart());
      setReceivedAmount(0);
      dispatch(setDiscount({ type: "fixed", value: 0 }));
      setDiscountsValue(0);

      // Generate new sale number
      const newSaleNumber = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      setSaleNumber(newSaleNumber);

      dispatch(removeCart(activeCartId ?? ""));

      // Create new cart
      const newCartId = Date.now().toString();
      dispatch(
        addCart({ id: newCartId, name: `Chart-${newCartId.slice(-3)}` }),
      );
      dispatch(setActiveCart(newCartId));
    } catch (err: any) {
      toast.error(`❌ حدث خطأ: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    user,
    items,
    totals,
    receivedAmount,
    discountValue,
    discountType,
    saleNumber,
    users,
    activeCartId,
    dispatch,
  ]);

  if (!user) return null;

  const calculatedChange =
    receivedAmount >= totals.totalAfter
      ? receivedAmount - totals.totalAfter
      : 0;
  const isCash = receivedAmount >= totals.totalAfter;
  const canPay =
    (isCash && receivedAmount >= totals.totalAfter) ||
    (!isCash && selectedUser?.name);

  return (
    <div className="bg-accent flex h-[45hv] flex-col rounded-2xl p-2 shadow-xl/20 shadow-gray-500 lg:col-span-1">
      {/* Header & Cart Tabs */}
      <div className="flex justify-between">
        <div className="flex justify-between gap-1">
          <Button
            className="rounded-[5px] bg-green-500 px-3 py-1 text-white"
            onClick={() => {
              const newCartId = Date.now().toString();
              dispatch(
                addCart({
                  id: newCartId,
                  name: `Chart-${newCartId.slice(-5)}`,
                }),
              );
            }}
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
          <SearchInput
            placeholder={tt("search_customer")}
            paramKey="users"
            options={users ?? []}
            action={(user) => {
              setSelectedUser(user); // now `user` is single UserOption
            }}
          />
        </div>
      </div>

      <ScrollArea className="w-full py-2" dir="rtl">
        <div className="grid max-h-20 w-full grid-cols-2 gap-5 md:grid-cols-4">
          {carts.map((cart) => (
            <CartTab
              key={cart.id}
              cart={cart}
              isActive={cart.id === activeCartId}
              onSelect={() => dispatch(setActiveCart(cart.id))}
              onRemove={() => dispatch(removeCart(cart.id))}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="w-full">
        <ScrollArea
          className="h-[56vh] w-full rounded-2xl border border-amber-300 p-2"
          dir="rtl"
        >
          <Table className="w-full">
            <TableHeader className="sticky top-0 z-10">
              <TableRow className="border-amber-300 shadow-xl/20 shadow-gray-900">
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
                items.map((item, index) => (
                  <CartItemRow
                    key={`${item.id}-${item.sellingUnit}`}
                    item={item}
                    index={index}
                    products={product}
                    onUpdateQty={handleUpdateQty}
                    onChangeUnit={handleChangeUnit}
                    onRemove={handleRemoveItem}
                    t={t}
                  />
                ))
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

      {/* Footer with Payment Button */}
      <div
        className="border-t border-gray-200 p-4 dark:border-gray-700"
        dir="ltr"
      >
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-end justify-between">
            {/* Discount controls */}
            <div className="flex flex-col gap-1">
              {tt("customer")}: <Badge>{selectedUser?.name ?? ""}</Badge>
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
              </div>
            </div>

            {/* Totals display */}
            <div className="flex flex-col gap-1 text-right">
              <div className="flex justify-between gap-4">
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("beforeDiscount")}
                </Label>
                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {FormatPrice(totals.totalBefore)}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("discountValue")}
                </Label>
                <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {FormatPrice(totals.discount)}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-t border-gray-200 pt-1 dark:border-gray-700">
                <Label className="text-lg font-bold text-gray-800 dark:text-gray-200">
                  {t("total")}
                </Label>
                <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {totals.totalAfter.toFixed(2)}
                </span>
              </div>
              <Input
                value={receivedAmount === 0 ? "" : receivedAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setReceivedAmount(isNaN(val) ? 0 : val);
                }}
                placeholder="المبلغ المستلم"
                className="w-40 border-2 sm:w-2xs md:w-2xs lg:w-[200px]"
                type="number"
              />
            </div>
          </div>

          {items.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              {isMobileUA ? (
                <PrintButton
                  saleNumber={saleNumber}
                  items={items}
                  totals={totals}
                  receivedAmount={receivedAmount}
                  calculatedChange={calculatedChange}
                  userName={user?.name}
                  customerName={selectedUser?.name}
                  customerDebt={selectedUser?.outstandingBalance}
                  isCash={receivedAmount >= totals.totalAfter}
                  t={tt}
                />
              ) : (
                <Receipt
                  saleNumber={saleNumber}
                  items={items}
                  totals={totals}
                  receivedAmount={receivedAmount}
                  calculatedChange={calculatedChange}
                  userName={user?.name}
                  customerName={selectedUser?.name}
                  customerDebt={selectedUser?.outstandingBalance}
                  isCash={receivedAmount >= totals.totalAfter}
                  t={tt}
                />
              )}
              <Button
                disabled={!canPay || isSubmitting}
                onClick={handlePayment}
                className={cn(
                  "flex-1 rounded-md border-amber-500 py-3 text-amber-100 shadow-md",
                  {
                    "bg-green-600 hover:bg-green-700": canPay && !isSubmitting,
                    "cursor-not-allowed bg-gray-400": !canPay || isSubmitting,
                  },
                )}
              >
                {isSubmitting ? "جاري الحفظ..." : tt("pay_now")}
              </Button>

              <Button
                onClick={() => {
                  dispatch(clearCart());
                  setDiscountsValue(0);
                  setDiscountType("fixed");
                }}
                className="flex-1 rounded-md bg-red-500 py-3 text-white shadow-md transition-shadow hover:bg-red-600 hover:shadow-lg"
              >
                إلغاء
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
