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

self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();

    navigator.setAppBadge(12);

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
