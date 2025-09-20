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
import { CashierItem } from "@/lib/zodType";
import { Minus, Plus, Trash2Icon, User } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardFooter } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import Addtouserrecod from "../debtSell/Addtouserrecod";
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
import { ReactNode, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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
  payment: ReactNode;
}
export default function CartDisplay({ payment }: CustomDialogProps) {
  const { user, hasAnyRole, logout } = useAuth();
  const [discountType, setDiscountType] = useState<discountType>("fixed");
  const [discountValue, setDiscountsValue] = useState(10);
  const getItemPrice = (item: CartItem) => {
    const prices = {
      unit: item.pricePerUnit ?? 0,
      packet: item.pricePerPacket ?? 0,
      carton: item.pricePerCarton ?? 0,
    };
    return prices[item.sellingUnit] || 0;
  };

  const dispatch = useAppDispatch();
  const products = useAppSelector(selectAvailableStock);
  const carts = useAppSelector((state) => state.cart.carts);
  const activeCartId = useAppSelector((state) => state.cart.activeCartId);
  const items = useAppSelector(selectActiveCartItems);

  const totals = useAppSelector(selectCartTotals);
  return (
    <div className="bg-background rounded-2xl p-2 lg:col-span-1">
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
            + جديد
          </Button>
          {carts.length > 1 && (
            <Button
              className="bg-red-500"
              onClick={() => dispatch(clearAllCart())}
            >
              Delete All
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Label> {user?.name}مرحباً</Label>
          <User size={20} />

          {/* //الأدوار: {user?.roles.join(", ")} */}
        </div>
      </div>

      <ScrollArea className="w-full flex-wrap py-2" dir="rtl">
        <div className="flex h-20 w-full flex-wrap gap-2">
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

      <Card className="border-0 shadow-2xl">
        {/*         
       
        <div className="flex gap-2 items-center px-2 py-2">
          <Label className="w-16 flex-1 text-sm font-semibold break-words">
            المنتج
          </Label>
          <Label >
            مستودع
          </Label>
          <Label >
            النوع
          </Label>
          <Label className="w-20 flex text-sm justify-center font-semibold">
            الكمية
          </Label>
          <Label >
            السعر
          </Label>
          <Label >
            الإجمالي
          </Label>
          <Label className="w-12 text-sm font-semibold text-center">
            إجراء
          </Label>
        </div> */}

        {/* Cart Items */}

        <CardContent className="w-full p-4">
          {/* Single ScrollArea with proper height and both scrollbars */}
          <ScrollArea className="h-[49vh] w-full rounded-2xl border border-amber-300 p-2">
            <Table className="min-w-full">
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="border-amber-300">
                  <TableHead className="border-amber-300 text-right">
                    منتج
                  </TableHead>
                  <TableHead className="border-amber-300 text-right">
                    sku
                  </TableHead>
                  <TableHead className="border-amber-300 text-right">
                    المنتج
                  </TableHead>
                  <TableHead className="text-right"> مستودع</TableHead>
                  <TableHead className="text-right"> الكمية </TableHead>
                  <TableHead className="text-right"> النوع</TableHead>
                  <TableHead className="text-right"> السعر</TableHead>
                  <TableHead className="text-right"> الإجمالي </TableHead>
                  <TableHead className="text-right"> إجراء </TableHead>
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
                          {" "}
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
                            className="w-12 rounded border bg-white px-2 py-1 text-center text-black dark:bg-gray-800 dark:text-white"
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
                          <select
                            value={item.sellingUnit}
                            onChange={(e) =>
                              dispatch(
                                changeSellingUnit({
                                  id: item.id,
                                  from: item.sellingUnit,
                                  to: e.target.value as any,
                                  product: {
                                    packetsPerCarton: item.packetsPerCarton,
                                    unitsPerPacket: item.unitsPerPacket,
                                  },
                                  qty: item.selectedQty,
                                }),
                              )
                            }
                          >
                            <option value="carton">كرتون</option>
                            <option value="packet">حزمة</option>
                            <option value="unit">وحدة</option>
                          </select>
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
                      لا توجد منتجات في السلة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
        {/* Footer with totals and actions */}
        <CardFooter
          className="border-t border-gray-200 p-4 dark:border-gray-700"
          dir="ltr"
        >
          <div className="flex w-full flex-col gap-4">
            <div className="flex items-end justify-between">
              {/* Discount controls */}
              <div className="flex flex-col gap-1">
                <label
                  htmlFor="discount"
                  className="text-sm font-semibold text-gray-700 dark:text-gray-300"
                >
                  الخصم
                </label>
                <div className="flex gap-2">
                  <select
                    value={discountType}
                    onChange={(e) => {
                      dispatch(
                        setDiscount({
                          type: e.target.value as "fixed" | "percentage",
                          value: discountValue | 10,
                        }),
                      );
                      setDiscountType(e.target.value as "fixed" | "percentage");
                    }}
                  >
                    <option value="fixed">ثابت</option>
                    <option value="percentage">نسبة</option>
                  </select>

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
                    max={
                      discountType === "percentage" ? 100 : totals.totalBefore
                    }
                  />
                </div>
              </div>

              {/* Totals display */}
              <div className="flex flex-col gap-1 text-right">
                <div className="flex justify-between gap-4">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    الإجمالي قبل الخصم:
                  </Label>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    ${totals.totalBefore.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    قيمة الخصم:
                  </Label>
                  <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                    ${totals.discount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-t border-gray-200 pt-1 dark:border-gray-700">
                  <Label className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    الإجمالي بعد الخصم:
                  </Label>
                  <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    Total: ${totals.totalAfter.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {items.length !== 0 ? (
              <div className="mt-4 flex flex-1/3 gap-3">
                <Addtouserrecod />
                {payment}
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
        </CardFooter>
      </Card>
    </div>
  );
}
