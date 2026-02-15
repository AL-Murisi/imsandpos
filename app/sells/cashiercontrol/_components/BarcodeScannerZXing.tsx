// "use client";

// import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
// import { NotFoundException } from "@zxing/library";
// import { useEffect, useMemo, useRef, useState } from "react";

// type ScanResult = { text: string; format: string };

// type Props = {
//   action: (result: ScanResult) => void;
//   onError?: (message: string) => void;
// };

// export default function BarcodeScannerZXing({ action, onError }: Props) {
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const reader = useMemo(() => new BrowserMultiFormatReader(), []);
//   const controlsRef = useRef<IScannerControls | null>(null);

//   const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
//   const [activeDeviceId, setActiveDeviceId] = useState<string>("");
//   const [isScanning, setIsScanning] = useState(false);
//   const [error, setError] = useState("");

//   // NEW: State to store and display the result
//   const [lastResult, setLastResult] = useState<ScanResult | null>(null);

//   useEffect(() => {
//     BrowserMultiFormatReader.listVideoInputDevices()
//       .then((devices) => {
//         setCameras(devices);
//         if (devices.length > 0 && !activeDeviceId) {
//           setActiveDeviceId(devices[0].deviceId);
//         }
//       })
//       .catch((err) => {
//         setError(err?.message || "Failed to list cameras.");
//       });

//     return () => {
//       controlsRef.current?.stop();
//     };
//   }, [activeDeviceId]);

//   useEffect(() => {
//     if (!isScanning || !activeDeviceId || !videoRef.current) {
//       controlsRef.current?.stop();
//       controlsRef.current = null;
//       return;
//     }

//     async function startScanning() {
//       try {
//         const controls = await reader.decodeFromVideoDevice(
//           activeDeviceId,
//           videoRef.current!,
//           (result, err) => {
//             if (result) {
//               const scanData = {
//                 text: result.getText(),
//                 format: result.getBarcodeFormat().toString(),
//               };

//               // 1. Update local display state
//               setLastResult(scanData);

//               // 2. Call the parent callback
//               action(scanData);

//               // OPTIONAL: Stop scanning automatically after success
//               // setIsScanning(false);
//             }
//             if (err && !(err instanceof NotFoundException)) {
//               console.error(err);
//             }
//           },
//         );

//         controlsRef.current = controls;
//       } catch (err: any) {
//         setError(err?.message || "Failed to start scanning.");
//         setIsScanning(false);
//       }
//     }

//     startScanning();

//     return () => {
//       controlsRef.current?.stop();
//       controlsRef.current = null;
//     };
//   }, [activeDeviceId, isScanning, action, reader]);

//   return (
//     <div className="mx-auto max-w-md space-y-4 rounded-xl border bg-white p-4 shadow-sm">
//       <div className="flex flex-col gap-2 sm:flex-row">
//         <select
//           className="flex-1 rounded border bg-gray-50 p-2 text-sm text-black"
//           value={activeDeviceId}
//           onChange={(e) => setActiveDeviceId(e.target.value)}
//         >
//           {cameras.map((cam) => (
//             <option key={cam.deviceId} value={cam.deviceId}>
//               {cam.label || `Camera ${cam.deviceId.slice(0, 5)}`}
//             </option>
//           ))}
//         </select>
//         <button
//           className={`rounded px-4 py-2 font-medium transition-colors ${
//             isScanning
//               ? "bg-red-500 hover:bg-red-600"
//               : "bg-blue-600 hover:bg-blue-700"
//           } text-white`}
//           onClick={() => {
//             setIsScanning(!isScanning);
//             if (!isScanning) setLastResult(null); // Clear last result when starting new scan
//           }}
//         >
//           {isScanning ? "Stop" : "Start Scan"}
//         </button>
//       </div>

//       {error && <p className="text-xs font-medium text-red-500">{error}</p>}

//       {/* Video Container */}
//       <div className="relative aspect-video overflow-hidden rounded-lg border-2 border-gray-100 bg-black">
//         <video
//           ref={videoRef}
//           className="h-full w-full object-cover"
//           muted
//           playsInline
//         />

//         {/* Scanner Overlay UI */}
//         {isScanning && (
//           <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
//             <div className="h-48 w-48 rounded-lg border-2 border-blue-400 opacity-50"></div>
//             <div className="absolute top-1/2 right-0 left-0 h-[2px] animate-pulse bg-red-500 shadow-[0_0_8px_red]"></div>
//           </div>
//         )}
//       </div>

