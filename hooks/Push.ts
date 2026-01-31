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

// IMPORTANT: Must match the output file from next-pwa
const SERVICE_WORKER_FILE_PATH = "/sw.js"; // Changed from /swcustom.js

export async function registerAndSubscribe(
  onSubscribe: (subs: PushSubscription | null) => void,
): Promise<void> {
  try {
    console.log("[Push] Registering service worker...");

    // Unregister any existing service workers first (clean slate)
    const existingRegistrations =
      await navigator.serviceWorker.getRegistrations();
    for (const registration of existingRegistrations) {
      console.log(
        "[Push] Unregistering old service worker:",
        registration.scope,
      );
      await registration.unregister();
    }

    // Register the service worker
    const registration = await navigator.serviceWorker.register(
      SERVICE_WORKER_FILE_PATH,
      {
        scope: "/",
      },
    );

    console.log("[Push] Service worker registered:", registration);

    // Wait for the service worker to be ready
    await navigator.serviceWorker.ready;
    console.log("[Push] Service worker ready");

    // Small delay to ensure SW is fully active (important for iOS)
    await new Promise((resolve) => setTimeout(resolve, 500));

    await subscribe(onSubscribe);
  } catch (e) {
    console.error("[Push] Failed to register service worker:", e);
    onSubscribe(null);
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
export const unregisterServiceWorkers = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));
};
async function subscribe(
  onSubscribe: (subs: PushSubscription | null) => void,
): Promise<void> {
  try {
    // await unregisterServiceWorkers();
    const registration = await navigator.serviceWorker.ready;
    console.log("[Push] Service worker ready for subscription");

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    console.log("[Push] Existing subscription:", subscription?.endpoint);

    if (subscription) {
      // Subscription already exists, just verify it's on the server
      console.log("[Push] Using existing subscription");

      // Verify subscription exists on server and is valid
      try {
        await submitSubscription(subscription);
        console.log("[Push] Existing subscription verified on server");
        onSubscribe(subscription);
        return;
      } catch (error) {
        console.warn(
          "[Push] Existing subscription not on server or invalid, creating new one",
        );
        // If server doesn't have it, we'll create a new one below
        // First unsubscribe the old one
        try {
          await subscription.unsubscribe();
        } catch (e) {
          console.warn("[Push] Failed to unsubscribe old subscription:", e);
        }
        subscription = null;
      }
    }

    // No existing subscription or old one was invalid, create new one
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) {
      throw new Error("Missing VAPID public key");
    }

    console.log("[Push] Creating new subscription with VAPID key");

    // Subscribe with explicit options
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
        .buffer as ArrayBuffer,
    });

    console.log("[Push] New subscription created:", subscription.toJSON());

    // Submit new subscription to server
    await submitSubscription(subscription);
    onSubscribe(subscription);
  } catch (e) {
    console.error("[Push] Failed to subscribe:", e);

    // Log more details about the error
    if (e instanceof Error) {
      console.error("[Push] Error name:", e.name);
      console.error("[Push] Error message:", e.message);
    }

    onSubscribe(null);
  }
}

async function submitSubscription(
  subscription: PushSubscription,
): Promise<void> {
  const endpointUrl = "/api/web-push/subscription";

  console.log(
    "[Push] Submitting subscription to server:",
    subscription.toJSON(),
  );

  const res = await fetch(endpointUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[Push] Server error:", errorText);
    throw new Error(`Failed to save subscription: ${res.statusText}`);
  }

  const result = await res.json();
  console.log("[Push] Subscription saved on server:", result);
}

export function checkPermissionStateAndAct(
  onSubscribe: (subs: PushSubscription | null) => void,
): void {
  const state: NotificationPermission = Notification.permission;
  console.log("[Push] Current notification permission:", state);

  switch (state) {
    case "denied":
      console.warn("[Push] Notification permission denied");
      onSubscribe(null);
      break;
    case "granted":
      console.log("[Push] Permission granted, registering...");
      registerAndSubscribe(onSubscribe);
      break;
    case "default":
      console.log("[Push] Notification permission not yet granted");
      onSubscribe(null);
      break;
  }
}

// Helper function to check if we're on iOS
export function isIOS(): boolean {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Helper function to check iOS version
export function getIOSVersion(): number | null {
  const match = navigator.userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1], 10) : null;
}
