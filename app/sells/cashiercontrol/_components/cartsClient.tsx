// "use client";

// import {
//   generateSaleNumber,
//   getNextSaleNumber,
//   processSale,
// } from "@/lib/actions/cashier";
// import SearchInput from "@/components/common/searchlist";
// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import { FormatPrice } from "@/hooks/usePrice";
// import { useAuth } from "@/lib/context/AuthContext";
// import { selectActiveCartItems, selectCartTotals } from "@/lib/selectors";
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
// import { useAppDispatch, useAppSelector } from "@/lib/store";
// import { cn } from "@/lib/utils";
// import { ProductForSale, SellingUnit } from "@/lib/zod";
// import { useTranslations } from "next-intl";
// import { useCallback, useEffect, useRef, useState } from "react";
// import { toast } from "sonner";

// import dynamic from "next/dynamic";
// import { useCompany } from "@/hooks/useCompany";
// import Link from "next/link";
// import { Clock } from "lucide-react";
// import {
//   CartItem,
//   updateProductStockOptimistic,
// } from "@/lib/slices/productsSlice";
// import { currencyOptions } from "@/lib/actions/currnciesOptions";

// const PrintButton = dynamic(
//   () => import("./test").then((mod) => mod.PrintButton),
//   { ssr: false },
// );
// const CartItemRow = dynamic(
//   () => import("./CartClient").then((mod) => mod.CartItemRow),
//   { ssr: false },
// );
// const CartTab = dynamic(
//   () => import("./CartClient").then((mod) => mod.CartTab),
//   { ssr: false },
// );
// const Receipt = dynamic(
//   () => import("@/components/common/receipt").then((mod) => mod.Receipt),
//   { ssr: false },
// );

// export type discountType = "fixed" | "percentage";
// type forsale = ProductForSale & {
//   warehousename: string;
//   sellingMode: string;
//   sellingUnits: SellingUnit[];
//   availableStock: Record<string, number>;
// };
// interface UserOption {
//   id?: string;
//   name?: string;
//   phoneNumber?: string | null;
//   outstandingBalance?: number;
//   preferred_currency?: string[];
//   creditLimit?: number;
// }

// interface CustomDialogProps {
//   users: UserOption[] | null;
//   product: forsale[];
//   nextnumber: string;
// }
// type company =
//   | {
//       id: string;
//       name: string;
//       email: string | null;
//       phone: string | null;
//       address: string | null;
//       city: string | null;
//       country: string | null;
//       logoUrl: string | null;
//     }
//   | undefined;

// export default function CartDisplay({
//   users,
//   product,
//   nextnumber,
// }: CustomDialogProps) {
//   const { user } = useAuth();
//   const dispatch = useAppDispatch();
//   const t = useTranslations("cashier");
//   const tt = useTranslations("payment");
//   const [isLoading, setIsLoading] = useState(false);
//   // Selectors with memoization
//   const items = useAppSelector(selectActiveCartItems);
//   const totals = useAppSelector(selectCartTotals);
//   const carts = useAppSelector((state) => state.cart.carts);
//   const activeCartId = useAppSelector((state) => state.cart.activeCartId);
//   // const products = useAppSelector(selectAvailableStock);
//   const userAgent =
//     typeof window !== "undefined" ? navigator.userAgent.toLowerCase() : "";
//   const isMobileUA =
//     /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
//       userAgent,
//     );
//   // Local state
//   if (!user) return; // wait until user is loaded
//   const { company } = useCompany();
//   const cartItems =
//     useAppSelector(
//       (s) => s.cart.carts.find((c) => c.id === s.cart.activeCartId)?.items,
//     ) ?? [];
//   const [discountType, setDiscountType] = useState<discountType>("fixed");
//   const [discountValue, setDiscountsValue] = useState(0);
//   const [receivedAmount, setReceivedAmount] = useState(0);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
//   const [isLoadingSaleNumber, setIsLoadingSaleNumber] = useState(false);
//   const [currency, setCurrency] = useState<UserOption | null>(null);
//   // useEffect(() => {
//   //   async function loadSaleNumber() {
//   //     if (!user?.companyId) return;

//   //     setIsLoadingSaleNumber(true);
//   //     try {
//   //       const nextNumber = await generateSaleNumber(user.companyId);
//   //       setSaleNumber(nextNumber);
//   //     } catch (error) {
//   //       console.error("Error loading sale number:", error);
//   //       // Fallback to timestamp-based number
//   //       setSaleNumber(`SALE-${Date.now()}`);
//   //     } finally {
//   //       setIsLoadingSaleNumber(false);
//   //     }
//   //   }

//   //   loadSaleNumber();
//   // }, [, activeCartId]); // Reload when cart changes
//   const debtLimit = totals.totalAfter + (selectedUser?.outstandingBalance ?? 0);

//   // Check only when we actually have a selected user and a credit limit

//   const hasAddedCart = useRef(false);

//   useEffect(() => {
//     if (hasAddedCart.current || !user) return;
//     if (!activeCartId) {
//       const newCartId = Date.now().toString();
//       dispatch(addCart({ id: newCartId, name: `Cart-${newCartId.slice(-3)}` }));
//     }
//     hasAddedCart.current = true;
//   }, [activeCartId, dispatch, user]);

