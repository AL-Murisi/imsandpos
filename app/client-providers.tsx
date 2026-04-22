"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/lib/context/AuthContext";
import { NextIntlClientProvider } from "next-intl";
import { Toaster } from "@/components/ui/sonner";
import { currencyConfig } from "@/currency/config";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { useEffect, useState } from "react";
import IMSLoader from "@/components/loadinf";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <IMSLoader />; // or a loader
  }

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
