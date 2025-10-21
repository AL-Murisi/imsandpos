// "use client";

// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { useAppDispatch, useAppSelector } from "@/lib/store";

// import { Minus, Plus, Trash2Icon, User } from "lucide-react";
// import { Button } from "../../../components/ui/button";
// import { Card, CardContent, CardFooter } from "../../../components/ui/card";
// import { Label } from "../../../components/ui/label";

// import Reservation from "../reservation/reserveItems";

// import { useAuth } from "@/lib/context/AuthContext";
// import {
//   selectActiveCartItems,
//   selectAvailableStock,
//   selectCartTotals,
// } from "@/lib/selectors";
// import {
//   addCart,
//   changeSellingUnit,
//   clearAllCart,
//   clearCart,
//   removeCart,
//   removeFromCart,
//   setActiveCart,
//   setDiscount,
//   updateQty,
// } from "@/lib/slices/cartSlice";
// import { ReactNode, useEffect, useRef, useState, useTransition } from "react";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// import { FormatPrice, useFormatter } from "@/hooks/usePrice";
// import { useTranslations } from "next-intl";
// import { Cashier, CashierItem, type CashierSchema } from "@/lib/zod";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { useRouter, useSearchParams } from "next/navigation";
// import { Badge } from "@/components/ui/badge";

// import { toast } from "sonner";
// import { Input } from "@/components/ui/input";
// import SearchInput from "@/components/common/searchtest";
// import { useTablePrams } from "@/hooks/useTableParams";
// import { processSale } from "@/app/actions/cashier";
// import { PrintButton } from "./test";
// import { Receipt } from "@/components/common/receipt";
// import { cn } from "@/lib/utils";
// export type SellingUnit = "carton" | "packet" | "unit";
// export type discountType = "fixed" | "percentage";
// type CartItem = CashierItem & {
//   id: string;
//   name: string;
//   sellingUnit: SellingUnit;
//   selectedQty: number;

//   originalStockQuantity: number;
//   unitsPerPacket: number;
//   packetsPerCarton: number;
// };
// interface CustomDialogProps {
//   users: {
//     id?: string;
//     name?: string;
//     phoneNumber?: string | null;
//     totalDebt?: number;
//   } | null;
// }

// export default function CartDisplay({ users }: CustomDialogProps) {
//   const { user, hasAnyRole, logout } = useAuth();
//   const [discountType, setDiscountType] = useState<discountType>("fixed");
//   const [discountValue, setDiscountsValue] = useState(10);
//   const [receivedAmount, setReceivedAmount] = useState(0);
//   const totals = useAppSelector(selectCartTotals);
//   const tt = useTranslations("payment");

//   const userAgent =
//     typeof window !== "undefined" ? navigator.userAgent.toLowerCase() : "";
//   const isMobileUA =
//     /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
//       userAgent,
//     );
//   const hasAddedCart = useRef(false);
//   if (!user) return;
//   useEffect(() => {
//     if (hasAddedCart.current) return; // prevent double
//     if (!activeCartId) {
//       const newCartId = Date.now().toString();
//       dispatch(
//         addCart({
//           id: newCartId,
//           name: `Cart-${newCartId.slice(-3)}`,
//         }),
//       );
//     }
//     hasAddedCart.current = true;
//   }, []);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [saleNumber, setSaleNumber] = useState(
//     `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
//   );
//   const getItemPrice = (item: CartItem) => {
//     const prices = {
//       unit: item.pricePerUnit ?? 0,
//       packet: item.pricePerPacket ?? 0,
//       carton: item.pricePerCarton ?? 0,
//     };
//     return prices[item.sellingUnit] || 0;
//   };
//   const calculatedChange =
//     receivedAmount >= totals.totalAfter
//       ? receivedAmount - totals.totalAfter
//       : 0;
//   const [pending, startTransition] = useTransition();
//   const params = useSearchParams();
//   const dispatch = useAppDispatch();
//   const products = useAppSelector(selectAvailableStock);
//   const carts = useAppSelector((state) => state.cart.carts);
//   const activeCartId = useAppSelector((state) => state.cart.activeCartId);
//   const items = useAppSelector(selectActiveCartItems);
//   const cartState = useAppSelector((s) => s.cart);
//   const t = useTranslations("cashier");
//   const isCash = receivedAmount >= totals.totalAfter;
//   const isDebt = !isCash;
//   const router = useRouter();
//   const canPay =
//     (isCash && receivedAmount >= totals.totalAfter) || (isDebt && users?.name);
//   const handelpayment = async () => {
//     const payment: Cashier = {
//       cart: items,
//       discountValue: cartState.discountValue,
//       discountType: cartState.discountType,
//       totalBeforeDiscount: totals.totalBefore,
//       totalDiscount: totals.discount,
//       totalAfterDiscount: totals.totalAfter,
//       cashierId: user?.userId ?? "",
//       customerId: users?.id,
//       saleNumber: saleNumber,
//       receivedAmount,

