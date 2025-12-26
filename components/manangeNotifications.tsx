"use client";

import {
  sendTestNotifications,
  subscribeUser,
  unsubscribeUser,
} from "@/lib/actions/notification";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      registerServiceWorker();
    }
  }, []);

  async function registerServiceWorker() {
    const registration = await navigator.serviceWorker.register("/sw.js");
    const sub = await registration.pushManager.getSubscription();
    setSubscription(sub);
    setEnabled(!!sub); // Set switch state based on subscription
  }

  async function subscribeToPush() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("تم رفض إذن الإشعارات");
        setEnabled(false);
        return;
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        alert("مفتاح VAPID مفقود");
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      setSubscription(sub);
      setEnabled(true);

      await subscribeUser(JSON.parse(JSON.stringify(sub)));
    } catch (err) {
      console.error("فشل الاشتراك:", err);
      setEnabled(false);
    }
  }

  async function unsubscribeFromPush() {
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    setSubscription(null);
    setEnabled(false);
    await unsubscribeUser(); // Update server DB
  }

  async function toggleSubscription() {
    if (enabled) {
      await unsubscribeFromPush();
    } else {
      await subscribeToPush();
    }
  }

  async function sendTestNotification() {
    if (subscription && message) {
      await sendTestNotifications(message);
      console.log("🔥 تم إرسال الإشعار التجريبي:", message);
      setMessage("");
    }
  }

  if (!isSupported) {
    return <p>الإشعارات غير مدعومة في هذا المتصفح.</p>;
  }

  return (
    <div>
      <h3>الإشعارات</h3>
      <div className="flex items-center space-x-2">
        <Switch checked={enabled} onClick={toggleSubscription} />
      </div>

      <div className="mt-2">
        <input
          type="text"
          placeholder="أدخل رسالة الإشعار"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="rounded border p-1"
        />
        <button
          onClick={sendTestNotification}
          className="ml-2 rounded bg-blue-500 px-2 py-1 text-white"
        >
          إرسال إشعار تجريبي
        </button>
      </div>
    </div>
  );
}
