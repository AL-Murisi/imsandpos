import { getApps, initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId,
);

if (firebaseConfigured) {
  try {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    onBackgroundMessage(messaging, async (payload) => {
      const notificationTitle =
        payload.notification?.title || payload.data?.title || "Notification";
      const notificationOptions = {
        body:
          payload.notification?.body ||
          payload.data?.body ||
          "You have a new message. Please check it out",
        icon:
          payload.notification?.icon ||
          payload.data?.icon ||
          "/web-app-manifest-192x192.png",
        badge: payload.data?.badge || "/badge-72x72.png",
        data: {
          url: payload.fcmOptions?.link || payload.data?.url || "/",
        },
        tag: payload.data?.tag || "ims-notification",
      };

      await self.registration.showNotification(
        notificationTitle,
        notificationOptions,
      );

      await syncAppBadge();
    });
  } catch (error) {
    console.error("[SW] Firebase messaging init failed:", error);
  }
}

self.__WB_MANIFEST = self.__WB_MANIFEST || [];
if (self.workbox && self.workbox.precaching) {
  self.workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
  self.workbox.precaching.cleanupOutdatedCaches();
}

if (self.workbox && self.workbox.routing) {
  self.workbox.routing.setCatchHandler(async ({ request }) => {
    if (request.destination === "document") {
      const offlineResponse = await caches.match("/offline.html", {
        ignoreSearch: true,
      });

      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return Response.error();
  });
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function syncAppBadge() {
  const setBadge = self.registration.setAppBadge;
  if (typeof setBadge !== "function") return;

  const notifications = await self.registration.getNotifications();
  const count = notifications.length;

  if (count > 0) {
    await self.registration.setAppBadge(count);
    return;
  }

  const clearBadge = self.registration.clearAppBadge;
  if (typeof clearBadge === "function") {
    await self.registration.clearAppBadge();
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    (async () => {
      const targetUrl = new URL(url, self.location.origin).href;
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clients) {
        if (!("focus" in client)) {
          continue;
        }

        if ("navigate" in client && client.url !== targetUrl) {
          await client.navigate(targetUrl);
        }

        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          await syncAppBadge();
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }

      await syncAppBadge();
    })(),
  );
});
