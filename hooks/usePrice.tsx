"use client";

import { useCurrency } from "@/components/CurrencyProvider";
import { useExchangeRate } from "@/components/common/wee";
import { useCompany } from "./useCompany";

export function useFormatter() {
  const { currency } = useCurrency();
  const { company } = useCompany();

  const baseCurrency = company?.base_currency ?? currency.currency;

  // ✅ Hook في الأعلى فقط
  const { rate = 1 } = useExchangeRate({
    from: baseCurrency,
    to: currency.currency,
  });

  const formatCurrency = (value: number) => {
    if (value == null) return "—";

    // ✅ التحويل مرة واحدة
    const converted = currency.currency === baseCurrency ? value : value * rate;

    return new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.currency,
      currencyDisplay: "symbol",
      numberingSystem: "latn",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(converted);
  };

  const formatPriceK = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
    }
    return value.toString();
  };

  const formatQty = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)} ألف`;
    }
    return value.toString();
  };

  return {
    currency,
    baseCurrency,
    rate,
    formatCurrency,
    formatPriceK,
    formatQty,
  };
}

export function FormatPrice(price: number): string {
  // 1. التعامل مع الملايين أولاً
  if (price >= 1000000) {
    const formattedPrice = (price / 1000000).toFixed(6).replace(/\.00$/, "");
    return `${formattedPrice} مليون`;
  }

  // 2. التعامل مع الآلاف ثانياً
  if (price >= 1000) {
    const formattedPrice = (price / 1000).toFixed(3).replace(/\.0$/, "");
    return `${formattedPrice} ألف`;
  }

  // 3. المبالغ الصغيرة
  return price.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
export function FormatQty(price: number): string {
  if (price >= 1000) {
    const formattedPrice = (price / 1000).toFixed(1).replace(/\.0$/, "");
    return `${formattedPrice}الف`;
  }
  return price.toString();
}

/**
 * Hook to format numbers with current currency or in "k" notation
 */