//   // 🚀 Memoized callbacks
//   const handleUpdateQty = useCallback(
//     (
//       id: string,
//       selectedUnitId: string,

//       quantity: number,
//       action: string,
//     ) => {
//       dispatch(updateQty({ id, selectedUnitId, quantity, action }));
//     },
//     [dispatch],
//   );

//   const handleChangeUnit = useCallback(
//     (id: string, fromUnit: SellingUnit, toUnit: SellingUnit, item: any) => {
//       // 1️⃣ التأكد من أن الوحدة الجديدة لا تسبب تكراراً مع سطر آخر موجود فعلاً
//       const exits = items.find(
//         (i) => i.id === id && i.selectedUnitId === toUnit.id,
//       );

//       if (exits) {
//         toast.error("⚠️ هذه الوحدة مضافة بالفعل في السلة");
//         return;
//       }

//       // 2️⃣ تغيير الوحدة: نرسل fromUnitId ليعرف الـ reducer أي سطر يغير تحديداً
//       dispatch(
//         changeSellingUnit({
//           id,
//           fromUnitId: item.selectedUnitId, // المعرف القديم للسطر
//           toUnitId: toUnit.id, // المعرف الجديد للسطر
//         }),
//       );

//       // 3️⃣ تحديث المخزون (Optimistic)
//       // نرجع الكمية القديمة للمخزون
//       dispatch(
//         updateProductStockOptimistic({
//           productId: id,
//           sellingUnit: item.selectedUnitId,
//           quantity: item.selectedQty,
//           mode: "restore",
//         }),
//       );

//       // نخصم الكمية الجديدة (1 لأن التغيير يعيد التعيين لـ 1 عادةً)
//       dispatch(
//         updateProductStockOptimistic({
//           productId: id,
//           sellingUnit: toUnit.id,
//           quantity: 1,
//           mode: "consume",
//         }),
//       );
//     },
//     [dispatch, items], // أضف items هنا لضمان عمل التحقق (exits) بشكل صحيح
//   );
//   // const handleChangeUnit = useCallback(
//   //   (id: string, fromUnit: SellingUnit, toUnit: SellingUnit, item: any) => {
//   //     // 1️⃣ الفحص: هل الوحدة الجديدة موجودة بالفعل في السلة لهذا المنتج؟
//   //     // نقوم بالبحث في cartItems (تأكد من وجودها في الـ scope أو جلبها عبر Selector)
//   //     const isAlreadyInCart = cartItems.some(
//   //       (i: any) => i.id === id && i.selectedUnitId === toUnit.id,
//   //     );

//   //     if (isAlreadyInCart) {
//   //       // إشعار للمستخدم (اختياري)
//   //       console.warn("هذه الوحدة مضافة بالفعل في السلة");
//   //       return; // توقف هنا ولا ترسل أي Dispatch
//   //     }

//   //     // 2️⃣ تغيير الوحدة في السلة
//   //     dispatch(
//   //       changeSellingUnit({
//   //         id,
//   //         fromUnitId: item.selectedUnitId,
//   //         toUnitId: toUnit.id,
//   //       }),
//   //     );

//   //     // 3️⃣ إعادة المخزون للوحدة القديمة (بناءً على الكمية التي كانت في السلة)
//   //     dispatch(
//   //       updateProductStockOptimistic({
//   //         productId: id,
//   //         sellingUnit: fromUnit.id, // نرسل الـ ID
//   //         quantity: item.selectedQty,
//   //         mode: "restore",
//   //       }),
//   //     );

//   //     // 4️⃣ خصم المخزون من الوحدة الجديدة (بناءً على الكمية الافتراضية الجديدة وهي 1)
//   //     dispatch(
//   //       updateProductStockOptimistic({
//   //         productId: id,
//   //         sellingUnit: toUnit.id, // نرسل الـ ID
//   //         quantity: 1, // لأن changeSellingUnit تقوم بتعيين الكمية لـ 1
//   //         mode: "consume",
//   //       }),
//   //     );
//   //   },
//   //   [dispatch, cartItems], // أضف cartItems للتأكد من دقة الفحص
//   // );
//   const handleRemoveItem = useCallback(
//     (id: string, unitId: string) => {
//       // 1️⃣ Find the item in the current cart items before removing it
//       const itemToRestore = items.find((item) => item.id === id);

//       if (itemToRestore) {
//         // 2️⃣ Restore the stock
//         dispatch(
//           updateProductStockOptimistic({
//             productId: id,
//             sellingUnit: itemToRestore.selectedUnitId,
//             quantity: itemToRestore.selectedQty,
//             mode: "restore",
//           }),
//         );
//       }
//       dispatch(
//         removeFromCart({
//           productId: id,
//           unitId: unitId,
//         }),
//       );
//       // 3️⃣ Remove from cart
//     },
//     [dispatch, items], // Add items to dependency array
//   );

//   const handlePayment = async () => {
//     if (!user) return;
//     if (selectedUser?.creditLimit !== undefined) {
//       if (debtLimit > selectedUser.creditLimit && receivedAmount == 0) {
//         toast.error("⚠️ تجاوز العميل الحد الائتماني المسموح به");
//         return;
//       }
//     }
//     const calculatedChange =
//       receivedAmount >= totals.totalAfter
//         ? receivedAmount - totals.totalAfter
//         : 0;