//       change: calculatedChange,
//       paidAt: new Date(),
//     };

//     try {
//       await processSale(payment, user.companyId); // ✅ await server action
//       setIsSubmitting(false);
//       toast("✅ تم الدفع بنجاح!");

//       // 1️⃣ Clear current cart
//       dispatch(clearCart());
//       setReceivedAmount(0);
//       dispatch(setDiscount({ type: "fixed", value: 0 }));

//       // 2️⃣ Generate new sale number
//       const newSaleNumber = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
//       setSaleNumber(newSaleNumber);
//       dispatch(removeCart(activeCartId ?? ""));

//       // 3️⃣ Create new cart with the new sale number
//       const newCartId = Date.now().toString();
//       dispatch(
//         addCart({
//           id: newCartId,
//           name: `Chart-${newCartId.slice(-3)}`,
//         }),
//       );

//       dispatch(setActiveCart(newCartId)); // set the new cart as active
//     } catch (err: any) {
//       alert(`❌ حدث خطأ: ${err.message}`);
//     }
//   };

//   return (
//     <div className="bg-background flex h-[50hv] flex-col rounded-2xl p-2 shadow-xl/20 shadow-gray-500 lg:col-span-1">
//       {/* Header */}
//       <div className="flex justify-between">
//         <div className="flex justify-between gap-1">
//           <Button
//             className="rounded-[5px] bg-green-500 px-3 py-1 text-white"
//             onClick={() =>
//               dispatch(
//                 addCart({
//                   id: Date.now().toString(),
//                   name: `Chart-${Date.now().toString().slice(-5)}`,
//                 }),
//               )
//             }
//           >
//             {t("newCart")}
//           </Button>
//           {carts.length > 1 && (
//             <Button
//               className="bg-red-500"
//               onClick={() => dispatch(clearAllCart())}
//             >
//               {t("deleteAll")}
//             </Button>
//           )}
//         </div>
//         <div className="flex w-60 flex-row justify-end sm:w-2xs md:w-sm">
//           <SearchInput placeholder={tt("search_customer")} paramKey="users" />
//         </div>
//       </div>

//       <ScrollArea className="w-full py-2" dir="rtl">
//         <div className="grid max-h-20 w-full grid-cols-2 gap-5 md:grid-cols-4">
//           {carts.map((cart) => (
//             <div className="flex flex-row gap-1">
//               <Button
//                 key={cart.id}
//                 className={`rounded ${
//                   cart.id === activeCartId
//                     ? "bg-card border-primary text-foreground hover:bg-secondary rounded-md border-2 hover:scale-100"
//                     : "bg-primary text-black"
//                 }`}
//                 onClick={() => dispatch(setActiveCart(cart.id))}
//               >
//                 {cart.name}
//               </Button>

//               <div
//                 className="mt-1"
//                 onClick={() => dispatch(removeCart(cart.id))}
//               >
//                 <Trash2Icon color="red" />
//               </div>
//             </div>
//           ))}
//         </div>
//         <ScrollBar orientation="vertical" />
//       </ScrollArea>

