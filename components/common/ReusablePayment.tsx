// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { SelectField } from "@/components/common/selectproduct";
// import { fetchPayments, getLatestExchangeRate } from "@/lib/actions/banks";
// import { toast } from "sonner";
// import { useCompany } from "@/hooks/useCompany";

// type Account = {
//   id: string;
//   name: string;
//   currency: string | null;
// };

// export type PaymentState = {
//   paymentMethod: "cash" | "bank" | "";
//   accountId: string;
//   accountCurrency: string;
//   amountBase: number;
//   amountFC?: number;
//   exchangeRate?: number;
//   transferNumber?: string;
// };

// export function ReusablePayment({
//   value,
//   action,
//   accounts,
// }: {
//   value: PaymentState;
//   accounts: Account[];
//   action: (v: PaymentState) => void;
// }) {
//   //   const [accounts, setAccounts] = useState<Account[]>([]);
//   const { company } = useCompany();
//   if (!company) {
//     return;
//   }
//   const baseCurrency = company.base_currency ?? "YER";
//   const selectedAccount = accounts.find((a) => a.id === value.accountId);
//   const accountCurrency = selectedAccount?.currency ?? "";
//   const isForeign = accountCurrency !== baseCurrency;

//   /* ───────── Fetch accounts ───────── */
//   //   useEffect(() => {
//   //     if (!value.paymentMethod) return;

//   //     async function load() {
//   //       try {
//   //         const { banks, cashAccounts } = await fetchPayments();
//   //         setAccounts(value.paymentMethod === "bank" ? banks : cashAccounts);
//   //       } catch {
//   //         toast.error("فشل تحميل الحسابات");
//   //       }
//   //     }
//   //     load();
//   //   }, [value.paymentMethod]);

//   /* ───────── Currency sync ───────── */
//   const companyId = company.id;
//   useEffect(() => {
//     if (!companyId) return;
//     if (!value.accountId) return;
//     if (!accountCurrency) return;
//     if (accountCurrency === baseCurrency) return;

//     async function loadRate() {
//       try {
//         const rateRow = await getLatestExchangeRate({
//           companyId,
//           fromCurrency: accountCurrency,
//           toCurrency: baseCurrency,
//         });

//         if (!rateRow) {
//           toast.error("لا يوجد سعر صرف لهذه العملة");
//           return;
//         }

//         action({
//           ...value,
//           exchangeRate: Number(rateRow.rate),
//           accountCurrency,
//         });
//       } catch {
//         toast.error("فشل تحميل سعر الصرف");
//       }
//     }

//     loadRate();
//   }, [value.accountId, accountCurrency]);

//   useEffect(() => {
//     if (!isForeign || !value.exchangeRate) return;
//     action({
//       ...value,
//       accountCurrency,
//       amountBase: value.amountFC! * value.exchangeRate,
//     });
//   }, [value.amountFC, value.exchangeRate]);

//   useEffect(() => {
//     if (!isForeign || !value.exchangeRate) return;
//     action({
//       ...value,
//       accountCurrency,
//       amountFC: value.amountBase / value.exchangeRate,
//     });
//   }, [value.amountBase]);
//   const getCurrencyNameAr = (currency: string) => {
//     switch (currency?.toLowerCase()) {
//       case "usd":
//         return "دولار أمريكي";
//       case "yer":
//         return "ريال يمني";
//       case "sar":
//         return "ريال سعودي";
//       default:
//         return currency || "";
//     }
//   };

//   const baseCurrencyAr = getCurrencyNameAr(baseCurrency);
//   const accountCurrencyAr = getCurrencyNameAr(accountCurrency);
//   /* ───────── UI ───────── */
//   return (
//     <div className="mt-6 grid grid-cols-1 gap-4 sm:items-center sm:justify-between md:grid-cols-2">
//       {/* Payment method */}
//       <div className="grid gap-4">
//         <Label>طريقة الدفع</Label>
//         <SelectField
//           options={[
//             { id: "cash", name: "نقداً" },
//             { id: "bank", name: "تحويل بنكي" },
//           ]}
//           value={value.paymentMethod}
//           placeholder="اختر الطريقة"
//           action={(v) =>
//             action({
//               paymentMethod: v as any,
//               accountId: "",
//               accountCurrency: baseCurrency,
//               amountBase: 0,
//             })
//           }
//         />
//       </div>

