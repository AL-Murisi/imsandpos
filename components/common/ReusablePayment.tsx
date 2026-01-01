"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/common/selectproduct";
import { fetchPayments } from "@/lib/actions/banks";
import { toast } from "sonner";

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
  baseCurrency = "YER",
  value,
  action,
  accounts,
}: {
  baseCurrency?: string;
  value: PaymentState;
  accounts: Account[];
  action: (v: PaymentState) => void;
}) {
  //   const [accounts, setAccounts] = useState<Account[]>([]);

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
        <Label>المبلغ ({baseCurrency})</Label>
        <Input
          type="number"
          value={value.amountBase}
          onChange={(e) =>
            action({ ...value, amountBase: +e.target.value || 0 })
          }
        />
      </div>

      {/* FX */}
      {isForeign && value.accountId !== "" && (
        <>
          <div className="grid gap-4">
            <Label>
              سعر الصرف ({accountCurrency} → {baseCurrency})
            </Label>
            <Input
              type="number"
              value={value.exchangeRate || ""}
              onChange={(e) =>
                action({ ...value, exchangeRate: +e.target.value || 0 })
              }
            />
          </div>

          <div className="grid gap-4">
            <Label>المبلغ بـ {accountCurrency}</Label>
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
