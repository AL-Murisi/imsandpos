"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/common/selectproduct";
import { fetchPayments, getLatestExchangeRate } from "@/lib/actions/banks";
import { toast } from "sonner";
import { useCompany } from "@/hooks/useCompany";
import { fallbackCurrencyOptions } from "@/lib/actions/currnciesOptions";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";

const CURRENCY_OPTIONS = [
  { id: "YER", name: "ريال يمني" },
  { id: "USD", name: "دولار أمريكي" },
  { id: "SAR", name: "ريال سعودي" },
];

export type PaymentState = {
  paymentMethod: "cash" | "bank" | "";
  accountId: string; // Chart of Accounts ID
  financialAccountId: string; // Bank/Cash table ID
  selectedCurrency: string;
  amountBase: number;
  amountFC?: number;
  exchangeRate?: number;
  transferNumber?: string;
};

type PaymentAccounts = {
  banks: { id: string; name: string; accountId: string }[];
  cashAccounts: { id: string; name: string; accountId: string }[];
};

const PAYMENTS_CACHE_TTL_MS = 5 * 60 * 1000;
const paymentsCacheByCompany = new Map<
  string,
  { data: PaymentAccounts; ts: number }
>();
const paymentsInFlightByCompany = new Map<string, Promise<PaymentAccounts>>();

function getPaymentsStorageKey(companyId: string) {
  return `payments-cache:${companyId}`;
}

async function getPaymentsCached(companyId: string): Promise<PaymentAccounts> {
  const now = Date.now();
  const memCached = paymentsCacheByCompany.get(companyId);
  if (memCached && now - memCached.ts < PAYMENTS_CACHE_TTL_MS) {
    return memCached.data;
  }

  if (typeof window !== "undefined") {
    try {
      const raw = window.sessionStorage.getItem(getPaymentsStorageKey(companyId));
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; data: PaymentAccounts };
        if (parsed?.data && now - parsed.ts < PAYMENTS_CACHE_TTL_MS) {
          paymentsCacheByCompany.set(companyId, parsed);
          return parsed.data;
        }
      }
    } catch {
      // Ignore storage parse/access issues and continue fetching.
    }
  }

  const inFlight = paymentsInFlightByCompany.get(companyId);
  if (inFlight) return inFlight;

  const request = fetchPayments()
    .then((data) => {
      const next = { data, ts: Date.now() };
      paymentsCacheByCompany.set(companyId, next);
      if (typeof window !== "undefined") {
        try {
          window.sessionStorage.setItem(
            getPaymentsStorageKey(companyId),
            JSON.stringify(next),
          );
        } catch {
          // Ignore storage quota/access issues.
        }
      }
      return data;
    })
    .finally(() => {
      paymentsInFlightByCompany.delete(companyId);
    });

  paymentsInFlightByCompany.set(companyId, request);
  return request;
}

export function ReusablePayment({
  value,
  action,
}: {
  value: PaymentState;
  action: (v: PaymentState) => void;
}) {
  const { company } = useCompany();
  const [fetchedAccounts, setFetchedAccounts] = useState<
    { id: string; name: string; accountId: string }[]
  >([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  const { options } = useCurrencyOptions();
  const currencyOptions = options.length ? options : fallbackCurrencyOptions;

  if (!company) return null;
  const baseCurrency = company.base_currency ?? "YER";
  const isForeign =
    value.selectedCurrency !== baseCurrency && value.selectedCurrency !== "";

  /* ───────── 1. Fetch Accounts based on Method ───────── */
  useEffect(() => {
    const companyId = company?.id;
    if (!companyId || !value.paymentMethod) {
      setFetchedAccounts([]);
      return;
    }

    async function loadAccounts() {
      setLoadingAccounts(true);
      try {
        const { banks, cashAccounts } = await getPaymentsCached(companyId);
        // Map the result to a unified list
        const list = value.paymentMethod === "bank" ? banks : cashAccounts;
        setFetchedAccounts(list);
      } catch (error) {
        toast.error("خطأ في تحميل الحسابات");
      } finally {
        setLoadingAccounts(false);
      }
    }

    loadAccounts();
  }, [value.paymentMethod, company?.id]);

  /* ───────── 2. Fetch Exchange Rate ───────── */
  useEffect(() => {
    if (!company || !value.selectedCurrency || !isForeign) {
      if (!isForeign && value.exchangeRate !== 1) {
        action({ ...value, exchangeRate: 1, amountFC: value.amountBase });
      }
      return;
    }

    async function loadRate() {
      try {
        const rateRow = await getLatestExchangeRate({
          fromCurrency: value.selectedCurrency,
          toCurrency: baseCurrency,
        });

        if (rateRow) {
          action({ ...value, exchangeRate: Number(rateRow.rate) });
        }
      } catch (error) {
        toast.error("فشل تحميل سعر الصرف");
      }
    }
    loadRate();
  }, [value.selectedCurrency, company.id]);

  /* ───────── 3. Math Helpers ───────── */
  const handleFCChange = (fc: number) => {
    const rate = value.exchangeRate || 1;
    action({
      ...value,
      amountFC: fc,
      amountBase: Number((fc * rate).toFixed(2)),
    });
  };

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
      {/* Payment Method */}
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
              accountId: "",
              financialAccountId: "",
            })
          }
        />
      </div>

      {/* Currency */}
      <div className="grid gap-2">
        <Label>عملة الدفع</Label>
        <SelectField
          options={currencyOptions}
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

      {/* Account Selection (Populated by fetchPayments) */}
      {value.paymentMethod && (
        <div className="grid gap-2">
          <Label>
            {value.paymentMethod === "bank"
              ? "البنك المستلم"
              : "الصندوق المستلم"}
          </Label>
          <SelectField
            options={fetchedAccounts}
            value={value.financialAccountId}
            disabled={loadingAccounts}
            placeholder={loadingAccounts ? "جاري التحميل..." : "اختر الحساب"}
            action={(id) => {
              const selected = fetchedAccounts.find((a) => a.id === id);
              action({
                ...value,
                financialAccountId: id,
                accountId: selected?.accountId || "", // Store the ledger ID
              });
            }}
          />
        </div>
      )}

      {/* Transfer Number */}
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

      {/* Amount Input */}
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

      {/* FX Logic */}
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

      {/* Read-only Local Equivalent */}
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
