"use client";

import { useEffect, useState } from "react";
import {
  getExistingSubscription,
  notificationUnsupported,
  registerAndSubscribe,
  unsubscribeNotifications,
  type NotificationSubscriptionState,
} from "@/hooks/Push";
import { toast } from "sonner";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PushNotificationManager() {
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

  async function handleToggle() {
    if (!subscription) {
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
        console.error("[PushManager] Error enabling:", error);
        toast.error("فشل تفعيل الإشعارات");
      } finally {
        setIsLoading(false);
      }

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

  if (unsupported) return null;

  return (
    <div className="flex items-center gap-3 p-1">
      <Button
        size="icon"
        variant="outline"
        disabled={isLoading}
        onClick={handleToggle}
        className={cn("border-transparent transition-all duration-300")}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : subscription ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
      </Button>
    </div>
  );
}
