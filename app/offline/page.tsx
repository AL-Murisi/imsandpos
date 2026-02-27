"use client";

import { useEffect, useState } from "react";
import { getLatestCashierUiStateCache } from "@/lib/offline/db";

type CachedOfflineState = {
  cartState?: {
    carts?: Array<{ id: string; name: string; items?: Array<{ name: string; selectedQty: number }> }>;
  };
};

export default function OfflinePage() {
  const [cached, setCached] = useState<CachedOfflineState | null>(null);

  useEffect(() => {
    const load = async () => {
      const state = await getLatestCashierUiStateCache<CachedOfflineState>();
      setCached(state);
    };
    void load();
  }, []);

  const items =
    cached?.cartState?.carts?.flatMap((c) => c.items || []).filter(Boolean) || [];

  return (
    <main style={{ padding: 40, textAlign: "center" }}>
      <h1>You're offline</h1>
      <p>Cached cashier items are shown below.</p>
      <div style={{ marginTop: 20, maxWidth: 480, marginInline: "auto", textAlign: "left" }}>
        {items.length === 0 ? (
          <p>No cached items found yet.</p>
        ) : (
          items.map((item, idx) => (
            <div
              key={`${item.name}-${idx}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: "1px solid #ddd",
              }}
            >
              <span>{item.name}</span>
              <strong>x{item.selectedQty}</strong>
            </div>
          ))
        )}
      </div>
    </main>
  );
}
