"use client";

import React, { createContext, useContext, useState } from "react";
import { currencyConfig } from "@/currency/config";
import { setCurrency } from "@/app/actions/currency"; // ✅ Server Action

type CurrencyKey = keyof typeof currencyConfig;

interface CurrencyContextType {
  currency: (typeof currencyConfig)[CurrencyKey];
  setCurrency: (key: CurrencyKey) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(
  undefined,
);

export function CurrencyProvider({
  children,
  currency,
}: {
  children: React.ReactNode;
  currency: (typeof currencyConfig)[CurrencyKey];
}) {
  const [currencyKey, setCurrencyKey] = useState<CurrencyKey>(
    Object.entries(currencyConfig).find(
      ([_, c]) => c.currency === currency.currency,
    )?.[0] as CurrencyKey,
  );

  const handleSetCurrency = async (key: CurrencyKey) => {
    setCurrencyKey(key);
    await setCurrency(key); // ✅ safely updates cookie on the server
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency: currencyConfig[currencyKey],
        setCurrency: handleSetCurrency,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context)
    throw new Error("useCurrency must be used within a CurrencyProvider");
  return context;
}
