// next.config.js or next.config.mjs
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // i18n: {
  //   locales: ["en", "ar"],
  //   defaultLocale: "ar",
  // },
  experimental: {
    // optimizeCss: true,

    inlineCss: true,
  },
  productionBrowserSourceMaps: true,

  // other configs if needed
};

// Combine both plugins
export default withBundleAnalyzer(withPWA(withNextIntl(nextConfig)));