//       <div className="w-full">
//         {/* Single ScrollArea with proper height and both scrollbars */}
//         <ScrollArea className="h-[60vh] w-full rounded-2xl border border-amber-300 p-2">
//           <Table className="w-full">
//             <TableHeader className="sticky top-0 z-10">
//               <TableRow className="border-amber-300">
//                 <TableHead>{t("product")}</TableHead>
//                 <TableHead>{t("sku")}</TableHead>
//                 <TableHead>{t("product")}</TableHead>
//                 <TableHead>{t("warehouse")}</TableHead>
//                 <TableHead>{t("quantity")}</TableHead>
//                 <TableHead>{t("type")}</TableHead>
//                 <TableHead>{t("price")}</TableHead>
//                 <TableHead>{t("total")}</TableHead>
//                 <TableHead>{t("actions")}</TableHead>{" "}
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {items.length > 0 ? (
//                 items.map((item, index) => {
//                   const itemPrice = getItemPrice(item);

//                   return (
//                     <TableRow
//                       key={`${item.id}-${item.sellingUnit}`}
//                       className="border-amber-300 border-r-amber-300"
//                     >
//                       <TableCell className="border-l-red-400">
//                         {index + 1}
//                       </TableCell>
//                       <TableCell className="border-l-red-400">
//                         {item.sku}
//                       </TableCell>
//                       <TableCell className="border-l-red-400">
//                         {item.name}
//                       </TableCell>
//                       <TableCell> {item.warehousename}</TableCell>
//                       <TableCell>
//                         <button
//                           disabled={item.selectedQty <= 1}
//                           onClick={() => {
//                             dispatch(
//                               updateQty({
//                                 id: item.id,
//                                 sellingUnit: item.sellingUnit,
//                                 quantity: 1,
//                                 action: "mins",
//                               }),
//                             );
//                           }}
//                           className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
//                         >
//                           <Minus size={16} />
//                         </button>
//                         <input
//                           value={item.selectedQty}
//                           onChange={(e) => {
//                             const qty = Math.max(
//                               1,
//                               Number(e.target.value) || 1,
//                             );
//                             dispatch(
//                               updateQty({
//                                 id: item.id,
//                                 sellingUnit: item.sellingUnit,
//                                 quantity: 1,
//                                 action: "",
//                               }),
//                             );
//                           }}
//                           className="w-16 rounded border bg-white px-2 py-1 text-center text-black dark:bg-gray-800 dark:text-white"
//                           min={1}
//                           // max={maxQty}
//                         />
//                         <button
//                           disabled={(() => {
//                             const product = products.find(
//                               (p) => p.id === item.id,
//                             );
//                             if (!product) return true;

//                             // Check stock based on current selling unit
//                             if (item.sellingUnit === "carton") {
//                               // For cartons, only count full cartons (integer part)
//                               const fullCartons = Math.floor(
//                                 product.availableCartons,
//                               );
//                               return item.selectedQty >= fullCartons;
//                             } else if (item.sellingUnit === "packet") {
//                               // For packets, extract packets from decimal part + direct packets
//                               const decimalPart = product.availableCartons % 1;
//                               const packetsFromCartons = Math.floor(
//                                 decimalPart * 100,
//                               );
//                               const totalPackets =
//                                 packetsFromCartons + product.availablePackets;
//                               return item.selectedQty >= totalPackets;
//                             } else if (item.sellingUnit === "unit") {
//                               // For units, use total available units
//                               return item.selectedQty >= product.availableUnits;
//                             }
//                             return false;
//                           })()}
//                           onClick={() => {
//                             dispatch(
//                               updateQty({
//                                 id: item.id,
//                                 sellingUnit: item.sellingUnit,
//                                 quantity: 1,
//                                 action: "plus",
//                               }),
//                             );
//                           }}
//                           className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
//                         >
//                           <Plus size={16} />
//                         </button>
//                       </TableCell>
//                       <TableCell>
//                         <Select
//                           value={item.sellingUnit}
//                           onValueChange={(value) =>
//                             dispatch(
//                               changeSellingUnit({
//                                 id: item.id,
//                                 from: item.sellingUnit,
//                                 to: value as "unit" | "packet" | "carton",
//                                 product: {
//                                   packetsPerCarton: item.packetsPerCarton,
//                                   unitsPerPacket: item.unitsPerPacket,
//                                 },
//                                 qty: item.selectedQty,
//                               }),
//                             )
//                           }
//                         >
//                           <SelectTrigger className="rounded border px-2 py-1">
//                             <SelectValue />
//                           </SelectTrigger>
//                           <SelectContent>
//                             <SelectItem
//                               value="carton"
//                               disabled={(() => {
//                                 const product = products.find(
//                                   (p) => p.id === item.id,
//                                 );
//                                 if (!product) return true;

//                                 // Disable carton if less than 1 full carton available
//                                 if (product.availableCartons < 1) return true;

//                                 // Disable if current qty has decimals
//                                 if (item.selectedQty % 1 !== 0) return true;

//                                 return false;
//                               })()}
//                             >
//                               كرتون
//                             </SelectItem>
//                             <SelectItem
//                               value="packet"
//                               disabled={(() => {
//                                 const product = products.find(
//                                   (p) => p.id === item.id,
//                                 );
//                                 if (!product) return true;

//                                 // Extract the decimal part to get packets
//                                 // 1.90 cartons = Math.floor(0.90 * 100) = 90 packets
//                                 // 0.90 cartons = Math.floor(0.90 * 100) = 90 packets
//                                 // 0.00 cartons = 0 packets
//                                 if (product.availablePackets < 1) return true;

//                                 // Disable if current qty has decimals
//                                 if (item.selectedQty % 1 !== 0) return true;

//                                 // Disable if converting from unit and current qty has decimals
//                                 if (
//                                   item.sellingUnit === "unit" &&
//                                   item.selectedQty % 1 !== 0
//                                 )
//                                   return true;

//                                 return false;
//                               })()}
//                             >
//                               حزمة
//                             </SelectItem>
//                             <SelectItem
//                               value="unit"
//                               disabled={(() => {
//                                 const product = products.find(
//                                   (p) => p.id === item.id,
//                                 );
//                                 if (!product) return true;

//                                 return product.availableUnits < 1;
//                               })()}
//                             >
//                               حبة
//                             </SelectItem>
//                           </SelectContent>
//                         </Select>
//                       </TableCell>
//                       <TableCell className="w-16 text-center text-sm whitespace-nowrap">
//                         ${itemPrice}
//                       </TableCell>
//                       <TableCell className="w-16 text-center text-sm whitespace-nowrap">
//                         ${(itemPrice * item.selectedQty).toFixed(2)}
//                       </TableCell>
//                       <TableCell className="flex w-12 justify-center">
//                         <Button
//                           onClick={() =>
//                             dispatch(
//                               removeFromCart(
//                                 item.id,
//                                 // sellingUnit: item.sellingUnit,
//                               ),
//                             )
//                           }
//                           variant="ghost"
//                           size="icon"
//                         >
//                           <Trash2Icon color="red" size={18} />
//                         </Button>
//                       </TableCell>
//                     </TableRow>
//                   );
//                 })
//               ) : (
//                 <TableRow>
//                   <TableCell
//                     colSpan={9}
//                     className="h-140 py-6 text-center text-gray-500"
//                   >
//                     {t("noProducts")}
//                   </TableCell>
//                 </TableRow>
//               )}
//             </TableBody>
//           </Table>
//           <ScrollBar orientation="horizontal" />
//         </ScrollArea>
//       </div>
//       {/* Footer with totals and actions */}
//       <div
//         className="border-t border-gray-200 p-4 dark:border-gray-700"
//         dir="ltr"
//       >
//         <div className="flex w-full flex-col gap-4">
//           <div className="flex items-end justify-between">
//             {/* Discount controls */}
//             <div className="flex flex-col gap-1">
//               {" "}
//               {tt("customer")}: <Badge>{users?.name ?? ""}</Badge>
//               <label
//                 htmlFor="discount"
//                 className="text-sm font-semibold text-gray-700 dark:text-gray-300"
//               >
//                 {t("discount")}
//               </label>
//               <div className="flex gap-2">
//                 <Select
//                   value={discountType}
//                   onValueChange={(value: "fixed" | "percentage") => {
//                     dispatch(
//                       setDiscount({
//                         type: value,
//                         value: discountValue || 0,
//                       }),
//                     );
//                     setDiscountType(value);
//                   }}
//                 >
//                   <SelectTrigger className="rounded border px-2 py-1">
//                     <SelectValue />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="fixed">{t("fixed")}</SelectItem>
//                     <SelectItem value="percentage">
//                       {t("percentage")}
//                     </SelectItem>
//                   </SelectContent>
//                 </Select>

//                 <input
//                   type="number"
//                   value={discountValue}
//                   onChange={(e) => {
//                     const val = Math.max(0, Number(e.target.value));
//                     dispatch(
//                       setDiscount({
//                         type: discountType ?? "fixed",
//                         value: val,
//                       }),
//                     );
//                     setDiscountsValue(val);
//                   }}
//                   min={0}
//                   className="w-20 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600"
//                   max={discountType === "percentage" ? 100 : totals.totalBefore}
//                 />
//               </div>{" "}
//             </div>

//             {/* Totals display */}
//             <div className="flex flex-col gap-1 text-right">
//               <div className="flex justify-between gap-4">
//                 <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
//                   {t("beforeDiscount")}
//                 </Label>
//                 <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
//                   {FormatPrice(totals.totalBefore)}
//                 </span>
//               </div>
//               <div className="flex justify-between gap-4">
//                 <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
//                   {t("discountValue")}
//                 </Label>
//                 <span className="text-sm font-semibold text-red-600 dark:text-red-400">
//                   {FormatPrice(totals.discount)}
//                 </span>
//               </div>
//               <div className="flex justify-between gap-4 border-t border-gray-200 pt-1 dark:border-gray-700">
//                 <Label className="text-lg font-bold text-gray-800 dark:text-gray-200">
//                   {t("total")}
//                 </Label>
//                 <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
//                   {FormatPrice(totals.totalAfter)}
//                 </span>
//               </div>{" "}
//               <Input
//                 value={receivedAmount === 0 ? "" : receivedAmount} // show empty instead of 0
//                 onChange={(e) => {
//                   const val = Number(e.target.value);
//                   setReceivedAmount(isNaN(val) ? 0 : val); // store 0 if input is empty or invalid
//                 }}
//                 placeholder="المبلغ المستلم"
//                 className="w-40 border-2 sm:w-2xs md:w-2xs lg:w-[200px]"
//                 type="number"
//               />
//             </div>
//           </div>

//           {items.length !== 0 ? (
//             <div className="mt-4 flex flex-col gap-3 md:flex-row">
//               {isMobileUA ? (
//                 <PrintButton
//                   saleNumber={saleNumber}
//                   items={items}
//                   totals={totals}
//                   receivedAmount={receivedAmount}
//                   calculatedChange={calculatedChange}
//                   userName={user?.name}
//                   customerName={users?.name}
//                   customerDebt={users?.totalDebt}
//                   isCash={receivedAmount >= totals.totalAfter}
//                   t={tt}
//                 />
//               ) : (
//                 <Receipt
//                   saleNumber={saleNumber}
//                   items={items}
//                   totals={totals}
//                   receivedAmount={receivedAmount}
//                   calculatedChange={calculatedChange}
//                   userName={user?.name}
//                   customerName={users?.name}
//                   customerDebt={users?.totalDebt}
//                   isCash={receivedAmount >= totals.totalAfter}
//                   t={tt}
//                 />
//               )}
//               <Button
//                 disabled={!canPay || isSubmitting}
//                 onClick={() => {
//                   startTransition(async () => {
//                     await handelpayment();
//                   });
//                   setIsSubmitting(true);
//                 }}
//                 className={cn(
//                   "flex-1 rounded-md border-amber-500 py-3 text-amber-100 shadow-md",
//                   {
//                     "bg-green-600 hover:bg-green-700": canPay && !isSubmitting,
//                     "cursor-not-allowed bg-gray-400": !canPay || isSubmitting,
//                   },
//                 )}
//               >
//                 {isSubmitting ? "جاري الحفظ." : tt("pay_now")}
//               </Button>
//               <Reservation
//                 cart={items}
//                 total={totals.totalAfter}
//                 discount={totals.discount}
//                 discountType={"fixed"}
//                 //   onSuccess={onPaymentSuccess}
//               />
//               <Button
//                 onClick={() => {
//                   (dispatch(clearCart()),
//                     setDiscountsValue(0),
//                     setDiscountType("fixed"));
//                   //  dispatch(removeCart(cart.id))
//                 }}
//                 className="flex-1 rounded-md bg-red-500 py-3 text-white shadow-md transition-shadow hover:bg-red-600 hover:shadow-lg"
//               >
//                 إلغاء
//               </Button>
//             </div>
//           ) : (
//             <div className="flex justify-center">
//               <p className="text-center">اختر المنتج</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
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
import { Minus, Plus, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
import { useEffect, useRef, useState, useCallback, memo } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { FormatPrice } from "@/hooks/usePrice";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import SearchInput from "@/components/common/searchtest";
import { processSale } from "@/app/actions/cashier";
import { cn } from "@/lib/utils";
import { ProductForSale } from "@/lib/zod";
import { PrintButton } from "./test";
import { Receipt } from "@/components/common/receipt";

export type SellingUnit = "carton" | "packet" | "unit";
export type discountType = "fixed" | "percentage";
type forsale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
};
interface CustomDialogProps {
  users: {
    id?: string;
    name?: string;
    phoneNumber?: string | null;
    totalDebt?: number;
  } | null;
  product: forsale[];
}

// 🚀 Memoized Cart Tab Component
const CartTab = memo(
  ({
    cart,
    isActive,
    onSelect,
    onRemove,
  }: {
    cart: any;
    isActive: boolean;
    onSelect: () => void;
    onRemove: () => void;
  }) => (
    <div className="flex flex-row gap-1">
      <Button
        className={`rounded ${
          isActive
            ? "bg-card border-primary text-foreground hover:bg-secondary rounded-md border-2 hover:scale-100"
            : "bg-primary text-black"
        }`}
        onClick={onSelect}
      >
        {cart.name}
      </Button>
      <div className="mt-1" onClick={onRemove}>
        <Trash2Icon color="red" />
      </div>
    </div>
  ),
);

CartTab.displayName = "CartTab";

// 🚀 Memoized Cart Item Row
const CartItemRow = memo(
  ({
    item,
    index,
    products,
    onUpdateQty,
    onChangeUnit,
    onRemove,
    t,
  }: {
    item: any;
    index: number;
    products: forsale[];
    onUpdateQty: (
      id: string,
      sellingUnit: SellingUnit,
      quantity: number,
      action: string,
    ) => void;
    onChangeUnit: (
      id: string,
      from: SellingUnit,
      to: SellingUnit,
      item: any,
    ) => void;
    onRemove: (id: string) => void;
    t: any;
  }) => {
    const itemPrice =
      item.sellingUnit === "unit"
        ? (item.pricePerUnit ?? 0)
        : item.sellingUnit === "packet"
          ? (item.pricePerPacket ?? 0)
          : (item.pricePerCarton ?? 0);

    const getMaxQty = useCallback(() => {
      const product = products.find((p: any) => p.id === item.id);
      if (!product) return 0;

      if (item.sellingUnit === "carton") {
        return Math.floor(product.availableCartons);
      } else if (item.sellingUnit === "packet") {
        const decimalPart = product.availableCartons % 1;
        const packetsFromCartons = Math.floor(decimalPart * 100);
        return packetsFromCartons + product.availablePackets;
      }
      return product.availableUnits;
    }, [products, item.id, item.sellingUnit]);
    const product = products.find((p: any) => p.id === item.id);
    if (!product) return 0;
    const maxQty = getMaxQty();

    return (
      <TableRow className="border-amber-300">
        <TableCell>{index + 1}</TableCell>
        <TableCell>{item.sku}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.warehousename}</TableCell>
        <TableCell>
          <button
            disabled={item.selectedQty <= 1}
            onClick={() => onUpdateQty(item.id, item.sellingUnit, 1, "mins")}
            className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
          >
            <Minus size={16} />
          </button>
          <input
            value={item.selectedQty}
            onChange={(e) => {
              const qty = Math.max(1, Number(e.target.value) || 1);
              onUpdateQty(item.id, item.sellingUnit, qty, "plus");
            }}
            className="w-16 rounded border bg-white px-2 py-1 text-center text-black dark:bg-gray-800 dark:text-white"
            min={1}
          />
          <button
            disabled={item.selectedQty >= maxQty}
            onClick={() => onUpdateQty(item.id, item.sellingUnit, 1, "plus")}
            className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
          >
            <Plus size={16} />
          </button>
        </TableCell>
        <TableCell>
          <Select
            value={item.sellingUnit}
            onValueChange={(value: string) =>
              onChangeUnit(
                item.id,
                item.sellingUnit,
                value as SellingUnit,
                item,
              )
            }
          >
            <SelectTrigger className="rounded border px-2 py-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* ✅ Full mode → all options available */}
              {item.sellingMode === "full" && (
                <>
                  <SelectItem
                    disabled={item.selectedQty >= product.availableCartons}
                    value="carton"
                  >
                    كرتون
                  </SelectItem>
                  <SelectItem
                    disabled={item.selectedQty >= product.packetsPerCarton}
                    value="packet"
                  >
                    حزمة
                  </SelectItem>
                  <SelectItem value="unit">حبة</SelectItem>
                </>
              )}

              {/* ✅ Carton + Unit mode (no packet) */}
              {item.sellingMode === "cartonUnit" && (
                <>
                  <SelectItem
                    disabled={item.selectedQty >= product.availableCartons}
                    value="carton"
                  >
                    كرتون
                  </SelectItem>
                  <SelectItem value="unit">حبة</SelectItem>
                </>
              )}

              {/* ✅ Carton only mode */}
              {item.sellingMode === "cartonOnly" && (
                <SelectItem value="carton">كرتون</SelectItem>
              )}
            </SelectContent>
          </Select>

          {/* <Select
            value={item.sellingUnit}
            onValueChange={(value: string) =>
              onChangeUnit(
                item.id,
                item.sellingUnit,
                value as SellingUnit,
                item,
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
          </Select> */}
        </TableCell>
        <TableCell>{item.sellingMode}</TableCell>
        <TableCell className="whitespace-nowrap">${itemPrice}</TableCell>
        <TableCell className="whitespace-nowrap">
          ${(itemPrice * item.selectedQty).toFixed(2)}
        </TableCell>
        <TableCell>
          <Button onClick={() => onRemove(item.id)} variant="ghost" size="icon">
            <Trash2Icon color="red" size={18} />
          </Button>
        </TableCell>
      </TableRow>
    );
  },
  (prev, next) => {
    return (
      prev.item.selectedQty === next.item.selectedQty &&
      prev.item.sellingUnit === next.item.sellingUnit &&
      prev.products === next.products
    );
  },
);

CartItemRow.displayName = "CartItemRow";

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
      customerId: users?.id,
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
    (isCash && receivedAmount >= totals.totalAfter) || (!isCash && users?.name);

  return (
    <div className="bg-background flex h-[50hv] flex-col rounded-2xl p-2 shadow-xl/20 shadow-gray-500 lg:col-span-1">
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
          <SearchInput placeholder={tt("search_customer")} paramKey="users" />
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

      {/* Cart Items Table */}
      <div className="w-full">
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
                <TableHead>mose</TableHead>
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
                  {FormatPrice(totals.totalAfter)}
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
                  customerName={users?.name}
                  customerDebt={users?.totalDebt}
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
                  customerName={users?.name}
                  customerDebt={users?.totalDebt}
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
