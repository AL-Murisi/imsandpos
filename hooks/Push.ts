// import prisma from "@/lib/prisma";

// export function notificationUnsupported(): boolean {
//   let unsupported = false;
//   if (
//     !("serviceWorker" in navigator) ||
//     !("PushManager" in window) ||
//     !("showNotification" in ServiceWorkerRegistration.prototype)
//   ) {
//     unsupported = true;
//   }
//   return unsupported;
// }
// const SERVICE_WORKER_FILE_PATH = "/swcustom.js";

// export async function registerAndSubscribe(
//   onSubscribe: (subs: PushSubscription | null) => void,
// ): Promise<void> {
//   try {
//     await navigator.serviceWorker.register(SERVICE_WORKER_FILE_PATH, {
//       scope: "/",
//     });
//     const existing = await navigator.serviceWorker.getRegistration();
//     if (!existing) {
//       await navigator.serviceWorker.register("/swcustom.js", { scope: "/" });
//     }

//     await subscribe(onSubscribe);
//   } catch (e) {
//     console.error("Failed to register service-worker: ", e);
//   }
// }
// // function urlBase64ToUint8Array(base64String: string): Uint8Array {
// //   const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
// //   const base64 = (base64String + padding)
// //     .replace(/-/g, "+")
// //     .replace(/_/g, "/");

// //   const rawData = window.atob(base64);
// //   return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
// // }

// // const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
// // if (!vapidKey) throw new Error("Missing VAPID public key");

// // applicationServerKey: urlBase64ToUint8Array(vapidKey),
// async function subscribe(
//   onSubscribe: (subs: PushSubscription | null) => void,
// ): Promise<void> {
//   navigator.serviceWorker.ready
//     .then((registration: ServiceWorkerRegistration) => {
//       return registration.pushManager.subscribe({
//         userVisibleOnly: true,
//         applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
//       });
//     })
//     .then((subscription: PushSubscription) => {
//       console.info("Created subscription Object: ", subscription.toJSON());
//       // submit subscription to server.
//       submitSubscription(subscription).then((_) => {
//         onSubscribe(subscription);
//       });
//     })
//     .catch((e) => {
//       console.error("Failed to subscribe cause of: ", e);
//     });
// }
// async function submitSubscription(
//   subscription: PushSubscription,
// ): Promise<void> {
//   const endpointUrl = "/api/web-push/subscription";
//   const res = await fetch(endpointUrl, {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ subscription }),
//   });
//   const result = await res.json();
//   console.log(result);
// }
// export function checkPermissionStateAndAct(
//   onSubscribe: (subs: PushSubscription | null) => void,
// ): void {
//   const state: NotificationPermission = Notification.permission;
//   switch (state) {
//     case "denied":
//       break;
//     case "granted":
//       registerAndSubscribe(onSubscribe);
//       break;
//     case "default":
//       break;
//   }
// }
export function notificationUnsupported(): boolean {
  let unsupported = false;
  if (
    !("serviceWorker" in navigator) ||
    !("PushManager" in window) ||
    !("showNotification" in ServiceWorkerRegistration.prototype)
  ) {
    unsupported = true;
  }
  return unsupported;
}

const SERVICE_WORKER_FILE_PATH = "/swcustom.js";

export async function registerAndSubscribe(
  onSubscribe: (subs: PushSubscription | null) => void,
): Promise<void> {
  try {
    const existing = await navigator.serviceWorker.getRegistration();
    if (!existing) {
      await navigator.serviceWorker.register(SERVICE_WORKER_FILE_PATH, {
        scope: "/",
      });
    }

    await subscribe(onSubscribe);
  } catch (e) {
    console.error("Failed to register service-worker: ", e);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
async function subscribe(
  onSubscribe: (subs: PushSubscription | null) => void,
): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.ready;

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error("Missing VAPID public key");
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
    }

    console.info("Created subscription Object: ", subscription.toJSON());

    // Submit subscription to server
    await submitSubscription(subscription);
    onSubscribe(subscription);
  } catch (e) {
    console.error("Failed to subscribe cause of: ", e);
    onSubscribe(null);
  }
}

async function submitSubscription(
  subscription: PushSubscription,
): Promise<void> {
  const endpointUrl = "/api/web-push/subscription";
  const res = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subscription }),
  });

  if (!res.ok) {
    throw new Error(`Failed to save subscription: ${res.statusText}`);
  }

  const result = await res.json();
  console.log("Subscription saved:", result);
}

export function checkPermissionStateAndAct(
  onSubscribe: (subs: PushSubscription | null) => void,
): void {
  const state: NotificationPermission = Notification.permission;
  switch (state) {
    case "denied":
      console.warn("Notification permission denied");
      break;
    case "granted":
      registerAndSubscribe(onSubscribe);
      break;
    case "default":
      console.log("Notification permission not yet granted");
      break;
  }
}
