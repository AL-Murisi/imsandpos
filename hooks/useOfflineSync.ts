"use client";

import { useEffect } from "react";
import {
  retryFailedOfflineOperations,
  syncPendingOfflineOperations,
} from "@/lib/offline/sync";
import { offlineDb } from "@/lib/offline/db";

export function useOfflineSync() {
  useEffect(() => {
    const runSync = async () => {
      if (typeof window === "undefined" || !navigator.onLine) return;
      await retryFailedOfflineOperations();
      await syncPendingOfflineOperations();
    };

    // Ensure IndexedDB is initialized as soon as shell mounts.
    void offlineDb.open();
    void runSync();

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void runSync();
      }
    };

    const heartbeat = window.setInterval(() => {
      void runSync();
    }, 30000);

    window.addEventListener("online", runSync);
    window.addEventListener("focus", runSync);
    window.addEventListener("pageshow", runSync);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(heartbeat);
      window.removeEventListener("online", runSync);
      window.removeEventListener("focus", runSync);
      window.removeEventListener("pageshow", runSync);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);
}
