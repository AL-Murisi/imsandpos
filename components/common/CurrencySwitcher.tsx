"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";
import { fallbackCurrencyOptions } from "@/lib/actions/currnciesOptions";

export default function CurrencySwitcher() {
  const [currency, setCurrency] = useState("YER");
  const { options } = useCurrencyOptions();
  const currencyOptions = options.length ? options : fallbackCurrencyOptions;

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("NEXT_CURRENCY="))
      ?.split("=")[1];
    if (cookieValue) setCurrency(cookieValue);
  }, []);

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency);
    document.cookie = `NEXT_CURRENCY=${newCurrency}; path=/;`;
    window.location.reload();
  };

  return (
    <Select value={currency} onValueChange={handleCurrencyChange}>
      <SelectTrigger className="border-[#0b142a] bg-[#0b142a]" dir="rtl">
        <SelectValue>{currency}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {currencyOptions.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
