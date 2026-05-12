"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/lib/context/AuthContext";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "@/components/ui/sonner";
import { currencyConfig } from "@/currency/config";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { useEffect, useState } from "react";

type CurrencyKey = keyof typeof currencyConfig;

export default function ClientProviders({
  children,
  locale,
  messages,
  currencyKey,
}: {
  children: React.ReactNode;
  locale: string;
  messages: any;
  currencyKey: CurrencyKey;
}) {
  // useEffect(() => {
  //   setMounted(true);
  // }, []);

  // // Show loader immediately before React hydrates
  // if (!mounted) {
  //   return <IMSLoader />;
  // }

  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <CurrencyProvider currency={currencyConfig[currencyKey]}>
          {children}
          <Toaster />
        </CurrencyProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
