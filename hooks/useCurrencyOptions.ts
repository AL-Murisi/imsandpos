"use client";

import { useEffect, useState } from "react";

export type CurrencyOption = {
  id: string;
  name: string;
  symbol?: string | null;
  decimals?: number | null;
};

let currencyOptionsCache: CurrencyOption[] | null = null;
let currencyOptionsPromise: Promise<CurrencyOption[]> | null = null;

async function loadCurrencyOptions(): Promise<CurrencyOption[]> {
  if (currencyOptionsCache) {
    return currencyOptionsCache;
  }

  if (!currencyOptionsPromise) {
    currencyOptionsPromise = fetch("/api/currencies", {
      method: "GET",
      credentials: "same-origin",
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Failed to load currencies");
        }

        const data = await res.json();
        const options = Array.isArray(data.options) ? data.options : [];
        currencyOptionsCache = options;
        return options;
      })
      .finally(() => {
        currencyOptionsPromise = null;
      });
  }

  return currencyOptionsPromise;
}

export function useCurrencyOptions() {
  const [options, setOptions] = useState<CurrencyOption[]>([]);
  const [loading, setLoading] = useState(!currencyOptionsCache);

  useEffect(() => {
    let mounted = true;

    if (currencyOptionsCache) {
      setOptions(currencyOptionsCache);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    loadCurrencyOptions()
      .then((data) => {
        if (mounted) {
          setOptions(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setOptions([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { options, loading };
}