//     const payment = {
//       cart: items,
//       discountValue,
//       discountType,
//       baseCurrency: company?.base_currency,
//       currency: currency?.id ?? company?.base_currency,
//       totalBeforeDiscount: totals.totalBefore,
//       totalDiscount: totals.discount,
//       totalAfterDiscount: totals.totalAfter,
//       cashierId: user.userId ?? "",
//       branchId: company?.branches[0].id,
//       customer: selectedUser,
//       saleNumber: nextnumber,
//       receivedAmount,
//       change: calculatedChange,
//       paidAt: new Date(),
//     };

//     setIsSubmitting(true);
//     if (totals.totalAfter > receivedAmount && !selectedUser?.id) {
//       toast("يرجى اختيار العميل");
//       setIsSubmitting(false);
//       return;
//     }
//     try {
//       await processSale(payment, user.companyId);
//       toast("✅ تم الدفع بنجاح!");

//       // Reset state
//       dispatch(clearCart());
//       setReceivedAmount(0);
//       dispatch(setDiscount({ type: "fixed", value: 0 }));
//       setDiscountsValue(0);

//       // // Generate new sale number
//       // const newSaleNumber = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
//       // setSaleNumber(newSaleNumber);

//       dispatch(removeCart(activeCartId ?? ""));

//       // Create new cart
//       const newCartId = Date.now().toString();
//       dispatch(
//         addCart({ id: newCartId, name: `Chart-${newCartId.slice(-3)}` }),
//       );
//       dispatch(setActiveCart(newCartId));
//     } catch (err: any) {
//       toast.error(`❌ حدث خطأ: ${err.message}`);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };
//   const [isLoading2, setIsLoading2] = useState(false);

//   if (!user) return null;

//   useEffect(() => {
//     if (company?.base_currency && !currency) {
//       // Find the currency object from your options that matches the base currency code
//       const base = currencyOptions.find((c) => c.id === company?.base_currency);
//       if (base) {
//         setCurrency(base);
//       } else {
//         // Fallback: create a temporary object if not found in options
//         setCurrency({
//           id: company?.base_currency,
//           name: company?.base_currency,
//         });
//       }
//     }
//   }, [company, currency]);
//   const calculatedChange =
//     receivedAmount >= totals.totalAfter
//       ? receivedAmount - totals.totalAfter
//       : 0;
//   const isCash = receivedAmount >= totals.totalAfter;
//   const canPay =
//     (isCash && receivedAmount >= totals.totalAfter) ||
//     (!isCash && selectedUser?.name);

//   return (
//     <div className="bg-accent flex h-[45hv] flex-col rounded-2xl p-2 shadow-xl/20 shadow-gray-500 lg:col-span-1">
//       {/* Header & Cart Tabs */}
//       <div className="flex items-center justify-center">
//         <Label className="">فرع: {company?.branches[0].location}</Label>
//       </div>

//       <div className="flex flex-wrap-reverse justify-between">
//         <div className="flex justify-between gap-1">
//           {" "}
//           <SearchInput
//             placeholder={"عمله البيع"}
//             paramKey="users"
//             value={currency?.id}
//             options={currencyOptions ?? []}
//             action={(user) => {
//               setCurrency(user); // now `user` is single UserOption
//             }}
//           />
//           <Button
//             className="rounded-[5px] bg-green-500 px-3 py-1 text-white"
//             onClick={() => {
//               const newCartId = Date.now().toString();
//               dispatch(
//                 addCart({
//                   id: newCartId,
//                   name: `Chart-${newCartId.slice(-5)}`,
//                 }),
//               );
//             }}
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
//         <div className="flex w-72 flex-row justify-end gap-2 sm:w-2xs md:w-sm">
//           <SearchInput
//             placeholder={tt("search_customer")}
//             paramKey="users"
//             options={users ?? []}
//             action={(user) => {
//               setSelectedUser(user); // now `user` is single UserOption
//             }}
//           />
//           <Button
//             disabled={isLoading2}
//             onClick={() => {
//               setIsLoading2(true);
//             }}
//             asChild
//           >
//             <Link
//               href={"/sells"}
//               className={`${isLoading2 ? "pointer-events-none" : ""}`}
//             >
//               {" "}
//               {isLoading2 && <Clock className="h-4 w-4 animate-spin" />}
//               {isLoading2 ? "جاري الفتح..." : " إرجاع المبيعات"}
//             </Link>
//           </Button>
//         </div>
//       </div>
//       <ScrollArea className="w-full py-2" dir="rtl">
//         <div className="grid max-h-20 w-full grid-cols-2 gap-5 md:grid-cols-4">
//           {carts.map((cart) => (
//             <CartTab
//               key={cart.id}
//               cart={cart}
//               isActive={cart.id === activeCartId}
//               onSelect={() => dispatch(setActiveCart(cart.id))}
//               onRemove={() => dispatch(removeCart(cart.id))}
//             />
//           ))}
//         </div>
//       </ScrollArea>
//       <div className="w-full">
//         <ScrollArea
//           className="h-[56vh] w-full rounded-2xl border border-amber-300 p-2"
//           dir="rtl"
//         >
//           <Table className="w-full">
//             <TableHeader className="sticky top-0 z-10">
//               <TableRow className="border-amber-300 shadow-xl/20 shadow-gray-900">
//                 <TableHead>#</TableHead>
//                 <TableHead className="text-center">{t("sku")}</TableHead>

