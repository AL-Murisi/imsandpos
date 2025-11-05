import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import withSerwist from "@serwist/next"; // ✅ correct import
import { execSync } from "child_process";

// Use git commit hash as cache version
const revision = execSync("git rev-parse HEAD", { encoding: "utf8" })
  .trim()
  .slice(0, 7);

const withNextIntl = createNextIntlPlugin();

// const withPWA = withSerwist({
//   swSrc: "app/sw.ts",
//   swDest: "public/sw.js",
//   cacheOnNavigation: true,
//   register: true, // ✅ auto register
//   // ✅ activate immediately
//   scope: "/", // ✅ global scope
//   disable: process.env.NODE_ENV === "development",
//   additionalPrecacheEntries: [
//     { url: "/", revision },
//     { url: "/offline", revision },
//   ],
// });
const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable PWA in dev
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  workboxOptions: {
    disableDevLogs: true,
  },
  // Example runtime caching for an API endpoint
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.example\.com\/data.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "example-api-cache",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 7, // Cache for 1 week
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /.*/i,
      handler: "NetworkOnly",
      options: {
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  experimental: {
    inlineCss: true,
    staleTimes: {
      dynamic: 30,
    },
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "recharts",
      "@tabler/icons-react",
      "react-icons",
      "zod",
    ],
  },

  productionBrowserSourceMaps: true,

  // webpack: (config, { isServer }) => {
  //   if (!isServer) {
  //     config.optimization = config.optimization || {};
  //     config.optimization.splitChunks = {
  //       chunks: "all",
  //       cacheGroups: {
  //         recharts: {
  //           test: /[\\/]node_modules[\\/]recharts[\\/]/,
  //           name: "recharts",
  //           priority: 20,
  //           reuseExistingChunk: true,
  //         },
  //         reactIcons: {
  //           test: /[\\/]node_modules[\\/]react-icons[\\/]/,
  //           name: "react-icons",
  //           priority: 20,
  //           reuseExistingChunk: true,
  //         },
  //         radix: {
  //           test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
  //           name: "radix-ui",
  //           priority: 15,
  //           reuseExistingChunk: true,
  //         },
  //         intl: {
  //           test: /[\\/]node_modules[\\/](next-intl|@formatjs)[\\/]/,
  //           name: "intl",
  //           priority: 15,
  //           reuseExistingChunk: true,
  //         },
  //         vendor: {
  //           test: /[\\/]node_modules[\\/]/,
  //           name: "vendor",
  //           priority: 10,
  //           reuseExistingChunk: true,
  //         },
  //       },
  //     };
  //   }

  //   return config;
  // },

  ...(process.env.NODE_ENV === "production" && {
    headers: async () => [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
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

// ✅ Combine all plugins (order matters)
export default withBundleAnalyzer(withPWA(withNextIntl(nextConfig)));
