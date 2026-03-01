import type { Metadata, Viewport } from "next";
import "./global.css";
import { ThemeProvider } from "../components/theme-provider";
import { AuthProvider } from "@/lib/context/AuthContext";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { currencyConfig } from "@/currency/config";
import { cookies } from "next/headers";
import { CurrencyProvider } from "@/components/CurrencyProvider";

export const metadata: Metadata = {
  title: "IMS - نظام إدارة المخزون | Inventory Management System",
  description:
    "نظام متكامل لإدارة المخزون ونقاط البيع (POS) والمستودعات - Complete Inventory Management, Warehouse, and POS Solution",
  keywords: [
    "inventory",
    "management",
    "system",
    "pos",
    "pwa",
    "nextjs",
    "warehouse",
    "إدارة المخزون",
    "نظام نقاط البيع",
    "برنامج مستودعات",
    "برنامج محاسبة",
    "كاشير",
    "مخازن",
    "نظام كاشير",
    "إدارة المبيعات",
  ],
  manifest: "/manifest.json",
  applicationName: "IMS",
  // icons: {
  //   icon: [
  //     { url: "/favicon.ico", sizes: "any" },
  //     {
  //       url: "/web-app-manifest-192x192.png",
  //       type: "image/png",
  //       sizes: "192x192",
  //     },
  //     {
  //       url: "/web-app-manifest-512x512.png",
  //       type: "image/png",
  //       sizes: "512x512",
  //     },
  //   ],
  //   apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  //   shortcut: ["/favicon.ico"],
  // },

  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IMS",
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
};
type CurrencyKey = keyof typeof currencyConfig;
export const viewport: Viewport = {
  themeColor: "#0b142a",
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = (await import(`@/messages/${locale}.json`)).default;
  const cookieStore = cookies();
  const cookieCurrency = (await cookieStore).get("NEXT_CURRENCY")?.value;
  const validKeys = Object.keys(currencyConfig) as CurrencyKey[];

  const currencyKey: CurrencyKey =
    cookieCurrency && validKeys.includes(cookieCurrency as CurrencyKey)
      ? (cookieCurrency as CurrencyKey)
      : "YER";

  return (
    <html lang={locale} className={``} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <NextIntlClientProvider locale={locale} messages={messages[locale]}>
              <CurrencyProvider currency={currencyConfig[currencyKey]}>
                {children}
                <Analytics />
                <SpeedInsights />
                <Toaster />
              </CurrencyProvider>
            </NextIntlClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
