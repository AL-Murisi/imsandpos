"use client";

import { useEffect, useState } from "react";
import { getLatestExchangeRate } from "@/lib/actions/currency";

export function useExchangeRate({ from, to }: { from: string; to: string }) {
  const [rate, setRate] = useState<number>(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (from === to) {
      setRate(1);
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const row = await getLatestExchangeRate({
          fromCurrency: from,
          toCurrency: to,
        });

        setRate(row ? Number(row.rate) : 1);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [from, to]);

  return { rate, loading };
}
