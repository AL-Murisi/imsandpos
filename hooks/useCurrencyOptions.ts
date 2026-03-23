"use client";

import { useEffect, useState } from "react";

export type CurrencyOption = {
  id: string;
  name: string;
  symbol?: string | null;
  decimals?: number | null;
};

export function useCurrencyOptions() {
  const [options, setOptions] = useState<CurrencyOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/currencies");
        if (!res.ok) throw new Error("Failed to load currencies");
        const data = await res.json();
        if (mounted) {
          setOptions(data.options || []);
        }
      } catch (err) {
        if (mounted) {
          setOptions([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  return { options, loading };
}
