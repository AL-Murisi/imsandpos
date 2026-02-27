"use client";

import { useEffect } from "react";
import {
  retryFailedOfflineOperations,
  syncPendingOfflineOperations,
} from "@/lib/offline/sync";
import { offlineDb } from "@/lib/offline/db";

export function useOfflineSync() {
  useEffect(() => {
    const handleOnline = async () => {
      await retryFailedOfflineOperations();
    };

    // Ensure IndexedDB is initialized as soon as shell mounts.
    void offlineDb.open();
    void syncPendingOfflineOperations();
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, []);
}
