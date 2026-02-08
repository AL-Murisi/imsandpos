// self.addEventListener("push", (event) => {
//   if (!event.data) return;

//   let data;

//   try {
//     data = event.data.json(); // real pushes from your server
//   } catch {
//     data = {
//       title: "Test Notification",
//       body: event.data.text(), // DevTools test push
//       url: "/",
//     };
//   }

//   const options = {
//     body: data.body,
//     icon: data.icon || "/icon.png",
//     badge: "/badge.png",
//     vibrate: [100, 50, 100],
//     data: {
//       url: data.url || "/",
//     },
//   };

//   event.waitUntil(self.registration.showNotification(data.title, options));
// });

// // Handle notification click
// self.addEventListener("notificationclick", (event) => {
//   event.notification.close();

//   // Open the URL in a new tab or focus if already open
//   event.waitUntil(
//     clients.matchAll({ type: "window" }).then((clientList) => {
//       for (const client of clientList) {
//         if (client.url === event.notification.data.url && "focus" in client) {
//           return client.focus();
//         }
//       }
//       if (clients.openWindow) {
//         return clients.openWindow(event.notification.data.url);
//       }
//     }),
//   );
// });
// Custom Service Worker Template
// This file will be used by @ducanh2912/next-pwa as the base

// console.log("🚀 Custom Service Worker loaded");

// // ✅ Push Notification Handler
// self.addEventListener("push", (event) => {
//   console.log("📩 Push notification received:", event);

//   if (!event.data) {
//     console.warn("⚠️ No data in push event");
//     return;
//   }

//   let data;

//   try {
//     // Try to parse as JSON (from your server)
//     data = event.data.json();
//     console.log("✅ Parsed JSON push data:", data);
//   } catch {
//     // Fallback for DevTools test push
//     data = {
//       title: "Test Notification",
//       body: event.data.text(),
//       url: "/",
//     };
//     console.log("⚠️ Using text fallback:", data);
//   }

//   const options = {
//     body: data.body || "New notification",
//     icon: data.icon || "/icon.png",
//     badge: data.badge || "/badge.png",
//     vibrate: [100, 50, 100],
//     data: {
//       url: data.url || "/",
//       timestamp: Date.now(),
//     },
//     tag: data.tag || "default-notification",
//     requireInteraction: false,
//   };

//   event.waitUntil(
//     self.registration
//       .showNotification(data.title || "Notification", options)
//       .then(() => console.log("✅ Notification displayed successfully"))
//       .catch((err) => console.error("❌ Failed to show notification:", err)),
//   );
// });

// // ✅ Notification Click Handler
// self.addEventListener("notificationclick", (event) => {
//   console.log("🖱️ Notification clicked:", event.notification.tag);

//   event.notification.close();

//   const urlToOpen = event.notification.data?.url || "/";

//   event.waitUntil(
//     clients
//       .matchAll({ type: "window", includeUncontrolled: true })
//       .then((clientList) => {
//         console.log("🔍 Found clients:", clientList.length);

//         // Try to focus existing window with same URL
//         for (const client of clientList) {
//           if (client.url === urlToOpen && "focus" in client) {
//             console.log("✅ Focusing existing window");
//             return client.focus();
//           }
//         }

//         // Open new window if none found
//         if (clients.openWindow) {
//           console.log("🆕 Opening new window:", urlToOpen);
//           return clients.openWindow(urlToOpen);
//         }
//       })
//       .catch((err) =>
//         console.error("❌ Error handling notification click:", err),
//       ),
//   );
// });

// // ✅ Handle push subscription changes
// self.addEventListener("pushsubscriptionchange", (event) => {
//   console.log("🔄 Push subscription changed");

//   event.waitUntil(
//     self.registration.pushManager
//       .subscribe({
//         userVisibleOnly: true,
//         applicationServerKey:
//           event.oldSubscription?.options?.applicationServerKey,
//       })
//       .then((subscription) => {
//         console.log("✅ Resubscribed successfully:", subscription);

