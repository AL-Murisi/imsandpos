// "use client";

// import dynamic from "next/dynamic";
// import Barcode from "react-barcode";
// import type { Options } from "react-barcode";
// import { useEffect, useMemo, useState } from "react";

// const BarcodeScanner = dynamic(
//   () => import("../_components/BarcodeScannerZXing"),
//   { ssr: false },
// );

// type BarcodeFormat = NonNullable<Options["format"]>;

// type BarcodeItem = {
//   id: string;
//   label: string;
//   value: string;
//   rawFormat: string;
//   format?: BarcodeFormat;
//   createdAt: string;
// };

// const STORAGE_KEY = "cashiercontrol.barcodes.v1";

// const mapZxingFormat = (rawFormat: string): BarcodeFormat | undefined => {
//   switch (rawFormat) {
//     case "CODE_128":
//       return "CODE128";
//     case "CODE_39":
//       return "CODE39";
//     case "EAN_13":
//       return "EAN13";
//     case "EAN_8":
//       return "EAN8";
//     case "UPC_A":
//       return "UPC";
//     case "UPC_E":
//       return "UPCE";
//     case "ITF":
//       return "ITF";
//     case "CODABAR":
//       return "codabar";
//     default:
//       return undefined;
//   }
// };

// const createId = () =>
//   typeof crypto !== "undefined" && "randomUUID" in crypto
//     ? crypto.randomUUID()
//     : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// const normalizeLabel = (format: string, value: string) => {
//   const suffix = value.length > 4 ? value.slice(-4) : value;
//   return `${format} • ${suffix}`;
// };

// export default function BarcodeScanPage() {
//   const [barcodes, setBarcodes] = useState<BarcodeItem[]>([]);
//   const [selectedId, setSelectedId] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const raw = localStorage.getItem(STORAGE_KEY);
//     if (!raw) return;
//     try {
//       const parsed = JSON.parse(raw) as BarcodeItem[];
//       if (Array.isArray(parsed)) {
//         setBarcodes(parsed);
//         if (parsed[0]) {
//           setSelectedId(parsed[0].id);
//         }
//       }
//     } catch (err) {
//       console.error("Failed to read barcode storage:", err);
//       setError("Failed to load saved barcodes.");
//     }
//   }, []);

//   useEffect(() => {
//     localStorage.setItem(STORAGE_KEY, JSON.stringify(barcodes));
//   }, [barcodes]);

//   const selected = useMemo(
//     () => barcodes.find((item) => item.id === selectedId) ?? null,
//     [barcodes, selectedId],
//   );

//   const handleScan = (result: { text: string; format: string }) => {
//     const rawFormat = result.format;
//     const format = mapZxingFormat(rawFormat);
//     const value = result.text;

//     setBarcodes((prev) => {
//       const existing = prev.find(
//         (item) => item.value === value && item.rawFormat === rawFormat,
//       );
//       if (existing) {
//         setSelectedId(existing.id);
//         return prev;
//       }

//       const nextItem: BarcodeItem = {
//         id: createId(),
//         label: normalizeLabel(format ?? rawFormat, value),
//         value,
//         rawFormat,
//         format,
//         createdAt: new Date().toISOString(),
//       };

//       setSelectedId(nextItem.id);
//       return [nextItem, ...prev];
//     });
//   };

//   const handleDownloadBackup = () => {
//     const element = document.createElement("a");
//     const file = new Blob([JSON.stringify(barcodes, null, 2)], {
//       type: "application/json",
//     });
//     element.href = URL.createObjectURL(file);
//     element.download = "codex-backup.json";
//     document.body.appendChild(element);
//     element.click();
//     document.body.removeChild(element);
//     URL.revokeObjectURL(element.href);
//   };

//   const handleUploadBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (!file) return;

//     const reader = new FileReader();
//     reader.onload = (e) => {
//       try {
//         const parsed = JSON.parse(String(e.target?.result ?? "[]")) as
//           | BarcodeItem[]
//           | null;
//         if (!Array.isArray(parsed)) {
//           setError("Invalid backup format.");
//           return;
//         }
//         setBarcodes(parsed);
//         setSelectedId(parsed[0]?.id ?? null);
//       } catch (err) {
//         console.error("Failed to restore backup:", err);
//         setError("Failed to restore backup.");
//       }
//     };
//     reader.readAsText(file);
//     event.target.value = "";
//   };

//   return (
//     <main className="mx-auto max-w-2xl space-y-6 p-4">
//       <div className="space-y-1">
//         <h1 className="text-xl font-semibold">Barcode Wallet</h1>
//         <p className="text-muted-foreground text-sm">
//           Scan a barcode, save it offline, and tap a button to display it.
//         </p>
//       </div>

//       <BarcodeScanner action={handleScan} />

//       {error ? (
//         <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
//           {error}
//         </div>
//       ) : null}

//       <section className="space-y-3">
//         <div className="flex flex-wrap gap-2">
//           {barcodes.length === 0 ? (
//             <span className="text-sm text-muted-foreground">
//               No saved barcodes yet.
//             </span>
//           ) : (
//             barcodes.map((item) => (
//               <button
//                 key={item.id}
//                 type="button"
//                 onClick={() => setSelectedId(item.id)}
//                 className={`rounded border px-3 py-2 text-sm transition ${
//                   item.id === selectedId
//                     ? "border-blue-600 bg-blue-50 text-blue-700"
//                     : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
//                 }`}
//               >
//                 {item.label}
//               </button>
//             ))
//           )}
//         </div>

//         {selected ? (
//           <div className="space-y-2 rounded border bg-white p-4">
//             <div className="text-xs uppercase tracking-wide text-muted-foreground">
//               {selected.rawFormat}
//             </div>
//             <div className="text-sm font-medium">{selected.value}</div>
//             <div className="flex justify-center overflow-x-auto rounded border bg-white p-4">
//               <Barcode
//                 value={selected.value || " "}
//                 format={selected.format}
//                 height={200}
//               />
//             </div>
//           </div>
//         ) : null}
//       </section>

//       <section className="flex flex-wrap gap-3">
//         <button
//           type="button"
//           onClick={handleDownloadBackup}
//           className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
//           disabled={barcodes.length === 0}
//         >
//           Download Backup
//         </button>
//         <label className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
//           Restore Backup
//           <input
//             hidden
//             accept="application/json"
//             type="file"
//             onChange={handleUploadBackup}
//           />
//         </label>
//       </section>
//     </main>
//   );
// }
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
// import BarcodeScanner from "../_components/barcodetesting";

const BarcodeScanner = dynamic(() => import("../_components/barcodetesting"), {
  ssr: false,
});

export default function CashierClient() {
  const [openScanner, setOpenScanner] = useState(false);

  const handleDetected = (code: string) => {
    console.log("Scanned:", code);

    // 🔥 Example: find product
    // const product = products.find((p: any) => p.barcode === code);

    // if (product) {
    //   console.log("Product found:", product);
    //   // add to cart here
    // }

    setOpenScanner(false);
  };

  return (
    <>
      <Button onClick={() => setOpenScanner(true)}>Open Scanner</Button>

      <BarcodeScanner
        opened={openScanner}
        onClose={() => setOpenScanner(false)}
        onDetected={handleDetected}
      />
    </>
  );
}
