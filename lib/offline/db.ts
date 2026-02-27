"use client";

import Dexie, { Table } from "dexie";

export type OfflineCacheRecord = {
  key: string;
  payload: unknown;
  updatedAt: number;
};

export type OfflineQueueOperation = {
  id?: number;
  operationType: "processSale";
  companyId: string;
  payload: unknown;
  status: "pending" | "synced" | "failed";
  createdAt: number;
  lastError?: string;
  syncedAt?: number;
};

class OfflineDatabase extends Dexie {
  cache!: Table<OfflineCacheRecord, string>;
  queue!: Table<OfflineQueueOperation, number>;

  constructor() {
    super("ims-offline-db");
    this.version(1).stores({
      cache: "key, updatedAt",
      queue: "++id, operationType, companyId, status, createdAt",
    });
  }
}

export const offlineDb = new OfflineDatabase();

export const offlineCacheKeys = {
  cashierBootstrap: (companyId: string) => `cashier:bootstrap:${companyId}`,
  cashierUiState: (companyId: string) => `cashier:ui:${companyId}`,
  cashierSession: "cashier:session",
};

export async function setOfflineCache(key: string, payload: unknown) {
  await offlineDb.cache.put({ key, payload, updatedAt: Date.now() });
}

export async function getOfflineCache<T>(key: string): Promise<T | null> {
  const row = await offlineDb.cache.get(key);
  return (row?.payload as T | undefined) ?? null;
}

export async function enqueueOfflineOperation(
  op: Omit<OfflineQueueOperation, "id" | "status" | "createdAt">,
) {
  return offlineDb.queue.add({
    ...op,
    status: "pending",
    createdAt: Date.now(),
  });
}

export async function getLatestCashierUiStateCache<T>() {
  const all = await offlineDb.cache.toArray();
  const candidates = all
    .filter((row) => row.key.startsWith("cashier:ui:"))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return (candidates[0]?.payload as T | undefined) ?? null;
}
