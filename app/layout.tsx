import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./global.css";
import { ThemeProvider } from "../components/theme-provider";
import { AuthProvider } from "@/lib/context/AuthContext";
import ClientLayoutWrapper from "./clientLayoutWrapper";

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
  description: "Complete Inventory Management Solution",
  generator: "Next.js",
  manifest: "/manifest.json",
  keywords: ["inventory", "management", "system", "pwa"],
  authors: [
    { name: "Your Name" },
    {
      name: "Your Name",
      url: "https://yourwebsite.com",
    },
  ],
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
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "IMS",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#3b82f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
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
        /> */}{" "}
            {/* <link
          rel="stylesheet"
          href="https://tailwindcss.com"
          data-precedence="next"
        /> */}
            <link rel="icon" href="/favicon.ico" sizes="512x512" />
          </header>
          <AuthProvider>
            <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
