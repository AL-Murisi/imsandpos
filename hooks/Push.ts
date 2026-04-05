import { deleteToken, getToken } from "firebase/messaging";
import { getFirebaseMessagingClient } from "@/lib/firebase/client";

export type NotificationSubscriptionState = {
  provider: "fcm" | "webpush";
  token?: string;
  endpoint?: string;
  subscription?: PushSubscription | null;
  debugMessage?: string;
};

export function notificationUnsupported(): boolean {
  return !(
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "showNotification" in ServiceWorkerRegistration.prototype
  );
}

const SERVICE_WORKER_TIMEOUT_MS = 12000;
const SERVICE_WORKER_PATH = "/sw.js";
const FCM_TOKEN_REFRESH_KEY = "ims:fcm-token-last-refresh";
const FCM_TOKEN_REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 24;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readClientEnv(name: string): string | undefined {
  const envMap: Record<string, string | undefined> = {
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  };

  const raw = envMap[name];
  if (!raw) {
    return undefined;
  }

  return raw.trim().replace(/^['"]|['"]$/g, "");
}

async function getActiveServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existingRegistration =
    (await navigator.serviceWorker.getRegistration(SERVICE_WORKER_PATH)) ??
    (await navigator.serviceWorker.getRegistration());

  if (existingRegistration?.active) {
    return existingRegistration;
  }

  let registration = existingRegistration;

  if (!registration) {
    registration = await navigator.serviceWorker.register(SERVICE_WORKER_PATH, {
      scope: "/",
    });
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("Timed out while waiting for the service worker"));
    }, SERVICE_WORKER_TIMEOUT_MS);
  });

  const readyRegistration = await Promise.race([
    navigator.serviceWorker.ready,
    timeoutPromise,
  ]);

  if (!readyRegistration.active && readyRegistration.installing) {
    await Promise.race([
      new Promise<void>((resolve, reject) => {
        const worker = readyRegistration.installing;
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

  return readyRegistration;
}

async function submitFcmToken(token: string): Promise<void> {
  const res = await fetch("/api/web-push/subscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fcmToken: token }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Failed to save FCM token");
  }
}

async function deleteFcmToken(token: string): Promise<void> {
  await fetch("/api/web-push/subscription", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fcmToken: token }),
  });
}

function shouldRefreshFcmToken(): boolean {
  if (typeof window === "undefined") return false;

  const lastRefresh = window.localStorage.getItem(FCM_TOKEN_REFRESH_KEY);
  if (!lastRefresh) return true;

  const parsedLastRefresh = Number(lastRefresh);
  if (!Number.isFinite(parsedLastRefresh)) return true;

  return Date.now() - parsedLastRefresh >= FCM_TOKEN_REFRESH_INTERVAL_MS;
}

function markFcmTokenRefreshed(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FCM_TOKEN_REFRESH_KEY, String(Date.now()));
}

async function resolveFcmToken(options?: {
  forceRefresh?: boolean;
}): Promise<string | null> {
  const registration = await getActiveServiceWorkerRegistration();
  const messaging = await getFirebaseMessagingClient();
  const vapidKey = readClientEnv("NEXT_PUBLIC_FIREBASE_VAPID_KEY");

  if (!messaging || !vapidKey || Notification.permission !== "granted") {
    return null;
  }

  if (options?.forceRefresh) {
    try {
      await deleteToken(messaging);
    } catch (error) {
      console.warn(
        "[Push] Failed to delete existing FCM token before refresh:",
        error,
      );
    }
  }

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  return token || null;
}

export async function getExistingSubscription(): Promise<NotificationSubscriptionState | null> {
  if (Notification.permission === "granted") {
    try {
      let token = await resolveFcmToken();

      if (!token || shouldRefreshFcmToken()) {
        token = await resolveFcmToken({ forceRefresh: true });
      }

      if (token) {
        await submitFcmToken(token);
        markFcmTokenRefreshed();
        return {
          provider: "fcm",
          token,
        };
      }
    } catch (error) {
      console.error("[Push] Failed to get existing FCM token:", error);
    }
  }
  return null;
}

export async function registerAndSubscribe(
  onSubscribe: (subs: NotificationSubscriptionState | null) => void,
): Promise<NotificationSubscriptionState | null> {
  try {
    await getActiveServiceWorkerRegistration();
    await delay(500);
    const messaging = await getFirebaseMessagingClient();
    const vapidKey = readClientEnv("NEXT_PUBLIC_FIREBASE_VAPID_KEY");

    console.info("[Push] Firebase messaging available:", Boolean(messaging));
    console.info("[Push] Firebase VAPID key available:", Boolean(vapidKey));

    if (messaging && vapidKey) {
      try {
        const token = await resolveFcmToken({ forceRefresh: true });

        if (!token) {
          throw new Error("Failed to receive FCM token");
        }

        console.info("[Push] FCM token generated:", token);
        await submitFcmToken(token);
        markFcmTokenRefreshed();
        console.info("[Push] FCM token submitted successfully");

        const result = {
          provider: "fcm" as const,
          token,
          debugMessage: "Firebase token generated and submitted successfully",
        };
        onSubscribe(result);
        return result;
      } catch (error) {
        console.error(
          "[Push] Firebase token generation/submission failed:",
          error,
        );
        const result = {
          provider: "fcm" as const,
          debugMessage:
            error instanceof Error ? error.message : "Unknown Firebase error",
        };
        onSubscribe(null);
        return result;
      }
    }
    const result = {
      provider: "fcm" as const,
      debugMessage: !messaging
        ? "Firebase messaging is unavailable or unsupported on this browser/device"
        : "NEXT_PUBLIC_FIREBASE_VAPID_KEY is missing",
    };
    console.warn("[Push] Firebase registration blocked:", result.debugMessage);
    onSubscribe(null);
    return result;
  } catch (e) {
    console.error("[Push] Failed to register notifications:", e);
    onSubscribe(null);
    return {
      provider: "fcm",
      debugMessage:
        e instanceof Error ? e.message : "Unknown Firebase registration error",
    };
  }
}

export async function unsubscribeNotifications(
  currentSubscription: NotificationSubscriptionState,
): Promise<void> {
  if (currentSubscription.provider === "fcm" && currentSubscription.token) {
    const messaging = await getFirebaseMessagingClient();
    if (messaging) {
      await deleteToken(messaging);
    }
    await deleteFcmToken(currentSubscription.token);
    return;
  }

  if (currentSubscription.subscription) {
    await currentSubscription.subscription.unsubscribe();
  }
}
