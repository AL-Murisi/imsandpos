// "use client";

// import { subscribeUser, unsubscribeUser } from "@/lib/actions/notification";
// import { useEffect, useState } from "react";
// import { Switch } from "@/components/ui/switch";
// import {
//   checkPermissionStateAndAct,
//   registerAndSubscribe,
//   notificationUnsupported,
// } from "@/hooks/Push";
// import { sendTestNotifications } from "@/lib/actions/banks";

// function urlBase64ToUint8Array(base64String: string) {
//   const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
//   const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

//   const rawData = window.atob(base64);
//   const outputArray = new Uint8Array(rawData.length);

//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }

// export function PushNotificationManager() {
//   const [unsupported, setUnsupported] = useState<boolean>(false);
//   const [subscription, setSubscription] = useState<PushSubscription | null>(
//     null,
//   );
//   const [message, setMessage] = useState<string | null>(null);

//   useEffect(() => {
//     const isUnsupported = notificationUnsupported();
//     setUnsupported(isUnsupported);
//     if (isUnsupported) {
//       return;
//     }
//     checkPermissionStateAndAct(setSubscription);
//   }, []);
//   async function sendWebPush(message: string) {
//     if (!message) return alert("Message is empty");
//     if (!subscription) return alert("No subscription");

//     try {
//       await fetch("/api/web-push/send", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           subscription,
//           title: "Test Notification",
//           body: message,
//         }),
//       });
//       // alert("Push sent 🚀");
//     } catch (err) {
//       console.error(err);
//       alert("Failed to send push");
//     }
//   }
//   return (
//     <main>
//       ...
//       <button
//         disabled={unsupported}
//         onClick={() => registerAndSubscribe(setSubscription)}
//       >
//         {unsupported
//           ? "Notification Unsupported"
//           : subscription
//             ? "Notification allowed"
//             : "Allow notification"}
//       </button>
//       ...{" "}
//       {subscription ? (
//         <>
//           <input
//             placeholder={"Type push message ..."}
//             value={message ?? ""}
//             onChange={(e) => setMessage(e.target.value)}
//           />
//           <button onClick={() => sendWebPush(message ?? "")}>
//             Test Web Push
//           </button>
//         </>
//       ) : null}
//       <code>
//         {subscription
//           ? JSON.stringify(subscription?.toJSON(), undefined, 2)
//           : "There is no subscription"}
//       </code>
//       ...
//     </main>
//   );
// }
"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

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
  const [subscription, setSubscription] = useState<PushSubscription | null>(
    null,
  );
  const [message, setMessage] = useState("");

  // Register Service Worker
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => console.log("Service Worker registered"))
        .catch(console.error);
    }
  }, []);

  // Subscribe to push notifications
  const subscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      console.log("Push subscription:", sub);
      setSubscription(sub);

      alert("Subscribed to push notifications!");
    } catch (err) {
      console.error(err);
      alert("Failed to subscribe");
    }
  };

  // Send push
  const sendPush = async () => {
    if (!subscription) return alert("No subscription!");
    if (!message) return alert("Message is empty!");

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

      alert("Push sent 🚀");
    } catch (err) {
      console.error(err);
      alert("Failed to send push");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <button onClick={subscribe}>
        {subscription ? "Subscribed ✅" : "Subscribe to Push"}
      </button>

      {subscription && (
        <>
          <div style={{ marginTop: 10 }}>
            <input
              placeholder="Type a push message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button onClick={sendPush}>Send Push</button>
          </div>
          {/* <pre>{JSON.stringify(subscription.toJSON(), null, 2)}</pre> */}
        </>
      )}
    </div>
  );
}