//       {/* Account */}
//       {value.paymentMethod && (
//         <div className="grid gap-4">
//           <Label>{value.paymentMethod === "bank" ? "البنك" : "الصندوق"}</Label>
//           <SelectField
//             options={accounts}
//             value={value.accountId}
//             placeholder="اختر الحساب"
//             action={(id) =>
//               action({
//                 ...value,
//                 accountId: id,
//                 accountCurrency:
//                   accounts.find((a) => a.id === id)?.currency ?? baseCurrency,
//               })
//             }
//           />
//         </div>
//       )}

//       {/* Transfer number */}
//       {value.paymentMethod === "bank" && (
//         <div className="grid gap-4">
//           <Label>رقم التحويل</Label>
//           <Input
//             value={value.transferNumber || ""}
//             onChange={(e) =>
//               action({ ...value, transferNumber: e.target.value })
//             }
//           />
//         </div>
//       )}

//       {/* Base amount */}
//       <div className="grid gap-4">
//         <Label>المبلغ المستلم بـ ({baseCurrencyAr})</Label>
//         <Input
//           type="number"
//           value={value.amountBase}
//           onChange={(e) =>
//             action({ ...value, amountBase: +e.target.value || 0 })
//           }
//         />
//       </div>

//       {/* FX Section */}
//       {isForeign && value.accountId !== "" && (
//         <>
//           <div className="grid gap-4">
//             <Label>
//               سعر الصرف ({accountCurrencyAr} ← {baseCurrencyAr})
//             </Label>
//             <Input
//               type="number"
//               value={value.exchangeRate || ""}
//               onChange={(e) =>
//                 action({ ...value, exchangeRate: +e.target.value || 0 })
//               }
//             />
//             <p className="text-muted-foreground text-xs">
//               تم جلب السعر تلقائيًا، يمكنك تعديله يدويًا
//             </p>
//           </div>

//           <div className="grid gap-4">
//             <Label>المبلغ المستلم بـ ({accountCurrencyAr})</Label>
//             <Input
//               type="number"
//               value={value.amountFC || ""}
//               onChange={(e) =>
//                 action({ ...value, amountFC: +e.target.value || 0 })
//               }
//             />
//           </div>
//         </>
//       )}
//     </div>
//   );
// }
"use client";

import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/common/selectproduct";
import { getLatestExchangeRate } from "@/lib/actions/banks";
import { toast } from "sonner";
import { useCompany } from "@/hooks/useCompany";

// Updated currency options constant
const CURRENCY_OPTIONS = [
  { id: "YER", name: "ريال يمني" },
  { id: "USD", name: "دولار أمريكي" },
  { id: "SAR", name: "ريال سعودي" },
];

type Account = {
  id: string;
  name: string;
};

export type PaymentState = {
  paymentMethod: "cash" | "bank" | "";
  accountId: string;
  selectedCurrency: string; // New field
  amountBase: number;
  amountFC?: number;
  exchangeRate?: number;
  transferNumber?: string;
};

