// Workbox precache manifest injected at build time by next-pwa (injectManifest).
// This is required for proper install lifecycle and prevents SW install from failing.
self.__WB_MANIFEST = self.__WB_MANIFEST || [];
if (self.workbox && self.workbox.precaching) {
  self.workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Notification", body: event.data.text(), url: "/" };
  }

  const notificationOptions = {
    body: data.body || "",
    icon: data.icon || "/web-app-manifest-192x192.png",
    badge: data.badge || "/badge-72x72.png",
    data: {
      url: data.url || data.data?.url || "/",
    },
    tag: data.tag || "ims-notification",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "IMS", notificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }

      return undefined;
    }),
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
