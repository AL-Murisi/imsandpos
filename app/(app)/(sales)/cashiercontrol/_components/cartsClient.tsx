"use client";

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
import { processSale } from "@/lib/actions/cashier";
import { useAuth } from "@/lib/context/AuthContext";
import { selectActiveCartItems, selectCartTotals } from "@/lib/selectors";
import {
  addCart,
  changeSellingUnit,
  clearAllCart,
  clearCart,
  hydrateCartState,
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

import { useCompany } from "@/hooks/useCompany";
import { getLatestExchangeRate } from "@/lib/actions/currency";
import {
  fallbackCurrencyOptions,
  UserOption,
} from "@/lib/actions/currnciesOptions";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";
import {
  setProductsLocal,
  updateProductStockOptimistic,
} from "@/lib/slices/productsSlice";
import { Clock } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  enqueueOfflineOperation,
  getOfflineCache,
  offlineCacheKeys,
  setOfflineCache,
} from "@/lib/offline/db";
import { syncPendingOfflineOperations } from "@/lib/offline/sync";
import DisbursementOrderButton from "./DisbursementOrderButton";

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

  barcode: string;
  sellingUnits: SellingUnit[];
  availableStock: Record<string, number>;
};

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
  const cartState = useAppSelector((state) => state.cart);
  const persistedProducts = useAppSelector((state) => state.products.products);
  // const products = useAppSelector(selectAvailableStock);
  const userAgent =
    typeof window !== "undefined" ? navigator.userAgent.toLowerCase() : "";
  const isMobileUA =
    /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
      userAgent,
    );
  // Local state
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
  const [manualCustomerName, setManualCustomerName] = useState("");
  const [isLoadingSaleNumber, setIsLoadingSaleNumber] = useState(false);
  const [currency, setCurrency] = useState<UserOption | null>(null);
  const { options } = useCurrencyOptions();
  const currencyOptions = options.length ? options : fallbackCurrencyOptions;
  const [offlineSession, setOfflineSession] = useState<{
    cashierId: string;
    companyId: string;
    branchId: string;
    currency: string;
    baseCurrency: string;
  } | null>(null);

  const effectiveCompanyId = user?.companyId ?? offlineSession?.companyId ?? "";
  const effectiveCashierId = user?.userId ?? offlineSession?.cashierId ?? "";
  const effectiveBranchId =
    company?.branches?.[0]?.id ?? offlineSession?.branchId ?? "";
  const effectiveBaseCurrency =
    company?.base_currency ?? offlineSession?.baseCurrency ?? "";
  const effectiveCurrency =
    currency?.id ?? company?.base_currency ?? offlineSession?.currency ?? "";

  const debtLimit = totals.totalAfter + (selectedUser?.outstandingBalance ?? 0);
  const effectiveCustomerName =
    selectedUser?.name || manualCustomerName.trim() || undefined;

  const hasAddedCart = useRef(false);
  const hasHydratedOfflineState = useRef(false);

  useEffect(() => {
    const loadOfflineSession = async () => {
      const cached = await getOfflineCache<{
        cashierId: string;
        companyId: string;
        branchId: string;
        currency: string;
        baseCurrency: string;
      }>(offlineCacheKeys.cashierSession);
      if (cached) setOfflineSession(cached);
    };
    void loadOfflineSession();
  }, []);

  useEffect(() => {
    const hydrateOfflineState = async () => {
      if (!effectiveCompanyId || hasHydratedOfflineState.current) return;
      const cached = await getOfflineCache<{
        cartState?: {
          carts: any[];
          activeCartId: string | null;
          discountType: "fixed" | "percentage";
          discountValue: number;
        };
        products?: forsale[];
      }>(offlineCacheKeys.cashierUiState(effectiveCompanyId));

      if (cached?.cartState && cached.cartState.carts?.length) {
        dispatch(hydrateCartState(cached.cartState));
      }
      if (cached?.products?.length) {
        dispatch(setProductsLocal(cached.products));
      }
      hasHydratedOfflineState.current = true;
    };

    void hydrateOfflineState();
  }, [dispatch, effectiveCompanyId]);

  useEffect(() => {
    const persistOfflineState = async () => {
      if (!effectiveCompanyId) return;
      await setOfflineCache(
        offlineCacheKeys.cashierUiState(effectiveCompanyId),
        {
          cartState: {
            carts: cartState.carts,
            activeCartId: cartState.activeCartId ?? null,
            discountType: cartState.discountType,
            discountValue: cartState.discountValue,
          },
          products: persistedProducts,
        },
      );
    };
    void persistOfflineState();
  }, [effectiveCompanyId, cartState, persistedProducts]);

  useEffect(() => {
    const persistOfflineSession = async () => {
      if (!effectiveCashierId || !effectiveCompanyId || !effectiveBranchId)
        return;
      await setOfflineCache(offlineCacheKeys.cashierSession, {
        cashierId: effectiveCashierId,
        companyId: effectiveCompanyId,
        branchId: effectiveBranchId,
        currency: effectiveCurrency || effectiveBaseCurrency,
        baseCurrency: effectiveBaseCurrency || effectiveCurrency,
      });
    };
    void persistOfflineSession();
  }, [
    effectiveCashierId,
    effectiveCompanyId,
    effectiveBranchId,
    effectiveCurrency,
    effectiveBaseCurrency,
  ]);

  useEffect(() => {
    if (hasAddedCart.current) return;
    if (!activeCartId) {
      const newCartId = Date.now().toString();
      dispatch(addCart({ id: newCartId, name: `Cart-${newCartId.slice(-3)}` }));
    }
    hasAddedCart.current = true;
  }, [activeCartId, dispatch]);

  // 🚀 Memoized callbacks
  const handleUpdateQty = useCallback(
    (
      id: string,
      selectedUnitId: string,
      warehouseId: string,
      quantity: number,
      action: string,
    ) => {
      // derive warehouseId from current items
      const current = items.find(
        (it) => it.id === id && it.selectedUnitId === selectedUnitId,
      );
      dispatch(
        updateQty({ id, selectedUnitId, quantity, action, warehouseId } as any),
      );
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
          warehouseId: item.warehouseId,
        } as any),
      );

      // 3️⃣ تحديث المخزون (Optimistic)
      // نرجع الكمية القديمة للمخزون
      dispatch(
        updateProductStockOptimistic({
          productId: id,
          warehouseId: item.warehouseId,
          sellingUnit: item.selectedUnitId,
          quantity: item.selectedQty,
          mode: "restore",
        }),
      );

      // نخصم الكمية الجديدة (1 لأن التغيير يعيد التعيين لـ 1 عادةً)
      dispatch(
        updateProductStockOptimistic({
          productId: id,
          warehouseId: item.warehouseId,
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
      const itemToRestore = items.find(
        (item) => item.id === id && item.selectedUnitId === unitId,
      );

      if (itemToRestore) {
        // 2️⃣ Restore the stock
        dispatch(
          updateProductStockOptimistic({
            productId: id,
            warehouseId: itemToRestore.warehouseId,
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
          warehouseId: itemToRestore?.warehouseId,
        }),
      );
      // 3️⃣ Remove from cart
    },
    [dispatch, items], // Add items to dependency array
  );
  const isForeign = currency?.id !== company?.base_currency;

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
      baseCurrency: effectiveBaseCurrency,
      currency: effectiveCurrency,
      totalBeforeDiscount: totals.totalBefore,
      totalDiscount: totals.discount,
      totalAfterDiscount: totals.totalAfter,
      cashierId: effectiveCashierId,
      branchId: effectiveBranchId,
      customer: selectedUser,
      guestCustomerName: selectedUser?.id ? undefined : effectiveCustomerName,
      saleNumber: nextnumber || `OFFLINE-${Date.now()}`,

      // المبالغ المطلوبة:
      receivedAmount, // المبلغ بالعملة الأجنبية (مثلاً 10$)
      baseAmount: Number(baseAmount.toFixed(4)), // المبلغ بالعملة المحلية (مثلاً 20,000 ريال)
      exchangeRate: exchangeRate, // تخزين سعر الصرف وقت البيع للرجوع إليه لاحقاً

      change: calculatedChange,
      paidAt: new Date(),
    };

    setIsSubmitting(true);

    if (!effectiveCompanyId || !effectiveCashierId || !effectiveBranchId) {
      toast.error("Offline session is missing cashier/company/branch data");
      setIsSubmitting(false);
      return;
    }

    // التحقق من اختيار العميل في حالة الدفع الآجل (إذا كان المبلغ المدفوع أقل من الإجمالي)
    if (totals.totalAfter > baseAmount + 0.1 && !selectedUser?.id) {
      toast.error("يرجى اختيار العميل للبيع الآجل");
      setIsSubmitting(false);
      return;
    }

    const resetCartAfterSubmit = () => {
      dispatch(clearCart());
      setReceivedAmount(0);
      setManualCustomerName("");
      setSelectedUser(null);
      dispatch(setDiscount({ type: "fixed", value: 0 }));
      setDiscountsValue(0);
      dispatch(removeCart(activeCartId ?? ""));
      const newCartId = Date.now().toString();
      dispatch(
        addCart({ id: newCartId, name: `Chart-${newCartId.slice(-3)}` }),
      );
      dispatch(setActiveCart(newCartId));
    };

    try {
      if (!navigator.onLine) {
        await enqueueOfflineOperation({
          operationType: "processSale",
          companyId: effectiveCompanyId,
          payload: payment,
        });
        toast.info("تم حفظ العملية محليًا وسيتم مزامنتها عند عودة الإنترنت");
        resetCartAfterSubmit();
        return;
      }

      await processSale(payment, effectiveCompanyId);
      toast.success("✅ تم الدفع بنجاح!");
      resetCartAfterSubmit();
      void syncPendingOfflineOperations();
    } catch (err: any) {
      if (!navigator.onLine) {
        await enqueueOfflineOperation({
          operationType: "processSale",
          companyId: effectiveCompanyId,
          payload: payment,
        });
        toast.info("تم حفظ العملية محليًا بسبب انقطاع الإنترنت");
        resetCartAfterSubmit();
      } else {
        toast.error(`❌ حدث خطأ: ${err.message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const [isLoading2, setIsLoading2] = useState(false);

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
  // Update currency based on selected customer's profile (JSON array)
  useEffect(() => {
    if (
      selectedUser &&
      selectedUser.preferred_currency &&
      selectedUser.preferred_currency.length > 0
    ) {
      // Take the first currency from the user's JSON array
      const userPrefSymbol = selectedUser.preferred_currency[0];

      // Find the full object from your currencyOptions list
      const preferred = currencyOptions.find((c) => c.id === userPrefSymbol);

      if (preferred) {
        setCurrency(preferred);
      } else {
        // Fallback: Create the object manually if not found in options
        setCurrency({
          id: userPrefSymbol,
          name: userPrefSymbol,
        });
      }
    } else if (company?.base_currency) {
      // If no customer or no preference, revert to company base
      const base = currencyOptions.find((c) => c.id === company.base_currency);
      if (base) setCurrency(base);
    }
  }, [selectedUser, company?.base_currency, currencyOptions]);
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
  // Filter the available currencies based on the selected user's preferences
  const filteredCurrencyOptions =
    selectedUser &&
    selectedUser.preferred_currency &&
    selectedUser.preferred_currency.length > 0
      ? currencyOptions.filter((option) =>
          selectedUser?.preferred_currency?.includes(option.id),
        )
      : currencyOptions; // If no user, show all or default to company base options
  const canPay =
    (receivedAmount > 0 &&
      receivedInBaseCurrency >= totals.totalAfter - 0.01) ||
    (selectedUser?.id && receivedInBaseCurrency < totals.totalAfter);
  return (
    <div className="bg-accent flex h-[45hv] flex-col rounded-2xl p-2 shadow-xl/20 shadow-gray-500 lg:col-span-1">
      <div className="flex items-center justify-center">
        <Label className="">فرع: {company?.branches[0]?.location ?? ""}</Label>
      </div>

      <div className="flex flex-wrap-reverse justify-between gap-4">
        <div className="flex justify-between gap-1">
          {" "}
          <SearchInput
            placeholder={"عمله البيع"}
            paramKey=""
            value={currency?.id}
            options={filteredCurrencyOptions ?? []}
            action={(currency) => {
              setCurrency(currency); // now `user` is single UserOption
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
              if (user?.id) {
                setManualCustomerName("");
              }
            }}
          />
          <Input
            value={manualCustomerName}
            onChange={(e) => {
              setManualCustomerName(e.target.value);
              if (selectedUser?.id) {
                setSelectedUser(null);
              }
            }}
            placeholder="اسم عميل غير مسجل"
            className="w-40"
          />
          {/* <Button
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
          </Button> */}
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
            {tt("customer")}: <Badge>{effectiveCustomerName ?? ""}</Badge>
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
                  customerName={effectiveCustomerName}
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
                  customerName={effectiveCustomerName}
                  customerDebt={selectedUser?.outstandingBalance}
                  isCash={receivedAmount >= totals.totalAfter}
                  t={tt}
                  company={company} // ✅ new prop
                />
              )}
              <DisbursementOrderButton
                items={items.map((item) => ({
                  id: item.id,
                  name: item.name,
                  warehousename: item.warehousename,
                  warehouseName: item.warehousename,
                  selectedQty: item.selectedQty,
                  sellingUnit:
                    item.sellingUnits.find(
                      (unit) => unit.id === item.selectedUnitId,
                    )?.name || "",
                  selectedUnitName: item.selectedUnitName,
                  sku: item.sku,
                }))}
                saleNumber={nextnumber}
                cashierName={user?.name ?? ""}
              />
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
                        warehouseId: item.warehouseId,
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
