"use client";

import { processSale } from "@/lib/actions/cashier";
import { offlineDb } from "./db";

let isSyncInProgress = false;

export async function syncPendingOfflineOperations() {
  if (isSyncInProgress || typeof window === "undefined" || !navigator.onLine) {
    return;
  }

  isSyncInProgress = true;
  try {
    const pending = await offlineDb.queue
      .where("status")
      .equals("pending")
      .sortBy("createdAt");

    for (const op of pending) {
      try {
        if (op.operationType === "processSale") {
          await processSale(op.payload, op.companyId);
        }

        // Remove synced operations to keep IndexedDB small and fast.
        await offlineDb.queue.delete(op.id!);
      } catch (error) {
        await offlineDb.queue.update(op.id!, {
          status: "failed",
          lastError: error instanceof Error ? error.message : "Unknown sync error",
        });
      }
    }
  } finally {
    isSyncInProgress = false;
  }
}

export async function retryFailedOfflineOperations() {
  const failed = await offlineDb.queue.where("status").equals("failed").toArray();
  await Promise.all(
    failed.map((op) =>
      offlineDb.queue.update(op.id!, { status: "pending", lastError: undefined }),
    ),
  );
  await syncPendingOfflineOperations();
}
