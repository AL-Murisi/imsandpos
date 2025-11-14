"use client";

import { useCurrency } from "@/components/CurrencyProvider";

export function useFormatter() {
  const { currency } = useCurrency();

  /**
   * Format a number as currency
   * @param value number to format
   * @returns formatted string with selected currency
   */
  // const formatCurrency = (value: number) => {
  //   if (value == null) return "N/A";

  //   return new Intl.NumberFormat(currency.locale, {
  //     style: "currency",
  //     currency: currency.currency,
  //     numberingSystem: "latn",
  //     minimumFractionDigits: 2, // always show at least 2 decimals
  //     maximumFractionDigits: 2, // optional, rounds to 2 decimals
  //   }).format(value);
  // };
  const formatCurrency = (value: number) => {
    let formattedValue = value;
    let suffix = "";

    // Determine K/M/B suffix
    if (Math.abs(value) >= 1_000_000_000) {
      formattedValue = value / 1_000_000_000;
      suffix = "B";
    } else if (Math.abs(value) >= 1_000_000) {
      formattedValue = value / 1_000_000;
      suffix = "M";
    } else if (Math.abs(value) >= 1000) {
      formattedValue = value / 1000;
      suffix = "k";
    }

    // Format the number with Arabic currency style
    let formattedCurrency = new Intl.NumberFormat(currency.locale, {
      style: "currency",
      currency: currency.currency,
      numberingSystem: "latn",
      minimumFractionDigits: 2, // allow removing .00
      maximumFractionDigits: 2,
    }).format(formattedValue);

    return `${suffix}${formattedCurrency}`;
  };
  /**
   * Format large numbers as "k" notation (1000 -> 1k)
   * @param value number to format
   * @returns formatted string
   */
  const formatPriceK = (value: number) => {
    if (value >= 1000) {
      const formatted = (value / 1000).toFixed(2).replace(/\.0$/, "");
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
