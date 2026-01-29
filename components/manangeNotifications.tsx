"use client";

import { subscribeUser, unsubscribeUser } from "@/lib/actions/notification";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import {
  checkPermissionStateAndAct,
  registerAndSubscribe,
  notificationUnsupported,
} from "@/hooks/Push";
import { sendTestNotifications } from "@/lib/actions/banks";

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
  const [unsupported, setUnsupported] = useState<boolean>(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const isUnsupported = notificationUnsupported();
    setUnsupported(isUnsupported);
    if (isUnsupported) {
      return;
    }
    checkPermissionStateAndAct(setSubscription);
  }, []);
  async function sendWebPush(message: string) {
    if (!message) return alert("Message is empty");
    if (!subscription) return alert("No subscription");

    try {
      await fetch("/api/web-push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription,
          title: "Test Notification",
          body: message,
        }),
      });
      // alert("Push sent 🚀");
    } catch (err) {
      console.error(err);
      alert("Failed to send push");
    }
  }
  return (
    <main>
      ...
      <button
        disabled={unsupported}
        onClick={() => registerAndSubscribe(setSubscription)}
      >
        {unsupported
          ? "Notification Unsupported"
          : subscription
            ? "Notification allowed"
            : "Allow notification"}
      </button>
      ...{" "}
      {subscription ? (
        <>
          <input
            placeholder={"Type push message ..."}
            value={message ?? ""}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button onClick={() => sendWebPush(message ?? "")}>
            Test Web Push
          </button>
        </>
      ) : null}
      {/* <code>
        {subscription
          ? JSON.stringify(subscription?.toJSON(), undefined, 2)
          : "There is no subscription"}
      </code> */}
      ...
    </main>
  );
}
