"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/common/selectproduct";
import { fetchPayments, getLatestExchangeRate } from "@/lib/actions/banks";
import { toast } from "sonner";
import { useCompany } from "@/hooks/useCompany";

type Account = {
  id: string;
  name: string;
  currency: string | null;
};

export type PaymentState = {
  paymentMethod: "cash" | "bank" | "";
  accountId: string;
  accountCurrency: string;
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
  //   const [accounts, setAccounts] = useState<Account[]>([]);
  const { company } = useCompany();
  if (!company) {
    return;
  }
  const baseCurrency = company.base_currency ?? "YER";
  const selectedAccount = accounts.find((a) => a.id === value.accountId);
  const accountCurrency = selectedAccount?.currency ?? "";
  const isForeign = accountCurrency !== baseCurrency;

  /* ───────── Fetch accounts ───────── */
  //   useEffect(() => {
  //     if (!value.paymentMethod) return;

  //     async function load() {
  //       try {
  //         const { banks, cashAccounts } = await fetchPayments();
  //         setAccounts(value.paymentMethod === "bank" ? banks : cashAccounts);
  //       } catch {
  //         toast.error("فشل تحميل الحسابات");
  //       }
  //     }
  //     load();
  //   }, [value.paymentMethod]);

  /* ───────── Currency sync ───────── */
  const companyId = company.id;
  useEffect(() => {
    if (!companyId) return;
    if (!value.accountId) return;
    if (!accountCurrency) return;
    if (accountCurrency === baseCurrency) return;

    async function loadRate() {
      try {
        const rateRow = await getLatestExchangeRate({
          companyId,
          fromCurrency: accountCurrency,
          toCurrency: baseCurrency,
        });

        if (!rateRow) {
          toast.error("لا يوجد سعر صرف لهذه العملة");
          return;
        }

        action({
          ...value,
          exchangeRate: Number(rateRow.rate),
          accountCurrency,
        });
      } catch {
        toast.error("فشل تحميل سعر الصرف");
      }
    }

    loadRate();
  }, [value.accountId, accountCurrency]);

  useEffect(() => {
    if (!isForeign || !value.exchangeRate) return;
    action({
      ...value,
      accountCurrency,
      amountBase: value.amountFC! * value.exchangeRate,
    });
  }, [value.amountFC, value.exchangeRate]);

  useEffect(() => {
    if (!isForeign || !value.exchangeRate) return;
    action({
      ...value,
      accountCurrency,
      amountFC: value.amountBase / value.exchangeRate,
    });
  }, [value.amountBase]);
  const getCurrencyNameAr = (currency: string) => {
    switch (currency?.toLowerCase()) {
      case "usd":
        return "دولار أمريكي";
      case "yer":
        return "ريال يمني";
      case "sar":
        return "ريال سعودي";
      default:
        return currency || "";
    }
  };

  const baseCurrencyAr = getCurrencyNameAr(baseCurrency);
  const accountCurrencyAr = getCurrencyNameAr(accountCurrency);
  /* ───────── UI ───────── */
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:items-center sm:justify-between md:grid-cols-2">
      {/* Payment method */}
      <div className="grid gap-4">
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
              paymentMethod: v as any,
              accountId: "",
              accountCurrency: baseCurrency,
              amountBase: 0,
            })
          }
        />
      </div>

      {/* Account */}
      {value.paymentMethod && (
        <div className="grid gap-4">
          <Label>{value.paymentMethod === "bank" ? "البنك" : "الصندوق"}</Label>
          <SelectField
            options={accounts}
            value={value.accountId}
            placeholder="اختر الحساب"
            action={(id) =>
              action({
                ...value,
                accountId: id,
                accountCurrency:
                  accounts.find((a) => a.id === id)?.currency ?? baseCurrency,
              })
            }
          />
        </div>
      )}

      {/* Transfer number */}
      {value.paymentMethod === "bank" && (
        <div className="grid gap-4">
          <Label>رقم التحويل</Label>
          <Input
            value={value.transferNumber || ""}
            onChange={(e) =>
              action({ ...value, transferNumber: e.target.value })
            }
          />
        </div>
      )}

      {/* Base amount */}
      <div className="grid gap-4">
        <Label>المبلغ المستلم بـ ({baseCurrencyAr})</Label>
        <Input
          type="number"
          value={value.amountBase}
          onChange={(e) =>
            action({ ...value, amountBase: +e.target.value || 0 })
          }
        />
      </div>

      {/* FX Section */}
      {isForeign && value.accountId !== "" && (
        <>
          <div className="grid gap-4">
            <Label>
              سعر الصرف ({accountCurrencyAr} ← {baseCurrencyAr})
            </Label>
            <Input
              type="number"
              value={value.exchangeRate || ""}
              onChange={(e) =>
                action({ ...value, exchangeRate: +e.target.value || 0 })
              }
            />
            <p className="text-muted-foreground text-xs">
              تم جلب السعر تلقائيًا، يمكنك تعديله يدويًا
            </p>
          </div>

          <div className="grid gap-4">
            <Label>المبلغ المستلم بـ ({accountCurrencyAr})</Label>
            <Input
              type="number"
              value={value.amountFC || ""}
              onChange={(e) =>
                action({ ...value, amountFC: +e.target.value || 0 })
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
