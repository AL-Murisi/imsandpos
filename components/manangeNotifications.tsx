"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  checkPermissionStateAndAct,
  registerAndSubscribe,
  notificationUnsupported,
} from "@/hooks/Push";
import { toast } from "sonner";

export function PushNotificationManager() {
  const [unsupported, setUnsupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing subscription on mount
  useEffect(() => {
    async function checkExistingSubscription() {
      try {
        // Check if notifications are supported
        if (notificationUnsupported()) {
          setUnsupported(true);
          setIsLoading(false);
          return;
        }

        // Check if permission is already granted
        if (Notification.permission === "granted") {
          // Check if service worker is registered
          const registration = await navigator.serviceWorker.getRegistration();

          if (registration) {
            // Check if there's an existing subscription
            const existingSubscription =
              await registration.pushManager.getSubscription();

            if (existingSubscription) {
              console.log(
                "[PushManager] Found existing subscription:",
                existingSubscription.endpoint,
              );
              setSubscription(existingSubscription);
            } else {
              console.log("[PushManager] No existing subscription found");
            }
          }
        } else if (Notification.permission === "denied") {
          console.log("[PushManager] Notification permission denied");
        }
      } catch (error) {
        console.error("[PushManager] Error checking subscription:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkExistingSubscription();
  }, []); // Only run once on mount

  async function toggleNotifications(enabled: boolean) {
    if (enabled) {
      try {
        setIsLoading(true);

        // Request permission first
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          console.log("[PushManager] Permission granted, subscribing...");

          // This will check for existing subscription before creating a new one
          await registerAndSubscribe(setSubscription);

          toast.success("تم تفعيل الإشعارات");
        } else {
          console.log("[PushManager] Permission denied");
          toast.error("تم رفض إذن الإشعارات");
        }
      } catch (error) {
        console.error("[PushManager] Error enabling notifications:", error);
        toast.error("فشل تفعيل الإشعارات");
      } finally {
        setIsLoading(false);
      }
    } else {
      // Disable notifications
      if (subscription) {
        try {
          setIsLoading(true);

          console.log("[PushManager] Unsubscribing from push notifications...");

          // Unsubscribe from push notifications
          await subscription.unsubscribe();

          // Delete from server
          const response = await fetch("/api/web-push/subscription", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint }),
          });

          if (!response.ok) {
            throw new Error("Failed to delete subscription from server");
          }

          console.log("[PushManager] Successfully unsubscribed");

          setSubscription(null);
          toast.success("تم إلغاء الإشعارات");
        } catch (error) {
          console.error("[PushManager] Failed to unsubscribe:", error);
          toast.error("فشل إلغاء الإشعارات");
        } finally {
          setIsLoading(false);
        }
      }
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Switch
        disabled={unsupported || isLoading}
        checked={!!subscription}
        onCheckedChange={toggleNotifications}
      />
      <span>
        {isLoading
          ? "جاري التحميل..."
          : unsupported
            ? "الإشعارات غير مدعومة"
            : subscription
              ? "الإشعارات مفعلة"
              : "تفعيل الإشعارات"}
      </span>
    </div>
  );
}
