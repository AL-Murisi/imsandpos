import type { Metadata, Viewport } from "next";
import "./global.css";
import { ThemeProvider } from "../components/theme-provider";
import { AuthProvider } from "@/lib/context/AuthContext";
import ClientLayoutWrapper from "./clientLayoutWrapper";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { currencyConfig } from "@/currency/config";
import { cookies } from "next/headers";
import { CurrencyProvider } from "@/components/CurrencyProvider";

export const metadata: Metadata = {
  title: "IMS - Inventory Management System",
  description: "Complete Inventory Management and POS Solution",
  generator: "Next.js",
  manifest: "/manifest.json",
  applicationName: "IMS",
  keywords: [
    "inventory",
    "management",
    "system",
    "pos",
    "pwa",
    "nextjs",
    "warehouse",
  ],

  appleWebApp: {
    capable: true,
    statusBarStyle: "default", // "black", "black-translucent", or "default"
    title: "IMS",
  },
  formatDetection: {
    telephone: true, // 📱 Makes phone numbers tappable
    email: true,
    address: true,
  },
  //icons: [
  //   {
  //     rel: "apple-touch-icon",
  //     url: "/icons/icon-192x192.png",
  //     sizes: "192x192",
  //   },
  //   { rel: "icon", url: "/icons/icon-192x192.png", sizes: "192x192" },
  //   { rel: "icon", url: "/icons/icon-512x512.png", sizes: "512x512" },
  //   // Favicon for browsers
  //   { rel: "icon", url: "/favicon.ico" },
  // ],
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
  type CurrencyKey = keyof typeof currencyConfig; // "YER" | "SAR" | "USD"
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
          <header>
            <link rel="preconnect" href="https://va.vercel-scripts.com" />
            <link rel="dns-prefetch" href="https://va.vercel-scripts.com" />

            <link rel="apple-touch-icon" href="/apple-icon.png" />
            {/* <link rel="icon" type="image/svg+xml" href="/icon0.optimized.svg" /> */}

            <link rel="manifest" href="/manifest.json" />
            <link rel="icon" href="/favicon.ico" sizes="512x512" />
          </header>

          <AuthProvider>
            <NextIntlClientProvider locale={locale} messages={messages[locale]}>
              <CurrencyProvider currency={currencyConfig[currencyKey]}>
                <ClientLayoutWrapper>
                  {children} <Analytics /> <SpeedInsights />
                  <Toaster />
                </ClientLayoutWrapper>
              </CurrencyProvider>
            </NextIntlClientProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
