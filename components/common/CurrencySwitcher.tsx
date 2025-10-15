"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function CurrencySwitcher() {
  const [currency, setCurrency] = useState("USD");

  // Read currency from cookie on mount
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
      <SelectTrigger className="">
        <SelectValue placeholder="اختر العملة" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="YER">ريال يمني</SelectItem>
        <SelectItem value="USD"> دولار</SelectItem>
        <SelectItem value="SAR">ريال سعودي</SelectItem>
      </SelectContent>
    </Select>
  );
}
