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

const SERVICE_WORKER_TIMEOUT_MS = 12000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getActiveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existingRegistration = await navigator.serviceWorker.getRegistration();

  if (existingRegistration?.active) {
    return existingRegistration;
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("Timed out while waiting for the service worker"));
    }, SERVICE_WORKER_TIMEOUT_MS);
  });

  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    timeoutPromise,
  ]);

  if (!registration.active && registration.installing) {
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const worker = registration.installing;
        if (!worker) {
          resolve();
          return;
        }

        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") {
            resolve();
          }
          if (worker.state === "redundant") {
            reject(new Error("Service worker became redundant"));
          }
        });
      }),
      timeoutPromise,
    ]);
  }

  return registration;
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  const registration = await getActiveServiceWorkerRegistration();
  return registration.pushManager.getSubscription();
}

export async function registerAndSubscribe(
  onSubscribe: (subs: PushSubscription | null) => void,
): Promise<void> {
  try {
    console.log("[Push] Registering service worker...");
    const registration = await getActiveServiceWorkerRegistration();
    console.log("[Push] Service worker ready");

    // Small delay to ensure SW is fully active (important for iOS)
    await delay(500);

    await subscribe(registration, onSubscribe);
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

async function subscribe(
  registration: ServiceWorkerRegistration,
  onSubscribe: (subs: PushSubscription | null) => void,
): Promise<void> {
  try {
    console.log("[Push] Using SW:", registration);

    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await submitSubscription(subscription);
      onSubscribe(subscription);
      return;
    }

    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidKey) throw new Error("Missing VAPID key");

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
        .buffer as ArrayBuffer,
    });

    await submitSubscription(subscription);

    onSubscribe(subscription);
  } catch (e) {
    console.error("[Push] Subscribe error:", e);
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
