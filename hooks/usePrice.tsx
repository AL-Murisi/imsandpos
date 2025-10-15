"use client";

import { useCurrency } from "@/components/CurrencyProvider";

export function useFormatter() {
  const { currency } = useCurrency();

  /**
   * Format a number as currency
   * @param value number to format
   * @returns formatted string with selected currency
   */
  const formatCurrency = (value: number) => {
    if (value == null) return "N/A";

    return new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.currency,
      numberingSystem: "latn",
    }).format(value);
  };

  /**
   * Format large numbers as "k" notation (1000 -> 1k)
   * @param value number to format
   * @returns formatted string
   */
  const formatPriceK = (value: number) => {
    if (value >= 1000) {
      const formatted = (value / 1000).toFixed(1).replace(/\.0$/, "");
      return `${formatted}k`;
    }
    return value.toString();
  };

  /**
   * Format quantity (same as priceK)
   */
  const formatQty = (value: number) => {
    if (value >= 1000) {
      const formatted = (value / 1000).toFixed(1).replace(/\.0$/, "");
      return `${formatted}k`;
    }
    return value.toString();
  };

  return { currency, formatCurrency, formatPriceK, formatQty };
}
export function FormatPrice(price: number): string {
  if (price >= 1000) {
    const formattedPrice = (price / 1000).toFixed(1).replace(/\.0$/, "");
    return `${formattedPrice}k`;
  }
  return price.toString();
}
export function FormatQty(price: number): string {
  if (price >= 1000) {
    const formattedPrice = (price / 1000).toFixed(1).replace(/\.0$/, "");
    return `${formattedPrice}k`;
  }
  return price.toString();
}

/**
 * Hook to format numbers with current currency or in "k" notation
 */
