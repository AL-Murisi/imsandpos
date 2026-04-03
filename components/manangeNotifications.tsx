"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  getExistingSubscription,
  notificationUnsupported,
  registerAndSubscribe,
  unsubscribeNotifications,
  type NotificationSubscriptionState,
} from "@/hooks/Push";
import { toast } from "sonner";

export function PushNotificationManager() {
  const [unsupported, setUnsupported] = useState(false);
  const [subscription, setSubscription] =
    useState<NotificationSubscriptionState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkExistingSubscription() {
      try {
        if (notificationUnsupported()) {
          setUnsupported(true);
          return;
        }

        if (Notification.permission === "granted") {
          const existingSubscription = await getExistingSubscription();
          if (existingSubscription) {
            setSubscription(existingSubscription);
          }
        }
      } catch (error) {
        console.error("[PushManager] Error checking subscription:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkExistingSubscription();
  }, []);

  async function toggleNotifications(enabled: boolean) {
    if (enabled) {
      try {
        setIsLoading(true);
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          const result = await registerAndSubscribe(setSubscription);

          if (result?.provider === "fcm" && result.token) {
            toast.success(`FCM Token: ${result.token}`);
          } else if (result?.provider === "fcm" && result.debugMessage) {
            toast.error(`فشل Firebase: ${result.debugMessage}`, {
              duration: 8000,
            });
          } else {
            toast.error("لم يتم إنشاء توكن Firebase");
          }
        } else {
          toast.error("تم رفض إذن الإشعارات");
        }
      } catch (error) {
        console.error("[PushManager] Error enabling notifications:", error);
        toast.error("فشل تفعيل الإشعارات");
      } finally {
        setIsLoading(false);
      }

      return;
    }

    if (!subscription) {
      return;
    }

    try {
      setIsLoading(true);
      await unsubscribeNotifications(subscription);
      setSubscription(null);
      toast.success("تم إلغاء الإشعارات");
    } catch (error) {
      console.error("[PushManager] Failed to unsubscribe:", error);
      toast.error("فشل إلغاء الإشعارات");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Switch
        disabled={unsupported || isLoading}
        checked={Boolean(subscription)}
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
