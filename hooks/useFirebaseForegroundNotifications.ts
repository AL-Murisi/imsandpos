"use client";

import { useEffect } from "react";
import { onMessage } from "firebase/messaging";
import { getFirebaseMessagingClient } from "@/lib/firebase/client";

export function useFirebaseForegroundNotifications() {
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setup() {
      if (!("Notification" in window) || Notification.permission !== "granted") {
        return;
      }

      const messaging = await getFirebaseMessagingClient();
      if (!messaging) {
        return;
      }

      unsubscribe = onMessage(messaging, (payload) => {
        const title = payload.notification?.title || payload.data?.title || "IMS";
        const body = payload.notification?.body || payload.data?.body || "";
        const url = payload.data?.url || "/";

        const notification = new Notification(title, {
          body,
          icon: payload.notification?.icon || payload.data?.icon || "/web-app-manifest-192x192.png",
          badge: payload.data?.badge || "/badge-72x72.png",
          tag: payload.data?.tag || "ims-notification",
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = url;
          notification.close();
        };
      });
    }

    setup().catch((error) => {
      console.error("[Firebase Foreground] Failed to set up listener:", error);
    });

    return () => {
      unsubscribe?.();
    };
  }, []);
}