//                 <TableHead className="text-start">{t("product")}</TableHead>
//                 <TableHead className="text-start">{t("warehouse")}</TableHead>
//                 <TableHead className="text-center">{t("quantity")}</TableHead>
//                 <TableHead className="text-center">{t("type")}</TableHead>

//                 <TableHead className="text-center">{t("price")}</TableHead>
//                 <TableHead>{t("total")}</TableHead>
//                 <TableHead>{t("actions")}</TableHead>
//               </TableRow>
//             </TableHeader>
//             <TableBody>
//               {items.length > 0 ? (
//                 items.map((item, index) => (
//                   <CartItemRow
//                     key={`${item.id}-${item.selectedUnitId}-${index}`}
//                     item={item}
//                     index={index}
//                     products={product}
//                     onUpdateQty={handleUpdateQty}
//                     onChangeUnit={handleChangeUnit}
//                     onRemove={handleRemoveItem}
//                     t={t}
//                   />
//                 ))
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
//       {/* Footer with Payment Button */}
//       <div
//         className="border-t border-gray-200 p-4 dark:border-gray-700"
//         dir="ltr"
//       >
//         <div className="flex w-full flex-col gap-4">
//           <div className="flex items-end justify-between">
//             {/* Discount controls */}
//             <div className="grid grid-cols-1 gap-1 md:grid-rows-3">
//               <div>
//                 {" "}
//                 {tt("customer")}: <Badge>{selectedUser?.name ?? ""}</Badge>
//               </div>
//               <div className="w-20"> {t("discount")}</div>
//               <div className="grid grid-rows-1 gap-2 md:grid-cols-3">
//                 <div className="">
//                   {" "}
//                   <Select
//                     value={discountType}
//                     onValueChange={(value: "fixed" | "percentage") => {
//                       dispatch(
//                         setDiscount({
//                           type: value,
//                           value: discountValue || 0,
//                         }),
//                       );
//                       setDiscountType(value);
//                     }}
//                   >
//                     <SelectTrigger className="rounded border px-2 py-1">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="fixed">{t("fixed")}</SelectItem>
//                       <SelectItem value="percentage">
//                         {t("percentage")}
//                       </SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//                 <div className="">
//                   <Input
//                     value={discountValue}
//                     onChange={(e) => {
//                       const val = Math.max(0, Number(e.target.value));
//                       dispatch(
//                         setDiscount({
//                           type: discountType ?? "fixed",
//                           value: val,
//                         }),
//                       );
//                       setDiscountsValue(val);
//                     }}
//                     className="w-20 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600"
//                     max={
//                       discountType === "percentage" ? 100 : totals.totalBefore
//                     }
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* Totals display */}
//             <div className="grid grid-cols-1 gap-1 text-right md:grid-rows-4">
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
//                   {totals.totalAfter.toFixed(2)}
//                 </span>
//               </div>
//               <div>
//                 <Input
//                   value={receivedAmount === 0 ? "" : receivedAmount}
//                   onChange={(e) => {
//                     const val = Number(e.target.value);
//                     setReceivedAmount(isNaN(val) ? 0 : val);
//                   }}
//                   placeholder="المبلغ المستلم"
//                   className="w-40 border-2 sm:w-2xs md:w-2xs lg:w-[200px]"
//                   type="number"
//                 />
//               </div>
//             </div>
//           </div>

//           {items.length > 0 && (
//             <div className="mt-4 flex flex-col gap-3 md:flex-row">
//               {isMobileUA ? (
//                 <PrintButton
//                   saleNumber={nextnumber}
//                   items={items.map((item) => ({
//                     ...item,
//                     unit_price:
//                       item.sellingUnits.find(
//                         (unit) => unit.id === item.selectedUnitId,
//                       )?.price || 0,
//                     sellingUnit:
//                       item.sellingUnits.find(
//                         (unit) => unit.id === item.selectedUnitId,
//                       )?.name || "",
//                     total: totals.totalAfter,
//                   }))}
//                   totals={totals}
//                   receivedAmount={receivedAmount}
//                   calculatedChange={calculatedChange}
//                   userName={user?.name}
//                   customerName={selectedUser?.name}
//                   customerDebt={selectedUser?.outstandingBalance}
//                   isCash={receivedAmount >= totals.totalAfter}
//                   t={tt}
//                   company={company}
//                 />
//               ) : (
//                 <Receipt
//                   saleNumber={nextnumber}
//                   items={items.map((item) => ({
//                     ...item,
//                     unit_price:
//                       item.sellingUnits.find(
//                         (unit) => unit.id === item.selectedUnitId,
//                       )?.price || 0,
//                     sellingUnit:
//                       item.sellingUnits.find(
//                         (unit) => unit.id === item.selectedUnitId,
//                       )?.name || "",
//                     total:
//                       item.selectedQty *
//                       (item.sellingUnits.find(
//                         (unit) => unit.id === item.selectedUnitId,
//                       )?.price || 0),
//                   }))}
//                   totals={totals}
//                   receivedAmount={receivedAmount}
//                   calculatedChange={calculatedChange}
//                   userName={user?.name}
//                   customerName={selectedUser?.name}
//                   customerDebt={selectedUser?.outstandingBalance}
//                   isCash={receivedAmount >= totals.totalAfter}
//                   t={tt}
//                   company={company} // ✅ new prop
//                 />
//               )}
//               <Button
//                 disabled={!canPay || isSubmitting || isLoadingSaleNumber}
//                 onClick={handlePayment}
//                 className={cn(
//                   "flex-1 rounded-md border-amber-500 py-3 text-amber-100 shadow-md",
//                   {
//                     "bg-green-600 hover:bg-green-700": canPay && !isSubmitting,
//                     "cursor-not-allowed bg-gray-400": !canPay || isSubmitting,
//                   },
//                 )}
//               >
//                 {isSubmitting ? "جاري الحفظ..." : tt("pay_now")}
//               </Button>