//       {/* NEW: Result Display Area */}
//       {lastResult && (
//         <div className="animate-in fade-in slide-in-from-top-2 rounded-lg border border-green-200 bg-green-50 p-3">
//           <p className="text-xs font-bold tracking-wider text-green-800 uppercase">
//             Scanned Barcode:
//           </p>
//           <p className="font-mono text-lg break-all text-green-900">
//             {lastResult.text}
//           </p>
//           <p className="mt-1 text-[10px] text-green-600">
//             Format: {lastResult.format}
//           </p>
//         </div>
//       )}
//     </div>
//   );
// }

// "use client";

// import { useEffect, useRef, useState } from "react";
// import { BrowserMultiFormatReader } from "@zxing/browser";
// import { Result } from "@zxing/library";

// // Aspect ratio and crop size factor
// const DESIRED_CROP_ASPECT_RATIO = 3 / 2;
// const CROP_SIZE_FACTOR = 0.4;

// export default function CameraView() {
//   const videoRef = useRef<HTMLVideoElement>(null);
//   const displayCroppedCanvasRef = useRef<HTMLCanvasElement>(null);
//   const cropOverlayRef = useRef<HTMLDivElement>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [barcodeResult, setBarcodeResult] = useState<string | null>(null);
//   const codeReader = useRef(new BrowserMultiFormatReader());

//   useEffect(() => {
//     let intervalId: NodeJS.Timeout | null = null;

//     const startCamera = async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
//           video: { facingMode: { ideal: "environment" } },
//         });
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//           videoRef.current.onloadedmetadata = () => {
//             videoRef.current?.play();
//             intervalId = setInterval(captureFrameAndCrop, 100);
//           };
//         }
//       } catch (err) {
//         console.error("Camera error:", err);
//         setError("Unable to access the camera. Please check permissions.");
//       }
//     };

//     const captureFrameAndCrop = () => {
//       if (
//         !videoRef.current ||
//         !displayCroppedCanvasRef.current ||
//         !cropOverlayRef.current
//       )
//         return;

//       const video = videoRef.current;
//       const displayCanvas = displayCroppedCanvasRef.current;
//       const displayContext = displayCanvas.getContext("2d");
//       const overlayDiv = cropOverlayRef.current;

//       if (!displayContext) return;

//       const tempCanvas = document.createElement("canvas");
//       const tempContext = tempCanvas.getContext("2d");
//       if (!tempContext) return;

//       tempCanvas.width = video.videoWidth;
//       tempCanvas.height = video.videoHeight;
//       tempContext.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

//       let cropWidth, cropHeight;
//       const videoRatio = video.videoWidth / video.videoHeight;

//       if (videoRatio / DESIRED_CROP_ASPECT_RATIO > 1) {
//         cropHeight = video.videoHeight * CROP_SIZE_FACTOR;
//         cropWidth = cropHeight * DESIRED_CROP_ASPECT_RATIO;
//       } else {
//         cropWidth = video.videoWidth * CROP_SIZE_FACTOR;
//         cropHeight = cropWidth / DESIRED_CROP_ASPECT_RATIO;
//       }

//       cropWidth = Math.min(cropWidth, video.videoWidth);
//       cropHeight = Math.min(cropHeight, video.videoHeight);

//       const MIN_CROP_WIDTH = 240;
//       const MAX_CROP_WIDTH = 600;
//       const MIN_CROP_HEIGHT = 80;
//       const MAX_CROP_HEIGHT = 400;

//       cropWidth = Math.max(MIN_CROP_WIDTH, Math.min(MAX_CROP_WIDTH, cropWidth));
//       cropHeight = Math.max(
//         MIN_CROP_HEIGHT,
//         Math.min(MAX_CROP_HEIGHT, cropHeight),
//       );

//       const cropX = (video.videoWidth - cropWidth) / 2;
//       const cropY = (video.videoHeight - cropHeight) / 2;

//       displayCanvas.width = cropWidth;
//       displayCanvas.height = cropHeight;

//       displayContext.drawImage(
//         tempCanvas,
//         cropX,
//         cropY,
//         cropWidth,
//         cropHeight,
//         0,
//         0,
//         cropWidth,
//         cropHeight,
//       );

//       overlayDiv.style.position = "absolute";
//       overlayDiv.style.left = `${(cropX / video.videoWidth) * 100}%`;
//       overlayDiv.style.top = `${(cropY / video.videoHeight) * 100}%`;
//       overlayDiv.style.width = `${(cropWidth / video.videoWidth) * 100}%`;
//       overlayDiv.style.height = `${(cropHeight / video.videoHeight) * 100}%`;
//       overlayDiv.style.border = "2px solid white";
//       overlayDiv.style.borderRadius = "0.5rem";
//       overlayDiv.style.pointerEvents = "none";
//       overlayDiv.style.boxSizing = "border-box";

