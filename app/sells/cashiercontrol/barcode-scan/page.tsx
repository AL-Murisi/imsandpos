"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
const BarcodeScanner = dynamic(
  () => import("../_components/BarcodeScannerZXing"),
  {
    ssr: false,
  },
);
export default function BarcodeScanPage() {
  const [last, setLast] = useState<{ text: string; format: string } | null>(
    null,
  );

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Barcode Scan Test</h1>
      <p className="text-muted-foreground text-sm">
        Uses @zxing/browser to scan with the camera. Test-only page.
      </p>

      <BarcodeScanner />

      {last ? (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          Last scan: {last.text} ({last.format})
        </div>
      ) : null}
    </main>
  );
}
