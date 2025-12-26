// import {
//   Serwist,
//   StaleWhileRevalidate,
//   ExpirationPlugin,
//   type RuntimeCaching,
//   type PrecacheEntry,
//   type SerwistGlobalConfig,
// } from "serwist";
// import { defaultCache } from "@serwist/next/worker";

// declare global {
//   interface WorkerGlobalScope extends SerwistGlobalConfig {
//     __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
//   }
// }

// declare const self: WorkerGlobalScope;

// // --- Custom caching strategies ---
// const cacheStrategies: RuntimeCaching[] = [
//   {
//     matcher: ({ request, url: { pathname }, sameOrigin }) =>
//       request.headers.get("RSC") === "1" &&
//       request.headers.get("Next-Router-Prefetch") === "1" &&
//       sameOrigin &&
//       !pathname.startsWith("/api/"),
//     handler: new StaleWhileRevalidate({
//       cacheName: "pages-rsc-prefetch",
//       plugins: [
//         new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 }),
//       ],
//     }),
//   },
//   {
//     matcher: ({ request, url: { pathname }, sameOrigin }) =>
//       request.headers.get("RSC") === "1" &&
//       sameOrigin &&
//       !pathname.startsWith("/api/"),
//     handler: new StaleWhileRevalidate({
//       cacheName: "pages-rsc",
//       plugins: [
//         new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 }),
//       ],
//     }),
//   },
//   {
//     matcher: ({ request, url: { pathname }, sameOrigin }) =>
//       request.headers.get("Content-Type")?.includes("text/html") &&
//       sameOrigin &&
//       !pathname.startsWith("/api/"),
//     handler: new StaleWhileRevalidate({
//       cacheName: "pages",
//       plugins: [
//         new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 24 * 60 * 60 }),
//       ],
//     }),
//   },
//   {
//     matcher: ({ url }) => url.pathname.startsWith("/_next/static/"),
//     handler: new StaleWhileRevalidate({
//       cacheName: "next-static-assets",
//       plugins: [
//         new ExpirationPlugin({
//           maxEntries: 100,
//           maxAgeSeconds: 7 * 24 * 60 * 60,
//         }),
//       ],
//     }),
//   },
//   {
//     matcher: ({ url }) =>
//       url.pathname.startsWith("/favicon.ico") ||
//       url.pathname.startsWith("/assets/"),
//     handler: new StaleWhileRevalidate({
//       cacheName: "public-assets",
//       plugins: [
//         new ExpirationPlugin({
//           maxEntries: 100,
//           maxAgeSeconds: 7 * 24 * 60 * 60,
//         }),
//       ],
//     }),
//   },
// ];

// // --- Initialize Serwist ---
// const serwist = new Serwist({
//   precacheEntries: self.__SW_MANIFEST,
//   navigationPreload: true,
//   runtimeCaching: [...cacheStrategies, ...defaultCache],
//   fallbacks: {
//     entries: [
//       {
//         url: "/offline",
//         matcher: ({ request }: { request: Request }) =>
//           request.destination === "document",
//       },
//     ],
//   },
// });

// // --- Start Serwist ---
// serwist.addEventListeners();