//               <Button
//                 onClick={() => {
//                   items.forEach((item) => {
//                     dispatch(
//                       updateProductStockOptimistic({
//                         productId: item.id,
//                         sellingUnit: item.selectedUnitId,
//                         quantity: item.selectedQty,
//                         mode: "restore",
//                       }),
//                     );
//                   });
//                   dispatch(clearCart());
//                   setDiscountsValue(0);
//                   setDiscountType("fixed");
//                 }}
//                 className="flex-1 rounded-md bg-red-500 py-3 text-white shadow-md transition-shadow hover:bg-red-600 hover:shadow-lg"
//               >
//                 إلغاء
//               </Button>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import {
  generateSaleNumber,
  getNextSaleNumber,
  processSale,
} from "@/lib/actions/cashier";
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
import { FormatPrice, useFormatter } from "@/hooks/usePrice";
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
import { ProductForSale, SellingUnit } from "@/lib/zod";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import dynamic from "next/dynamic";
import { useCompany } from "@/hooks/useCompany";
import Link from "next/link";
import { Clock } from "lucide-react";
import {
  CartItem,
  updateProductStockOptimistic,
} from "@/lib/slices/productsSlice";
import { currencyOptions } from "@/lib/actions/currnciesOptions";
import { getLatestExchangeRate } from "@/lib/actions/currency";

const PrintButton = dynamic(
  () => import("./test").then((mod) => mod.PrintButton),
  { ssr: false },
);
const CartItemRow = dynamic(
  () => import("./CartClient").then((mod) => mod.CartItemRow),
  { ssr: false },
);
const CartTab = dynamic(
  () => import("./CartClient").then((mod) => mod.CartTab),
  { ssr: false },
);
const Receipt = dynamic(
  () => import("@/components/common/receipt").then((mod) => mod.Receipt),
  { ssr: false },
);

export type discountType = "fixed" | "percentage";
type forsale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
  sellingUnits: SellingUnit[];
  availableStock: Record<string, number>;
};
interface UserOption {
  id?: string;
  name?: string;
  phoneNumber?: string | null;
  outstandingBalance?: number;
  preferred_currency?: string[];
  creditLimit?: number;
}

interface CustomDialogProps {
  users: UserOption[] | null;
  product: forsale[];
  nextnumber: string;
}
type company =
  | {
      id: string;
      name: string;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      country: string | null;
      logoUrl: string | null;
    }
  | undefined;

