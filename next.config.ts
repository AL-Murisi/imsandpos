// next.config.js or next.config.mjs
import type { NextConfig } from "next";
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
  experimental: {
    // optimizeCss: true,

    inlineCss: true,
  },
  productionBrowserSourceMaps: true,

  // other configs if needed
};

// Combine both plugins
module.exports = withBundleAnalyzer(withPWA(nextConfig));
