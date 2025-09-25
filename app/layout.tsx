import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./global.css";
import { ThemeProvider } from "../components/theme-provider";
import { AuthProvider } from "@/lib/context/AuthContext";
import ClientLayoutWrapper from "./clientLayoutWrapper";
import { Analytics } from "@vercel/analytics/next";
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap", // ✅ Already implemented
  weight: ["400", "700"],

  // fallback: ["system-ui", "arial"], // Add fallback
});
// const roboto = Roboto({
//   subsets: ["latin"],
//   variable: "--font-roboto-mono",
//   display: "swap", // ✅ Already implemented
//   weight: ["400", "700"],
//   // preload: true,

//   // fallback: ["system-ui", "arial"], // Add fallback
// });

// Add to head
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

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#1f2937" },
    { media: "(prefers-color-scheme: dark)", color: "#0b142a" },
  ],
  minimumScale: 1,
  initialScale: 1,
  width: "device-width",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.className} `}>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <header>
            {/* <link
          rel="preload"
          href="/_next/static/fonts/inter-latin.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        /> */}
            {/* <link
          rel="stylesheet"
          href="https://tailwindcss.com"
          data-precedence="next"
        /> */}
            <link rel="apple-touch-icon" href="/apple-icon.png" />
            <link rel="icon" type="image/svg+xml" href="/icon0.svg" />

            <link rel="manifest" href="/manifest.json" />
            <link rel="icon" href="/favicon.ico" sizes="512x512" />
          </header>

          <AuthProvider>
            <ClientLayoutWrapper>
              {children} <Analytics />
            </ClientLayoutWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
