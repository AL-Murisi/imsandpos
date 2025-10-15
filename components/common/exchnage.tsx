"use client";

import { useState } from "react";
import { useCurrency } from "@/components/CurrencyProvider";
import { useFormatter } from "@/hooks/usePrice";

// Hook for manual exchange rate
function useManualRate(initialRate: number = 1) {
  const [rate, setRate] = useState<number>(initialRate);
  const setManualRate = (newRate: number) => setRate(newRate);
  return { rate, setManualRate };
}

export default function ProductPriceInput() {
  const { currency } = useCurrency();
  const [localPrice, setLocalPrice] = useState(0);
  const { formatCurrency } = useFormatter();
  const { rate, setManualRate } = useManualRate(1);

  // Convert local price to USD using manual rate
  const usdPrice = localPrice / rate;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-4">
        <input
          type="number"
          value={localPrice}
          onChange={(e) => setLocalPrice(Number(e.target.value))}
          placeholder={`Price in ${currency.label}`}
          className="rounded border px-2 py-1"
        />
        <span>{formatCurrency(usdPrice)}</span>
      </div>

      <div className="flex items-center gap-2">
        <label>Manual exchange rate ({currency.label} → USD):</label>
        <input
          type="number"
          step="0.01"
          value={rate}
          onChange={(e) => setManualRate(Number(e.target.value))}
          className="w-24 rounded border px-2 py-1"
        />
      </div>
    </div>
  );
}