//         // Send new subscription to server
//         return fetch("/api/push/resubscribe", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify(subscription),
//         });
//       })
//       .catch((err) => console.error("❌ Failed to resubscribe:", err)),
//   );
// });

// console.log("✅ Custom push notification handlers registered");
// self.addEventListener("push", function (event) {
//   if (!event.data) {
//     return;
//   }

//   const payload = event.data.json();
//   const { body, icon, image, badge, url, title } = payload;
//   const notificationTitle = title ?? "Hi";
//   const notificationOptions = {
//     body,
//     icon,
//     image,
//     data: {
//       url,
//     },
//     badge,
//   };

//   event.waitUntil(
//     self.registration
//       .showNotification(notificationTitle, notificationOptions)
//       .then(() => {
//         sendDeliveryReportAction();
//       }),
//   );
// });

// const sendDeliveryReportAction = () => {
//   console.log("Web push delivered.");
// };
// public/sw.js
// self.addEventListener("push", (event) => {
//   if (!event.data) return;

//   const payload = event.data.json();
//   const { title, body, icon, url } = payload;

//   const options = {
//     body: body || "No body",
//     icon: icon || "/icon1.png",
//     sound: "/sound/notification.wav",
//     data: "https://imsandpos.vercel.app/",
//   };

//   console.log("Push received:", payload);

//   event.waitUntil(
//     self.registration.showNotification(title || "No title", options),
//   );
// });

// self.addEventListener("notificationclick", (event) => {
//   event.notification.close();
//   if (event.notification.data.url) {
//     event.waitUntil(clients.openWindow(event.notification.data.url));
//   }
// });
self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll();
      clients.forEach((c) => c.postMessage({ type: "SYNC_UNREAD" }));
    })(),
  );
});
// self.addEventListener("activate", () => {
//   self.clients.matchAll({ type: "window" }).then((windowClients) => {
//     for (let windowClient of windowClients) {
//       // Force open pages to refresh, so that they have a chance to load the
//       // fresh navigation response from the local dev server.
//       windowClient.navigate(windowClient.url);
//     }
//   });
// });
let unreadCount = 0;
self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();

    unreadCount++;

    // App badge (Chrome / Edge / Android)
    if ("setAppBadge" in navigator) {
      navigator.setAppBadge(unreadCount).catch(() => {});
    }

    const options = {
      body: data.body,

      icon: "/icon.png" || "/logo.png",
      badge: "/badge-72x72.png",
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1,
        sound: "/sounds/notification.wav",

        url: data.data?.url || "/",
      },
      requireInteraction: true,
      actions: [
        {
          action: "explore",
          title: "عرض التفاصيل",
        },
        {
          action: "close",
          title: "إغلاق",
        },
      ],
    };

    // Play sound if specified
    if (data.data?.sound) {
      // Note: Sound in notifications is limited in most browsers
      // Consider using the Notification API with audio in the main thread instead
    }

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  if (event.action === "explore") {
    // Open the URL specified in the notification data
    event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
  } else if (event.action === "close") {
    // Just close the notification
    event.notification.close();
  } else {
    // Default click action - open the app
    event.waitUntil(clients.openWindow(event.notification.data.url || "/"));
  }
});

self.addEventListener("pushsubscriptionchange", function (event) {
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then(function (subscription) {
        // Send new subscription to server
        return fetch("/api/web-push/subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ subscription }),
        });
      }),
  );
});
// Import Workbox if using next-pwa (it will inject this)
// importScripts() will be added by the PWA plugin

// self.addEventListener("install", (event) => {
//   console.log("[SW] Installing service worker...");
//   self.skipWaiting();
// });

