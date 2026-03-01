import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { execSync } from "child_process";
// Use git commit hash as cache version

const withNextIntl = createNextIntlPlugin();

const enablePwaInDev = process.env.NEXT_PUBLIC_ENABLE_PWA_DEV === "true";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  register: true,
  disable: process.env.NODE_ENV === "development" && !enablePwaInDev,
  // fallbacks: {
  //   document: "/offline",
  // },
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /\/_next\/static\/.*/,
        handler: "StaleWhileRevalidate",
        method: "GET",
        options: {
          cacheName: "ims-next-static",
          expiration: {
            maxEntries: 300,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /\/api\/auth\/me$/,
        handler: "StaleWhileRevalidate",
        method: "GET",
        options: {
          cacheName: "ims-auth-me-cache",
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 7,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: ({ request, url }: { request: Request; url: URL }) =>
          request.mode === "navigate" &&
          (url.origin === "http://localhost:3000" ||
            url.origin.endsWith(".vercel.app") ||
            url.origin === "https://imsandpos.vercel.app"),
        handler: "NetworkFirst",
        method: "GET",
        options: {
          cacheName: "ims-pages-cache",
          networkTimeoutSeconds: 5,
          expiration: {
            maxEntries: 200,
            maxAgeSeconds: 60 * 60 * 24 * 14,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
    ],
  },
  swSrc: "public/swcustom.js",
  swDest: "public/sw.js",
});
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  productionBrowserSourceMaps: false,
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
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "pdcllzxplhtrwuflkwtl.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  webpack: (config, { isServer }) => {
    // Only apply this configuration for the server build
    if (isServer) {
      config.externals.push({
        handlebars: "commonjs handlebars",
      });
    }
    return config;
  },
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
