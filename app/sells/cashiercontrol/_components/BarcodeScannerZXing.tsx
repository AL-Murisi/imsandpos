"use client";

import { useEffect } from "react";
import Image from "next/image";
import { toast } from "sonner";
import ScanbotSDKService from "@/lib/scanbot";

type Props = {
  action: (result: { text: string; format: string }) => void;
};

export default function BarcodeScanner({ action }: Props) {
  useEffect(() => {
    ScanbotSDKService.instance.createBarcodeScanner(
      "barcode-scanner",
      async (barcode) => {
        // 1. Create the result object
        const scanResult = {
          text: barcode.text,
          format: barcode.format,
        };

        // 2. Update the parent state via the prop
        action(scanResult);

        // 3. Keep your existing toast logic (Optional)
        if (barcode.sourceImage) {
          const jpegData = await ScanbotSDKService.instance.sdk?.imageToJpeg(
            barcode.sourceImage,
          );
          const base64Image = await ScanbotSDKService.instance.sdk?.toDataUrl(
            jpegData as unknown as ArrayBuffer,
          );

          toast(`Detected: ${barcode.text}`, {
            description: `Format: ${barcode.format}`,
            icon: (
              <div className="relative h-6 w-6 overflow-hidden rounded-sm">
                <Image
                  fill
                  src={base64Image || ""}
                  alt="Scan"
                  className="object-cover"
                />
              </div>
            ),
          });
        }
      },
    );

    return () => {
      ScanbotSDKService.instance.disposeBarcodeScanner();
    };
  }, [action]); // Added action to dependency array

  return (
    <div className="relative flex h-[400px] flex-col overflow-hidden rounded-lg border bg-black">
      <div id="barcode-scanner" className="h-full w-full" />
    </div>
  );
}

// "use client";

// import { useEffect, useRef, useState } from "react";
// import { BrowserMultiFormatReader } from "@zxing/browser";
// import { BarcodeFormat, DecodeHintType } from "@zxing/library";

// type Props = {
//   // This matches the object structure you're using in your List component
//   action: (result: { text: string }) => void;
// };

// export default function BarcodeScanner({ action }: Props) {
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const controlsRef = useRef<any>(null);

//   // REFS for Cooldown/Debounce Logic
//   const lastScanTimeRef = useRef<number>(0);
//   const lastCodeRef = useRef<string | null>(null);

//   const [isActive, setIsActive] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     if (!isActive) {
//       controlsRef.current?.stop();
//       controlsRef.current = null;
//       return;
//     }

//     if (!videoRef.current) return;

//     const hints = new Map();
//     hints.set(DecodeHintType.POSSIBLE_FORMATS, [
//       BarcodeFormat.EAN_13,
//       BarcodeFormat.UPC_A,
//       BarcodeFormat.UPC_E,
//       BarcodeFormat.CODE_128, // Added for standard product barcodes
//     ]);

//     const reader = new BrowserMultiFormatReader(hints);

//     reader
//       .decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
//         if (result) {
//           const text = result.getText();
//           const now = Date.now();

//           // 1. COOLDOWN LOGIC:
//           // If same code is seen within 2 seconds, ignore it.
//           // If it's a NEW code, add it immediately.
//           if (
//             text === lastCodeRef.current &&
//             now - lastScanTimeRef.current < 2000
//           ) {
//             return;
//           }

//           // 2. Update refs to track this successful scan
//           lastScanTimeRef.current = now;
//           lastCodeRef.current = text;

//           // 3. FIX: Passing the object expected by your Props
//           action({ text: text });

//           // Haptic feedback for mobile users
//           if (typeof window !== "undefined" && navigator.vibrate) {
//             navigator.vibrate(60);
//           }
//         }

//         if (err && err.name !== "NotFoundException") {
//           console.error("Scanner error:", err);
//         }
//       })
//       .then((controls) => {
//         controlsRef.current = controls;
//       })
//       .catch((err) => {
//         setError("Cannot access camera. Check permissions.");
//         console.error(err);
//       });

//     return () => {
//       controlsRef.current?.stop();
//     };
//   }, [isActive, action]); // dependencies

//   return (
//     <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border bg-black shadow-lg">
//       <video ref={videoRef} className="h-64 w-full object-cover" />

//       {/* Visual Overlay */}
//       {isActive && (
//         <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
//           <div className="h-32 w-64 rounded-lg border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]" />
//           <div className="mt-2 text-[10px] font-bold tracking-widest text-white uppercase opacity-50">
//             Align Barcode inside box
//           </div>
//         </div>
//       )}

//       <div className="flex justify-center gap-3 bg-white p-4">
//         {!isActive ? (
//           <button
//             onClick={() => setIsActive(true)}
//             className="w-full rounded bg-blue-600 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
//           >
//             Start Camera
//           </button>
//         ) : (
//           <button
//             onClick={() => setIsActive(false)}
//             className="w-full rounded bg-red-600 py-2 font-semibold text-white transition-colors hover:bg-red-700"
//           >
//             Stop Camera
//           </button>
//         )}
//       </div>

//       {error && (
//         <div className="bg-red-50 p-2 text-center text-xs text-red-600">
//           {error}
//         </div>
//       )}
//     </div>
//   );
// }