//       const decodeCanvas = async () => {
//         try {
//           const result: Result =
//             await codeReader.current.decodeFromCanvas(displayCanvas);
//           console.log("Decoded barcode:", result.getText());
//           setBarcodeResult(result.getText());
//         } catch (err: unknown) {
//           if (err instanceof Error && err.name !== "NotFoundException") {
//             console.error("Decoding error:", err);
//           }
//         }
//       };

//       decodeCanvas(); // Call the async function
//     };

//     startCamera();

//     return () => {
//       if (videoRef.current?.srcObject) {
//         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
//         tracks.forEach((track) => track.stop());
//       }
//       if (intervalId) clearInterval(intervalId);
//     };
//   }, []);

//   return (
//     <div
//       style={{
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         fontFamily: "sans-serif",
//       }}
//     >
//       <h2
//         style={{
//           fontSize: "1.5rem",
//           fontWeight: "bold",
//         }}
//       >
//         Camera View for Barcode Scanning
//       </h2>

//       <div
//         style={{
//           position: "relative",
//           width: "100%",
//           maxWidth: "400px",
//           overflow: "hidden",
//         }}
//       >
//         <video
//           ref={videoRef}
//           autoPlay
//           playsInline
//           muted
//           style={{
//             width: "100%",
//             height: "100%",
//             objectFit: "cover",
//           }}
//         />
//         <div ref={cropOverlayRef}></div>
//       </div>

//       {error && (
//         <p style={{ marginTop: "1rem", fontSize: "0.875rem" }}>{error}</p>
//       )}

//       <p
//         style={{
//           fontSize: "0.875rem",
//           textAlign: "center",
//         }}
//       >
//         Camera active. The white border indicates the barcode scanning area.
//       </p>

//       <h3
//         style={{
//           fontSize: "1.25rem",
//           fontWeight: "semibold",
//           color: "#1f2937",
//         }}
//       >
//         Cropped Barcode Scan Area:
//       </h3>

//       <canvas
//         ref={displayCroppedCanvasRef}
//         style={{
//           border: "2px solid #3b82f6",
//           borderRadius: "0.5rem",
//           boxShadow:
//             "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
//           maxWidth: "100%",
//           height: "auto",
//           display: "block",
//           minWidth: "240px",
//           minHeight: "80px",
//         }}
//       >
//         Your browser does not support the canvas element.
//       </canvas>

//       <p
//         style={{
//           color: "#9ca3af",
//           fontSize: "0.75rem",
//         }}
//       >
//         This canvas updates every 0.1 seconds with the focused area.
//       </p>
//       <div
//         style={{
//           padding: "1rem",
//           border: "2px dashed #10b981",
//           borderRadius: "0.5rem",
//           backgroundColor: "#ecfdf5",
//           color: "#065f46",
//           fontSize: "1rem",
//           fontWeight: "500",
//           textAlign: "center",
//         }}
//       >
//         ✅ Barcode : {barcodeResult}
//       </div>
//     </div>
//   );
// }
"use client";

import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  action: (text: string) => void;
};

export default function FastPOSScanner({ action }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isScanning, setIsScanning] = useState(false);

  const reader = useMemo(
    () =>
      new BrowserMultiFormatReader(undefined, {
        delayBetweenScanAttempts: 70, // ⚡ fast
      }),
    [],
  );

  const startScan = async () => {
    if (!videoRef.current) return;

    const devices = await BrowserMultiFormatReader.listVideoInputDevices();

    const backCamera =
      devices.find((d) => d.label.toLowerCase().includes("back")) || devices[0];

    if (!backCamera) return;

    // 🔥 Force HD for small barcode clarity
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: backCamera.deviceId,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "environment",
      },
    });

    streamRef.current = stream;
    videoRef.current.srcObject = stream;

    const controls = await reader.decodeFromVideoDevice(
      backCamera.deviceId,
      videoRef.current,
      (result, err) => {
        if (result) {
          action(result.getText());
        }

        if (err && !(err instanceof NotFoundException)) {
          console.error(err);
        }
      },
    );

    controlsRef.current = controls;
    setIsScanning(true);
  };

  const stopScan = () => {
    // Stop ZXing
    controlsRef.current?.stop();
    controlsRef.current = null;

    // 🔥 Stop camera stream properly
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScan(); // cleanup on unmount
    };
  }, []);

  return (
    <div className="space-y-4">
      <button
        onClick={() => (isScanning ? stopScan() : startScan())}
        className={`rounded px-4 py-2 text-white ${
          isScanning ? "bg-red-500" : "bg-blue-600"
        }`}
      >
        {isScanning ? "Stop Scan" : "Start Scan"}
      </button>

      <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
        />

        {/* Center focus box for small barcode */}
        {isScanning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-36 w-64 rounded-lg border-2 border-green-400 shadow-[0_0_12px_green]" />
          </div>
        )}
      </div>
    </div>
  );
}