export function ReusablePayment({
  value,
  action,
  accounts,
}: {
  value: PaymentState;
  accounts: Account[];
  action: (v: PaymentState) => void;
}) {
  const { company } = useCompany();
  if (!company) return null;

  const baseCurrency = company.base_currency ?? "YER";
  const isForeign =
    value.selectedCurrency !== baseCurrency && value.selectedCurrency !== "";
  const companyId = company.id;

  /* ───────── Fetch Exchange Rate ───────── */
  useEffect(() => {
    if (!company.id || !value.selectedCurrency || !isForeign) {
      // Reset rate and FC if not foreign
      if (!isForeign && value.exchangeRate !== 1) {
        action({ ...value, exchangeRate: 1, amountFC: value.amountBase });
      }
      return;
    }

    async function loadRate() {
      try {
        const rateRow = await getLatestExchangeRate({
          companyId,
          fromCurrency: value.selectedCurrency,
          toCurrency: baseCurrency,
        });

        if (!rateRow) {
          toast.error("لا يوجد سعر صرف لهذه العملة");
          return;
        }

        action({
          ...value,
          exchangeRate: Number(rateRow.rate),
        });
      } catch {
        toast.error("فشل تحميل سعر الصرف");
      }
    }

    loadRate();
  }, [value.selectedCurrency, company.id]);

  /* ───────── Math Sync ───────── */
  // Sync Base from FC
  const handleFCChange = (fc: number) => {
    const rate = value.exchangeRate || 1;
    action({
      ...value,
      amountFC: fc,
      amountBase: Number((fc * rate).toFixed(2)),
    });
  };

  // Sync FC from Base
  const handleBaseChange = (base: number) => {
    const rate = value.exchangeRate || 1;
    action({
      ...value,
      amountBase: base,
      amountFC: isForeign ? Number((base / rate).toFixed(2)) : base,
    });
  };

  const getCurrencyNameAr = (code: string) =>
    CURRENCY_OPTIONS.find((c) => c.id === code)?.name || code;

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* 1. Payment Method */}
      <div className="grid gap-2">
        <Label>طريقة الدفع</Label>
        <SelectField
          options={[
            { id: "cash", name: "نقداً" },
            { id: "bank", name: "تحويل بنكي" },
          ]}
          value={value.paymentMethod}
          placeholder="اختر الطريقة"
          action={(v) =>
            action({
              ...value,
              paymentMethod: v as any,
              accountId: "", // Reset account on method change
            })
          }
        />
      </div>

      {/* 2. Currency Selection (Always ask preference) */}
      <div className="grid gap-2">
        <Label>عملة الدفع</Label>
        <SelectField
          options={CURRENCY_OPTIONS}
          value={value.selectedCurrency}
          placeholder="اختر العملة"
          action={(curr) =>
            action({
              ...value,
              selectedCurrency: curr,
              exchangeRate: curr === baseCurrency ? 1 : value.exchangeRate,
            })
          }
        />
      </div>

      {/* 3. Account Selection */}
      {value.paymentMethod && (
        <div className="grid gap-2">
          <Label>
            {value.paymentMethod === "bank"
              ? "البنك المستلم"
              : "الصندوق المستلم"}
          </Label>
          <SelectField
            options={accounts}
            value={value.accountId}
            placeholder="اختر الحساب"
            action={(id) => action({ ...value, accountId: id })}
          />
        </div>
      )}

      {/* 4. Transfer Number */}
      {value.paymentMethod === "bank" && (
        <div className="grid gap-2">
          <Label>رقم الإشعار / التحويل</Label>
          <Input
            value={value.transferNumber || ""}
            onChange={(e) =>
              action({ ...value, transferNumber: e.target.value })
            }
          />
        </div>
      )}

      <div className="col-span-full border-t pt-4" />

      {/* 5. Amount Inputs */}
      <div className="grid gap-2">
        <Label>
          المبلغ بـ ({getCurrencyNameAr(value.selectedCurrency || baseCurrency)}
          )
        </Label>
        <Input
          type="number"
          value={isForeign ? value.amountFC : value.amountBase}
          onChange={(e) =>
            isForeign
              ? handleFCChange(+e.target.value)
              : handleBaseChange(+e.target.value)
          }
          placeholder="0.00"
          className="border-primary"
        />
      </div>

      {/* 6. FX Logic Display */}
      {isForeign && (
        <div className="grid gap-2">
          <Label>
            سعر الصرف (1 {value.selectedCurrency} = ? {baseCurrency})
          </Label>
          <Input
            type="number"
            value={value.exchangeRate || ""}
            onChange={(e) =>
              action({ ...value, exchangeRate: +e.target.value })
            }
          />
        </div>
      )}

      {/* 7. Read-only Base Equivalent */}
      {isForeign && (
        <div className="bg-muted col-span-full rounded-lg p-3 text-center">
          <p className="text-sm font-medium">
            يعادل بالعملة المحلية:{" "}
            <span className="text-primary">
              {value.amountBase.toLocaleString()} {baseCurrency}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
