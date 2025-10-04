import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";
import { execSync } from "child_process";

// Use git commit hash as cache version
const revision = execSync("git rev-parse HEAD", { encoding: "utf8" })
  .trim()
  .slice(0, 7);

const withNextIntl = createNextIntlPlugin();
const withPWA = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  additionalPrecacheEntries: [
    { url: "/", revision },
    // Optional
    { url: "/offline", revision },
  ],
  // dest: "public",
  // register: true,
  // skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

  compiler: {
    // Remove console.logs in production
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  experimental: {
    inlineCss: true,
    // Optimize package imports - CRITICAL for icon libraries
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "recharts",
      "@tabler/icons-react",
      "react-icons",
    ],
  },

  productionBrowserSourceMaps: true,

  // Webpack optimizations
  webpack: (config, { isServer }) => {
    // Only apply to client bundles
    if (!isServer) {
      config.optimization = config.optimization || {};
      config.optimization.splitChunks = {
        chunks: "all",
        cacheGroups: {
          // Separate recharts - prevents duplication (218KB issue)
          recharts: {
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            name: "recharts",
            priority: 20,
            reuseExistingChunk: true,
          },
          // Separate react-icons - 206KB problem
          reactIcons: {
            test: /[\\/]node_modules[\\/]react-icons[\\/]/,
            name: "react-icons",
            priority: 20,
            reuseExistingChunk: true,
          },
          // Radix UI components
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: "radix-ui",
            priority: 15,
            reuseExistingChunk: true,
          },
          // next-intl
          intl: {
            test: /[\\/]node_modules[\\/](next-intl|@formatjs)[\\/]/,
            name: "intl",
            priority: 15,
            reuseExistingChunk: true,
          },
          // Other vendor code
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: "vendor",
            priority: 10,
            reuseExistingChunk: true,
          },
        },
      };
    }

    return config;
  },

  // Production-only headers
  ...(process.env.NODE_ENV === "production" && {
    headers: async () => [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ],
  }),
};

// Combine all plugins
export default withBundleAnalyzer(withPWA(withNextIntl(nextConfig)));
