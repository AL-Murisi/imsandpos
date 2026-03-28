// // Workbox precache manifest injected at build time by next-pwa (injectManifest).
// // This is required for proper install lifecycle and prevents SW install from failing.
// self.__WB_MANIFEST = self.__WB_MANIFEST || [];

// self.addEventListener("install", () => {
//   self.skipWaiting();
// });

// self.addEventListener("activate", (event) => {
//   event.waitUntil(self.clients.claim());
// });

// self.addEventListener("push", (event) => {
//   if (!event.data) return;

//   let data;
//   try {
//     data = event.data.json();
//   } catch {
//     data = { title: "Notification", body: event.data.text(), url: "/" };
//   }

//   const notificationOptions = {
//     body: data.body || "",
//     icon: data.icon || "/web-app-manifest-192x192.png",
//     badge: data.badge || "/badge-72x72.png",
//     data: {
//       url: data.url || data.data?.url || "/",
//     },
//     tag: data.tag || "ims-notification",
//     renotify: true,
//   };

//   event.waitUntil(
//     self.registration.showNotification(
//       data.title || "IMS",
//       notificationOptions,
//     ),
//   );
// });

// self.addEventListener("notificationclick", (event) => {
//   event.notification.close();

//   const url = event.notification?.data?.url || "/";

//   event.waitUntil(
//     self.clients
//       .matchAll({ type: "window", includeUncontrolled: true })
//       .then((clients) => {
//         for (const client of clients) {
//           if ("focus" in client) {
//             return client.focus();
//           }
//         }

//         if (self.clients.openWindow) {
//           return self.clients.openWindow(url);
//         }

//         return undefined;
//       }),
//   );
// });

// self.addEventListener("pushsubscriptionchange", (event) => {
//   event.waitUntil(
//     self.registration.pushManager
//       .subscribe(event.oldSubscription?.options || { userVisibleOnly: true })
//       .then((subscription) => {
//         return fetch("/api/web-push/subscription", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ subscription }),
//         });
//       })
//       .catch(() => undefined),
//   );
// });
// Workbox precache manifest injected at build time by next-pwa (injectManifest).// Workbox precache manifest injected at build time by next-pwa (injectManifest).
// This is required for proper install lifecycle and prevents SW install from failing.
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

self.addEventListener("push", (event) => {
  let data;
  try {
    if (event.data) {
      data = event.data.json();
    } else {
      data = { title: "Notification", body: "", url: "/" };
    }
  } catch {
    data = {
      title: "Notification",
      body: event.data ? event.data.text() : "",
      url: "/",
    };
  }

  const notificationOptions = {
    body: data.body || "",
    icon: data.icon || "/web-app-manifest-192x192.png",
    badge: data.badge || "/badge-72x72.png",
    data: {
      url: data.url || data.data?.url || "/",
    },
    tag: data.tag || "ims-notification",
    renotify: false,
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(
        data.title || "IMS",
        notificationOptions,
      );
      await syncAppBadge();
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clients) {
        if ("focus" in client) {
          await client.focus();
          await syncAppBadge();
          return;
        }
      }

      if (self.clients.openWindow) {
        await self.clients.openWindow(url);
      }

      await syncAppBadge();
    })(),
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription?.options || { userVisibleOnly: true })
      .then((subscription) => {
        return fetch("/api/web-push/subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription }),
        });
      })
      .catch(() => undefined),
  );
});
