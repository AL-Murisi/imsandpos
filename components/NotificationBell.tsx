"use client";

import { useEffect, useState } from "react";
import { registerAndSubscribe, notificationUnsupported } from "@/hooks/Push";
import { toast } from "sonner";
import { Bell, BellOff, Loader2 } from "lucide-react"; // Import icons
import { Button } from "@/components/ui/button"; // Assuming you have a UI button
import { cn } from "@/lib/utils";

export default function PushNotificationManager() {
  const [unsupported, setUnsupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function checkExistingSubscription() {
      try {
        if (notificationUnsupported()) {
          setUnsupported(true);
          return;
        }

        if (Notification.permission === "granted") {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            const existingSubscription =
              await registration.pushManager.getSubscription();
            if (existingSubscription) {
              setSubscription(existingSubscription);
            }
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
    const isSubscribed = !!subscription;

    // Logic for Subscribing
    if (!isSubscribed) {
      try {
        setIsLoading(true);
        const permission = await Notification.requestPermission();

        if (permission === "granted") {
          await registerAndSubscribe(setSubscription);
          toast.success("تم تفعيل الإشعارات");
        } else {
          toast.error("تم رفض إذن الإشعارات");
        }
      } catch (error) {
        console.error("[PushManager] Error enabling:", error);
        toast.error("فشل تفعيل الإشعارات");
      } finally {
        setIsLoading(false);
      }
    }
    // Logic for Unsubscribing
    else {
      if (!subscription) return;
      try {
        setIsLoading(true);
        await subscription.unsubscribe();

        await fetch("/api/web-push/subscription", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

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

  if (unsupported) return null; // Or show a disabled state

  return (
    <div className="flex items-center gap-3">
      <Button
        size="icon"
        disabled={isLoading}
        onClick={handleToggle}
        className={cn(
          "dark:bg-accent dark:text-foreground bg-[#0b142a] transition-all duration-300",
        )}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : subscription ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
      </Button>

      <span className="text-sm font-medium">
        {isLoading
          ? "جاري التحميل..."
          : subscription
            ? "الإشعارات مفعلة"
            : "تفعيل الإشعارات"}
      </span>
    </div>
  );
}
