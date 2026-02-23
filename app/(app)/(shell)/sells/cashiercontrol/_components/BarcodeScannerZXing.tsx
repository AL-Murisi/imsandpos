"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { useZxing } from "react-zxing";

type Props = {
  action: (result: { text: string; format: string }) => void;
};

export default function BarcodeScanner({ action }: Props) {
  const actionRef = useRef(action);
  const lastScanTimeRef = useRef<number>(0);
  const lastCodeRef = useRef<string | null>(null);
  const hints = useMemo(() => {
    const map = new Map();
    map.set(DecodeHintType.TRY_HARDER, true);
    map.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
    ]);
    return map;
  }, []);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  useEffect(() => {
    actionRef.current = action;
  }, [action]);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera API is not available in this browser.");
      return;
    }

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (window.location.protocol !== "https:" && !isLocalhost) {
      setError("Camera requires HTTPS (or localhost).");
      return;
    }

    setError(null);

    const loadDevices = async () => {
      try {
        const availableDevices =
          await navigator.mediaDevices.enumerateDevices();
        const videoDevices = availableDevices.filter(
          (device) => device.kind === "videoinput",
        );

        if (videoDevices.length === 0) {
          setError("No cameras found.");
          setDevices([]);
          setSelectedDeviceId("");
          return;
        }

        setDevices(videoDevices);
        setSelectedDeviceId((prev) => prev || videoDevices[0]?.deviceId || "");
      } catch (err) {
        console.error("Failed to enumerate devices:", err);
        setError("Failed to find cameras. Check permissions.");
      }
    };

    void loadDevices();
  }, []);

  useEffect(() => {
    if (!isActive) return;

    const promptPermissionAndRefresh = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
        const refreshed = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = refreshed.filter(
          (device) => device.kind === "videoinput",
        );
        if (videoDevices.length > 0) {
          setDevices(videoDevices);
          setSelectedDeviceId(
            (prev) => prev || videoDevices[0]?.deviceId || "",
          );
        }
      } catch (err) {
        console.error("Camera permission failed:", err);
        setError("Camera permission denied.");
      }
    };

    void promptPermissionAndRefresh();
  }, [isActive]);

  const handleDecodeResult = (result: {
    getText: () => string;
    getBarcodeFormat: () => { toString: () => string };
  }) => {
    const text = result.getText();
    const now = Date.now();

    if (text === lastCodeRef.current && now - lastScanTimeRef.current < 2000) {
      return;
    }

    lastScanTimeRef.current = now;
    lastCodeRef.current = text;
    actionRef.current({
      text,
      format: result.getBarcodeFormat().toString(),
    });

    if (navigator.vibrate) {
      navigator.vibrate(60);
    }
  };

  const handleDecodeError = (error: { name?: string }) => {
    if (error.name !== "NotFoundException") {
      console.error("Decode error:", error);
    }
  };

  const handleError = (error: unknown) => {
    if (error instanceof Error && error.name !== "NotFoundException") {
      console.error("Scanner error:", error);
    }
  };

  const zxingOptions = selectedDeviceId
    ? {
        deviceId: selectedDeviceId,
        paused: !isActive,
        hints,
        timeBetweenDecodingAttempts: 200,
        onDecodeResult: handleDecodeResult,
        onDecodeError: handleDecodeError,
        onError: handleError,
      }
    : {
        constraints: {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        paused: !isActive,
        onDecodeResult: handleDecodeResult,
        onDecodeError: handleDecodeError,
        onError: handleError,
      };

  const { ref } = useZxing(zxingOptions);

  return (
    <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border bg-black shadow-lg">
      <video
        ref={ref}
        className={`h-64 w-full object-cover ${isActive ? "" : "hidden"}`}
        autoPlay
        muted
        playsInline
      />
      {!isActive ? (
        <div className="flex h-64 w-full items-center justify-center text-sm text-white/70">
          Camera is stopped
        </div>
      ) : null}

      {isActive && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="h-32 w-64 rounded-lg border-2 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]" />
          <div className="mt-2 text-[10px] font-bold tracking-widest text-white uppercase opacity-50">
            Align Barcode inside box
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 bg-white p-4">
        <label className="text-xs font-semibold text-gray-600">Camera</label>
        <select
          className="w-full rounded border border-gray-300 p-2 text-sm"
          value={selectedDeviceId}
          onChange={(event) => setSelectedDeviceId(event.target.value)}
        >
          {devices.map((device, index) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${index + 1}`}
            </option>
          ))}
        </select>

        {!isActive ? (
          <button
            onClick={() => setIsActive(true)}
            className="w-full rounded bg-blue-600 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Start Camera
          </button>
        ) : (
          <button
            onClick={() => setIsActive(false)}
            className="w-full rounded bg-red-600 py-2 font-semibold text-white transition-colors hover:bg-red-700"
          >
            Stop Camera
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 p-2 text-center text-xs text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
// "use client";

// import { useEffect } from "react";
// import Image from "next/image";
// import { toast } from "sonner";
// import ScanbotSDKService from "@/lib/scanbot";

// type Props = {
//   action: (result: { text: string; format: string }) => void;
// };

// export default function BarcodeScanner({ action }: Props) {
//   useEffect(() => {
//     ScanbotSDKService.instance.createBarcodeScanner(
//       "barcode-scanner",
//       async (barcode) => {
//         // 1. Create the result object
//         const scanResult = {
//           text: barcode.text,
//           format: barcode.format,
//         };

//         // 2. Update the parent state via the prop
//         action(scanResult);

//         // 3. Keep your existing toast logic (Optional)
//         if (barcode.sourceImage) {
//           const jpegData = await ScanbotSDKService.instance.sdk?.imageToJpeg(
//             barcode.sourceImage,
//           );
//           const base64Image = await ScanbotSDKService.instance.sdk?.toDataUrl(
//             jpegData as unknown as ArrayBuffer,
//           );

//           toast(`Detected: ${barcode.text}`, {
//             description: `Format: ${barcode.format}`,
//             icon: (
//               <div className="relative h-6 w-6 overflow-hidden rounded-sm">
//                 <Image
//                   fill
//                   src={base64Image || ""}
//                   alt="Scan"
//                   className="object-cover"
//                 />
//               </div>
//             ),
//           });
//         }
//       },
//     );

//     return () => {
//       ScanbotSDKService.instance.disposeBarcodeScanner();
//     };
//   }, [action]); // Added action to dependency array

//   return (
//     <div className="relative flex h-[400px] flex-col overflow-hidden rounded-lg border bg-black">
//       <div id="barcode-scanner" className="h-full w-full" />
//     </div>
//   );
// }

// "use client";

// import { useEffect, useRef, useState } from "react";
// import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
// import {
//   BarcodeFormat,
//   DecodeHintType,
//   Exception,
//   Result,
// } from "@zxing/library";

// type Props = {
//   // This matches the object structure you're using in your List component
//   action: (result: { text: string; format: string }) => void;
// };

// export default function BarcodeScanner({ action }: Props) {
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const controlsRef = useRef<IScannerControls | null>(null);
//   const actionRef = useRef(action);

//   // REFS for Cooldown/Debounce Logic
//   const lastScanTimeRef = useRef<number>(0);
//   const lastCodeRef = useRef<string | null>(null);

//   const [isActive, setIsActive] = useState(false);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     actionRef.current = action;
//   }, [action]);

//   useEffect(() => {
//     if (!isActive) {
//       controlsRef.current?.stop();
//       controlsRef.current = null;
//       return;
//     }

//     if (!videoRef.current) return;

//     if (!navigator.mediaDevices?.getUserMedia) {
//       setError("Camera API is not available in this browser.");
//       return;
//     }

//     const isLocalhost =
//       window.location.hostname === "localhost" ||
//       window.location.hostname === "127.0.0.1";

//     if (window.location.protocol !== "https:" && !isLocalhost) {
//       setError("Camera requires HTTPS (or localhost).");
//       return;
//     }

//     setError(null);

//     const videoEl = videoRef.current;
//     videoEl.setAttribute("playsinline", "true");
//     videoEl.setAttribute("muted", "true");
//     videoEl.muted = true;
//     videoEl.autoplay = true;

//     const hints = new Map<DecodeHintType, unknown>();
//     hints.set(DecodeHintType.POSSIBLE_FORMATS, [
//       BarcodeFormat.EAN_8,
//       BarcodeFormat.EAN_13,
//       BarcodeFormat.UPC_A,
//       BarcodeFormat.UPC_E,
//       BarcodeFormat.CODE_128,
//       BarcodeFormat.CODE_39,
//       BarcodeFormat.CODE_93,
//       BarcodeFormat.CODABAR,
//       BarcodeFormat.ITF,
//       BarcodeFormat.RSS_14,
//     ]);
//     hints.set(DecodeHintType.TRY_HARDER, true);

//     const reader = new BrowserMultiFormatReader(hints);
//     let cancelled = false;

//     const onDecode = (
//       result: Result | undefined,
//       err: Exception | undefined,
//       _controls: IScannerControls,
//     ) => {
//       if (result) {
//         const text = result.getText();
//         const now = Date.now();

//         if (
//           text === lastCodeRef.current &&
//           now - lastScanTimeRef.current < 2000
//         ) {
//           return;
//         }

//         lastScanTimeRef.current = now;
//         lastCodeRef.current = text;
//         actionRef.current({
//           text,
//           format: result.getBarcodeFormat().toString(),
//         });

//         if (navigator.vibrate) {
//           navigator.vibrate(60);
//         }
//       }

//       if (
//         err &&
//         err.name !== "NotFoundException" &&
//         err.name !== "ChecksumException" &&
//         err.name !== "FormatException"
//       ) {
//         console.error("Scanner error:", err);
//       }
//     };

//     const startScanner = async () => {
//       try {
//         const constraints: MediaStreamConstraints = {
//           audio: false,
//           video: {
//             facingMode: { ideal: "environment" },
//             width: { ideal: 1280 },
//             height: { ideal: 720 },
//           },
//         };

//         const controls = await reader.decodeFromConstraints(
//           constraints,
//           videoEl,
//           onDecode,
//         );

//         if (cancelled) {
//           controls.stop();
//           return;
//         }
//         controlsRef.current = controls;
//       } catch (firstErr) {
//         try {
//           const controls = await reader.decodeFromVideoDevice(
//             undefined,
//             videoEl,
//             onDecode,
//           );

//           if (cancelled) {
//             controls.stop();
//             return;
//           }
//           controlsRef.current = controls;
//         } catch (secondErr) {
//           if (!cancelled) {
//             setError("Cannot access camera. Check permissions.");
//             console.error("Scanner startup failed:", firstErr, secondErr);
//           }
//         }
//       }
//     };

//     void startScanner();

//     return () => {
//       cancelled = true;
//       controlsRef.current?.stop();
//       controlsRef.current = null;
//       BrowserMultiFormatReader.releaseAllStreams();
//     };
//   }, [isActive]);

//   return (
//     <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-lg border bg-black shadow-lg">
//       <video
//         ref={videoRef}
//         className="h-64 w-full object-cover"
//         autoPlay
//         muted
//         playsInline
//       />

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