// self.addEventListener("activate", (event) => {
//   console.log("[SW] Activating service worker...");
//   event.waitUntil(
//     Promise.all([
//       self.clients.claim(),
//       // Clean up old caches if needed
//       caches.keys().then((cacheNames) => {
//         return Promise.all(
//           cacheNames
//             .filter((cacheName) => {
//               // Add logic to remove old caches
//               return false;
//             })
//             .map((cacheName) => caches.delete(cacheName)),
//         );
//       }),
//     ]),
//   );
// });

// // Push notification handler
// self.addEventListener("push", function (event) {
//   console.log("[SW] Push received:", event);

//   if (!event.data) {
//     console.log("[SW] Push event but no data");
//     return;
//   }

//   try {
//     const data = event.data.json();
//     console.log("[SW] Push data:", data);

//     // Update badge count (iOS 16.4+)
//     if (navigator.setAppBadge) {
//       navigator.setAppBadge(1).catch((err) => {
//         console.log("[SW] Badge update failed:", err);
//       });
//     }

//     const options = {
//       body: data.body,
//       icon: data.icon || "/icon.png",
//       badge: data.badge || "/badge-72x72.png",
//       // iOS requires specific vibration pattern format
//       vibrate: [200, 100, 200],
//       data: {
//         dateOfArrival: Date.now(),
//         url: data.data?.url || "/",
//       },
//       // Important for iOS - must be true
//       requireInteraction: false, // Changed to false for better iOS compatibility
//       // iOS supports limited actions
//       actions: [
//         {
//           action: "open",
//           title: "عرض",
//         },
//         {
//           action: "close",
//           title: "إغلاق",
//         },
//       ],
//       // iOS-specific options
//       tag: data.tag || "default",
//       renotify: true,
//     };

//     event.waitUntil(
//       self.registration
//         .showNotification(data.title || "إشعار جديد", options)
//         .then(() => {
//           console.log("[SW] Notification shown successfully");
//         })
//         .catch((err) => {
//           console.error("[SW] Failed to show notification:", err);
//         }),
//     );
//   } catch (error) {
//     console.error("[SW] Error processing push:", error);
//   }
// });

// // Notification click handler
// self.addEventListener("notificationclick", function (event) {
//   console.log("[SW] Notification clicked:", event.action);

//   event.notification.close();

//   const urlToOpen = event.notification.data?.url || "/";

//   event.waitUntil(
//     clients
//       .matchAll({ type: "window", includeUncontrolled: true })
//       .then((windowClients) => {
//         // Check if there's already a window open
//         for (let client of windowClients) {
//           if (client.url === urlToOpen && "focus" in client) {
//             return client.focus();
//           }
//         }
//         // If no window is open, open a new one
//         if (clients.openWindow) {
//           return clients.openWindow(urlToOpen);
//         }
//       })
//       .catch((err) => {
//         console.error("[SW] Error handling notification click:", err);
//       }),
//   );

//   // Clear badge
//   if (navigator.clearAppBadge) {
//     navigator.clearAppBadge().catch((err) => {
//       console.log("[SW] Badge clear failed:", err);
//     });
//   }
// });

// // Handle subscription changes (important for iOS)
// self.addEventListener("pushsubscriptionchange", function (event) {
//   console.log("[SW] Push subscription changed");

//   event.waitUntil(
//     self.registration.pushManager
//       .subscribe({
//         userVisibleOnly: true,
//         applicationServerKey:
//           self.registration.pushManager.applicationServerKey,
//       })
//       .then(function (newSubscription) {
//         console.log("[SW] New subscription:", newSubscription);
//         // Send new subscription to server
//         return fetch("/api/web-push/subscription", {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify({ subscription: newSubscription }),
//         });
//       })
//       .catch(function (error) {
//         console.error("[SW] Failed to resubscribe:", error);
//       }),
//   );
// });

// // Handle notification close
self.addEventListener("notificationclose", function (event) {
  console.log("[SW] Notification closed:", event);

  // Clear badge when notification is dismissed
  if (navigator.clearAppBadge) {
    navigator.clearAppBadge().catch((err) => {
      console.log("[SW] Badge clear failed:", err);
    });
  }
});
