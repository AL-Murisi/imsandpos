"use client";
import { useEffect, useState } from "react";

export function useUnreadNotifications() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!navigator.serviceWorker) return;

    function onMessage(event: MessageEvent) {
      console.log("📩 SW message:", event.data);

      if (event.data?.type === "UNREAD_INCREMENT") {
        setUnread(event.data.count);
      }

      if (event.data?.type === "UNREAD_CLEAR") {
        setUnread(0);
      }
    }

    navigator.serviceWorker.ready.then(() => {
      navigator.serviceWorker.addEventListener("message", onMessage);
    });

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  return { unread };
}
