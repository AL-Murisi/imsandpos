// import { defaultCache } from "@serwist/next/worker";
// import { Serwist } from "serwist";

// declare const self: ServiceWorkerGlobalScopeEventMap & {
//   __SW_MANIFEST: any;
// };

// const serwist = new Serwist({
//   precacheEntries: self.__SW_MANIFEST,
//   skipWaiting: true,
//   clientsClaim: true,
//   runtimeCaching: defaultCache,
// });

// serwist.addEventListeners();
// app/sw.ts

import {
  Serwist,
  StaleWhileRevalidate,
  ExpirationPlugin,
  type RuntimeCaching,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";
import { defaultCache } from "@serwist/next/worker";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    // Change this attribute's name to your `injectionPoint`.
    // `injectionPoint` is an InjectManifest option.
    // See https://serwist.pages.dev/docs/build/configuring
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

// Custom caching strategies
const cacheStrategies: RuntimeCaching[] = [
  {
    matcher: ({ request, url: { pathname }, sameOrigin }) =>
      request.headers.get("RSC") === "1" &&
      request.headers.get("Next-Router-Prefetch") === "1" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new StaleWhileRevalidate({
      cacheName: "pages-rsc-prefetch",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: ({ request, url: { pathname }, sameOrigin }) =>
      request.headers.get("RSC") === "1" &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new StaleWhileRevalidate({
      cacheName: "pages-rsc",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },
  {
    matcher: ({ request, url: { pathname }, sameOrigin }) =>
      request.headers.get("Content-Type")?.includes("text/html") &&
      sameOrigin &&
      !pathname.startsWith("/api/"),
    handler: new StaleWhileRevalidate({
      cacheName: "pages",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60, // 24 hours
          maxAgeFrom: "last-used",
        }),
      ],
    }),
  },

  // Other resource caching strategies
  // {
  //   matcher: /\.(?:mp4|webm)$/i,
  //   handler: new StaleWhileRevalidate({
  //     cacheName: 'static-video-assets',
  //     plugins: [
  //       new ExpirationPlugin({
  //         maxEntries: 32,
  //         maxAgeSeconds: 7 * 24 * 60 * 60,
  //         maxAgeFrom: 'last-used',
  //       }),
  //      new RangeRequestsPlugin(),
  //     ],
  //   }),
  // },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...cacheStrategies, ...defaultCache],

  // Optional
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});
serwist.addEventListeners();

// Example of custom event listener
// self.addEventListener('message', (event) => {
//   if (event.data && event.data.type === 'SKIP_WAITING') {
//     self.skipWaiting();
//   }
// });
// self.addEventListener('push', (event) => {
//   const data = event.data?.json() || {};
//   const title = data.title || 'Notification';
//   const options = {
//     body: data.body || 'You have a new message.',
//     icon: '/icon-192x192.png',
//     badge: '/icon-192x192.png',
//     data: data.url || '/',
//   };

//   event.waitUntil(self.registration.showNotification(title, options));
// });

// self.addEventListener('notificationclick', (event) => {
