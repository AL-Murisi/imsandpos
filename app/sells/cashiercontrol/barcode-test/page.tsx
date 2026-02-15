"use client";

import Barcode from "react-barcode";
import { useState } from "react";

const FORMATS = [
  "CODE128",
  "CODE39",
  "EAN13",
  "EAN8",
  "UPC",
  "ITF14",
];

export default function BarcodeTestPage() {
  const [value, setValue] = useState("123456789012");
  const [format, setFormat] = useState("CODE128");

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">Barcode Test</h1>
      <p className="text-sm text-muted-foreground">
        This page only renders a barcode image for testing. It does not scan.
      </p>

      <div className="space-y-2">
        <label className="text-sm font-medium">Value</label>
        <input
          className="w-full rounded border px-3 py-2 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Enter barcode value"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Format</label>
        <select
          className="w-full rounded border px-3 py-2 text-sm"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
        >
          {FORMATS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded border p-4">
        <Barcode value={value || " "} format={format} />
      </div>
    </main>
  );
}