export default function CartDisplay({
  users,
  product,
  nextnumber,
}: CustomDialogProps) {
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  const t = useTranslations("cashier");
  const tt = useTranslations("payment");
  const [isLoading, setIsLoading] = useState(false);
  const { formatCurrency } = useFormatter();
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
  if (!user) return; // wait until user is loaded
  const { company } = useCompany();
  const cartItems =
    useAppSelector(
      (s) => s.cart.carts.find((c) => c.id === s.cart.activeCartId)?.items,
    ) ?? [];
  const [discountType, setDiscountType] = useState<discountType>("fixed");
  const [discountValue, setDiscountsValue] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [isLoadingSaleNumber, setIsLoadingSaleNumber] = useState(false);
  const [currency, setCurrency] = useState<UserOption | null>(null);

  const debtLimit = totals.totalAfter + (selectedUser?.outstandingBalance ?? 0);

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
      selectedUnitId: string,

      quantity: number,
      action: string,
    ) => {
      dispatch(updateQty({ id, selectedUnitId, quantity, action }));
    },
    [dispatch],
  );

  const handleChangeUnit = useCallback(
    (id: string, fromUnit: SellingUnit, toUnit: SellingUnit, item: any) => {
      // 1️⃣ التأكد من أن الوحدة الجديدة لا تسبب تكراراً مع سطر آخر موجود فعلاً
      const exits = items.find(
        (i) => i.id === id && i.selectedUnitId === toUnit.id,
      );

      if (exits) {
        toast.error("⚠️ هذه الوحدة مضافة بالفعل في السلة");
        return;
      }

      // 2️⃣ تغيير الوحدة: نرسل fromUnitId ليعرف الـ reducer أي سطر يغير تحديداً
      dispatch(
        changeSellingUnit({
          id,
          fromUnitId: item.selectedUnitId, // المعرف القديم للسطر
          toUnitId: toUnit.id, // المعرف الجديد للسطر
        }),
      );

      // 3️⃣ تحديث المخزون (Optimistic)
      // نرجع الكمية القديمة للمخزون
      dispatch(
        updateProductStockOptimistic({
          productId: id,
          sellingUnit: item.selectedUnitId,
          quantity: item.selectedQty,
          mode: "restore",
        }),
      );

      // نخصم الكمية الجديدة (1 لأن التغيير يعيد التعيين لـ 1 عادةً)
      dispatch(
        updateProductStockOptimistic({
          productId: id,
          sellingUnit: toUnit.id,
          quantity: 1,
          mode: "consume",
        }),
      );
    },
    [dispatch, items], // أضف items هنا لضمان عمل التحقق (exits) بشكل صحيح
  );

  const handleRemoveItem = useCallback(
    (id: string, unitId: string) => {
      // 1️⃣ Find the item in the current cart items before removing it
      const itemToRestore = items.find((item) => item.id === id);

      if (itemToRestore) {
        // 2️⃣ Restore the stock
        dispatch(
          updateProductStockOptimistic({
            productId: id,
            sellingUnit: itemToRestore.selectedUnitId,
            quantity: itemToRestore.selectedQty,
            mode: "restore",
          }),
        );
      }
      dispatch(
        removeFromCart({
          productId: id,
          unitId: unitId,
        }),
      );
      // 3️⃣ Remove from cart
    },
    [dispatch, items], // Add items to dependency array
  );
  const isForeign = currency?.id !== company?.base_currency;
  // const handlePayment = async () => {
  //   if (!user) return;
  //   if (selectedUser?.creditLimit !== undefined) {
  //     if (debtLimit > selectedUser.creditLimit && receivedAmount == 0) {
  //       toast.error("⚠️ تجاوز العميل الحد الائتماني المسموح به");
  //       return;
  //     }
  //   }
  //   const calculatedChange =
  //     receivedAmount >= totals.totalAfter
  //       ? receivedAmount - totals.totalAfter
  //       : 0;

  //   const payment = {
  //     cart: items,
  //     discountValue,
  //     discountType,
  //     baseCurrency: company?.base_currency,
  //     currency: currency?.id ?? company?.base_currency,
  //     totalBeforeDiscount: totals.totalBefore,
  //     totalDiscount: totals.discount,
  //     totalAfterDiscount: totals.totalAfter,
  //     cashierId: user.userId ?? "",
  //     branchId: company?.branches[0].id,
  //     customer: selectedUser,
  //     saleNumber: nextnumber,
  //     receivedAmount,
  //     baseAmount:isForeign?,
  //     change: calculatedChange,
  //     paidAt: new Date(),
  //   };

  //   setIsSubmitting(true);
  //   if (totals.totalAfter > receivedAmount && !selectedUser?.id) {
  //     toast("يرجى اختيار العميل");
  //     setIsSubmitting(false);
  //     return;
  //   }
  //   try {
  //     await processSale(payment, user.companyId);
  //     toast("✅ تم الدفع بنجاح!");

  //     // Reset state
  //     dispatch(clearCart());
  //     setReceivedAmount(0);
  //     dispatch(setDiscount({ type: "fixed", value: 0 }));
  //     setDiscountsValue(0);

  //     // // Generate new sale number
  //     // const newSaleNumber = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  //     // setSaleNumber(newSaleNumber);

  //     dispatch(removeCart(activeCartId ?? ""));

  //     // Create new cart
  //     const newCartId = Date.now().toString();
  //     dispatch(
  //       addCart({ id: newCartId, name: `Chart-${newCartId.slice(-3)}` }),
  //     );
  //     dispatch(setActiveCart(newCartId));
  //   } catch (err: any) {
  //     toast.error(`❌ حدث خطأ: ${err.message}`);
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };
  const handlePayment = async () => {
    if (!user) return;

    // التحقق من الحد الائتماني
    if (selectedUser?.creditLimit !== undefined) {
      if (debtLimit > selectedUser.creditLimit && receivedAmount === 0) {
        toast.error("⚠️ تجاوز العميل الحد الائتماني المسموح به");
        return;
      }
    }

    // 1. حساب القيمة المعادلة بالعملة المحلية (Base Amount)
    // إذا كانت العملة أجنبية، نحول المبلغ المستلم إلى العملة المحلية بناءً على سعر الصرف
    const baseAmount = isForeign
      ? exchangeRate > 1
        ? receivedAmount * exchangeRate // مثال: 10$ * 2000 = 20000 ريال
        : receivedAmount / exchangeRate // مثال: 10$ / 0.0005 = 20000 ريال
      : receivedAmount; // إذا كانت نفس العملة
    if (baseAmount > totals.totalAfter) {
      toast.error("⚠️المبلغ المدخل اكثر من الاجمالي");
      return;
    }
    // 2. حساب الفكة (Change) بالعملة التي دفع بها المستخدم
    const calculatedChange =
      receivedAmount >=
      (isForeign ? totals.totalAfter / exchangeRate : totals.totalAfter)
        ? receivedAmount -
          (isForeign ? totals.totalAfter / exchangeRate : totals.totalAfter)
        : 0;

    const payment = {
      cart: items,
      discountValue,
      discountType,
      baseCurrency: company?.base_currency,
      currency: currency?.id ?? company?.base_currency,
      totalBeforeDiscount: totals.totalBefore,
      totalDiscount: totals.discount,
      totalAfterDiscount: totals.totalAfter,
      cashierId: user.userId ?? "",
      branchId: company?.branches[0].id,
      customer: selectedUser,
      saleNumber: nextnumber,

      // المبالغ المطلوبة:
      receivedAmount, // المبلغ بالعملة الأجنبية (مثلاً 10$)
      baseAmount: Number(baseAmount.toFixed(4)), // المبلغ بالعملة المحلية (مثلاً 20,000 ريال)
      exchangeRate: exchangeRate, // تخزين سعر الصرف وقت البيع للرجوع إليه لاحقاً

      change: calculatedChange,
      paidAt: new Date(),
    };

    setIsSubmitting(true);

    // التحقق من اختيار العميل في حالة الدفع الآجل (إذا كان المبلغ المدفوع أقل من الإجمالي)
    if (totals.totalAfter > baseAmount + 0.1 && !selectedUser?.id) {
      toast.error("يرجى اختيار العميل للبيع الآجل");
      setIsSubmitting(false);
      return;
    }

    try {
      await processSale(payment, user.companyId);
      toast.success("✅ تم الدفع بنجاح!");

      // إعادة ضبط الحالة
      dispatch(clearCart());
      setReceivedAmount(0);
      dispatch(setDiscount({ type: "fixed", value: 0 }));
      setDiscountsValue(0);
      dispatch(removeCart(activeCartId ?? ""));

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
  };
  const [isLoading2, setIsLoading2] = useState(false);

  if (!user) return null;
  const [exchangeRate, setExchangeRate] = useState(1);

  // 1️⃣ أثر تغيير العملة: جلب سعر الصرف وحساب المبلغ
  // 1️⃣ أثر تغيير العملة: جلب سعر الصرف وحساب المبلغ

  useEffect(() => {
    async function updateRate() {
      if (!user?.companyId || !currency?.id || !company?.base_currency) return;

      // إذا كانت العملة المختارة هي نفس العملة الأساسية
      if (currency.id === company.base_currency) {
        setExchangeRate(1);
        setReceivedAmount(Number(totals.totalAfter.toFixed(4)));
        return;
      }

      setIsLoading(true);
      try {
        const rateData = await getLatestExchangeRate({
          fromCurrency: company.base_currency,
          toCurrency: currency.id,
        });

        if (rateData && rateData.rate) {
          const rateValue = Number(rateData.rate);
          setExchangeRate(rateValue);

          /**
           * منطق التحويل الذكي:
           * إذا كان السعر > 1 (مثلاً 2000 ريال للدولار الواحد) -> نقسم الإجمالي بالريال على السعر لنحصل على الدولار.
           * إذا كان السعر < 1 (مثلاً 0.0005 دولار للريال الواحد) -> نضرب الإجمالي بالريال في السعر لنحصل على الدولار.
           */
          let autoAmount;
          if (rateValue > 1) {
            autoAmount = totals.totalAfter / rateValue;
          } else {
            autoAmount = totals.totalAfter * rateValue;
          }

          setReceivedAmount(Number(autoAmount.toFixed(4)));
        }
      } catch (error) {
        toast.error("خطأ في جلب سعر الصرف");
      } finally {
        setIsLoading(false);
      }
    }

    updateRate();
  }, [
    currency?.id,
    totals.totalAfter,
    user?.companyId,
    company?.base_currency,
  ]);
  useEffect(() => {
    if (company?.base_currency && !currency) {
      // Find the currency object from your options that matches the base currency code
      const base = currencyOptions.find((c) => c.id === company?.base_currency);
      if (base) {
        setCurrency(base);
      } else {
        // Fallback: create a temporary object if not found in options
        setCurrency({
          id: company?.base_currency,
          name: company?.base_currency,
        });
      }
    }
  }, [company, currency]);
  const calculatedChange =
    receivedAmount >= totals.totalAfter
      ? receivedAmount - totals.totalAfter
      : 0;
  const isCash = receivedAmount >= totals.totalAfter;
  // const canPay =
  //   (isCash && receivedAmount >= totals.totalAfter) ||
  //   (!isCash && selectedUser?.name);
  // إذا كانت عملة أجنبية، نتحقق أن المبلغ المستلم (بالعملة الأجنبية) مضروباً في السعر يغطي الإجمالي المحلي
  const receivedInBaseCurrency = isForeign
    ? exchangeRate > 1
      ? receivedAmount * exchangeRate
      : receivedAmount / exchangeRate
    : receivedAmount;

  const canPay =
    (receivedAmount > 0 &&
      receivedInBaseCurrency >= totals.totalAfter - 0.01) ||
    (selectedUser?.id && receivedInBaseCurrency < totals.totalAfter);
  return (
    <div className="bg-accent flex h-[45hv] flex-col rounded-2xl p-2 shadow-xl/20 shadow-gray-500 lg:col-span-1">
      {/* Header & Cart Tabs */}
      <div className="flex items-center justify-center">
        <Label className="">فرع: {company?.branches[0].location}</Label>
      </div>

      <div className="flex flex-wrap-reverse justify-between">
        <div className="flex justify-between gap-1">
          {" "}
          <SearchInput
            placeholder={"عمله البيع"}
            paramKey="users"
            value={currency?.id}
            options={currencyOptions ?? []}
            action={(user) => {
              setCurrency(user); // now `user` is single UserOption
            }}
          />
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
        <div className="flex w-72 flex-row justify-end gap-2 sm:w-2xs md:w-sm">
          <SearchInput
            placeholder={tt("search_customer")}
            paramKey="users"
            options={users ?? []}
            action={(user) => {
              setSelectedUser(user); // now `user` is single UserOption
            }}
          />
          <Button
            disabled={isLoading2}
            onClick={() => {
              setIsLoading2(true);
            }}
            asChild
          >
            <Link
              href={"/sells"}
              className={`${isLoading2 ? "pointer-events-none" : ""}`}
            >
              {" "}
              {isLoading2 && <Clock className="h-4 w-4 animate-spin" />}
              {isLoading2 ? "جاري الفتح..." : " إرجاع المبيعات"}
            </Link>
          </Button>
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
                <TableHead className="text-center">{t("sku")}</TableHead>

                <TableHead className="text-start">{t("product")}</TableHead>
                <TableHead className="text-start">{t("warehouse")}</TableHead>
                <TableHead className="text-center">{t("quantity")}</TableHead>
                <TableHead className="text-center">{t("type")}</TableHead>

                <TableHead className="text-center">{t("price")}</TableHead>
                <TableHead>{t("total")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item, index) => (
                  <CartItemRow
                    key={`${item.id}-${item.selectedUnitId}-${index}`}
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
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        {" "}
        <div className="grid grid-cols-1 gap-1 text-right md:grid-cols-4">
          <div className="grid grid-cols-1 gap-4">
            {" "}
            <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t("beforeDiscount")}
            </Label>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              {FormatPrice(totals.totalBefore)}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {t("discountValue")}
            </Label>
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              {totals.discount.toFixed(3)}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {" "}
            <Label className="text-lg font-bold text-gray-800 dark:text-gray-200">
              {t("total")}
            </Label>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
              {totals.totalAfter.toFixed(4)}
            </span>
          </div>
          <div className="space-y-1">
            <Input
              value={receivedAmount === 0 ? "" : receivedAmount}
              onChange={(e) => {
                const val = Number(e.target.value);
                setReceivedAmount(isNaN(val) ? 0 : val);
              }}
              placeholder={`المبلغ بـ ${currency?.id || "..."}`}
              className="w-40 border-2 border-amber-400 sm:w-3xs md:w-3xs lg:w-[200px]"
              type="number"
            />

            {/* 3️⃣ تحسين عرض التوضيح تحت خانة المبلغ */}
            {isForeign && receivedAmount > 0 && (
              <div className="mt-1 text-right text-[10px] font-bold text-amber-700">
                {/* المطلوب بالعملة المختارة لمساعدة الكاشير */}
                المطلوب بالـ {currency?.id}:
                <span className="mx-1">
                  {exchangeRate > 1
                    ? (totals.totalAfter / exchangeRate).toFixed(4)
                    : (totals.totalAfter * exchangeRate).toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Discount controls */}
          <div>
            {" "}
            {tt("customer")}: <Badge>{selectedUser?.name ?? ""}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3">
            <div className="w-20"> {t("discount")}</div>
            <div className="">
              {" "}
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
                  <SelectItem value="percentage">{t("percentage")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="">
              <Input
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
                className="w-20 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600"
                max={discountType === "percentage" ? 100 : totals.totalBefore}
              />
            </div>
          </div>

          {/* Totals display */}
        </div>
        <div className="flex w-full flex-col gap-4">
          {items.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              {isMobileUA ? (
                <PrintButton
                  saleNumber={nextnumber}
                  items={items.map((item) => ({
                    ...item,
                    unit_price:
                      item.sellingUnits.find(
                        (unit) => unit.id === item.selectedUnitId,
                      )?.price || 0,
                    sellingUnit:
                      item.sellingUnits.find(
                        (unit) => unit.id === item.selectedUnitId,
                      )?.name || "",
                    total: totals.totalAfter,
                  }))}
                  totals={totals}
                  receivedAmount={receivedAmount}
                  calculatedChange={calculatedChange}
                  userName={user?.name}
                  customerName={selectedUser?.name}
                  customerDebt={selectedUser?.outstandingBalance}
                  isCash={receivedAmount >= totals.totalAfter}
                  t={tt}
                  company={company}
                />
              ) : (
                <Receipt
                  saleNumber={nextnumber}
                  items={items.map((item) => ({
                    ...item,
                    unit_price:
                      item.sellingUnits.find(
                        (unit) => unit.id === item.selectedUnitId,
                      )?.price || 0,
                    sellingUnit:
                      item.sellingUnits.find(
                        (unit) => unit.id === item.selectedUnitId,
                      )?.name || "",
                    total:
                      item.selectedQty *
                      (item.sellingUnits.find(
                        (unit) => unit.id === item.selectedUnitId,
                      )?.price || 0),
                  }))}
                  totals={totals}
                  receivedAmount={receivedAmount}
                  calculatedChange={calculatedChange}
                  userName={user?.name}
                  customerName={selectedUser?.name}
                  customerDebt={selectedUser?.outstandingBalance}
                  isCash={receivedAmount >= totals.totalAfter}
                  t={tt}
                  company={company} // ✅ new prop
                />
              )}
              <Button
                disabled={!canPay || isSubmitting || isLoadingSaleNumber}
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
                  items.forEach((item) => {
                    dispatch(
                      updateProductStockOptimistic({
                        productId: item.id,
                        sellingUnit: item.selectedUnitId,
                        quantity: item.selectedQty,
                        mode: "restore",
                      }),
                    );
                  });
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
