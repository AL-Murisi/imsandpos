"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";

type Props = {
  opened: boolean;
  action: () => void;
  onDetected: (code: string) => void;
};

export default function LiveBarcodeScanner({
  opened,
  action,
  onDetected,
}: Props) {
  const readerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);
  const onDetectedRef = useRef(onDetected);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const containerId = "live-qr-reader";

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  const stopScanner = async () => {
    if (!readerRef.current || !isScanningRef.current) return;
    try {
      await readerRef.current.stop();
    } catch {
      // ignore stop errors when scanner is already stopped
    } finally {
      isScanningRef.current = false;
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadCameras = async () => {
      if (!opened) return;
      setScanError(null);
      try {
        const devices = await Html5Qrcode.getCameras();
        if (isCancelled) return;

        setCameras(devices);
        if (!devices.length) {
          setScanError("No camera found on this device.");
          return;
        }

        setSelectedCameraId((prev) => prev || devices[0].id);
      } catch {
        if (!isCancelled) {
          setScanError(
            "Unable to read cameras. Please allow camera permission.",
          );
        }
      }
    };

    if (opened) {
      void loadCameras();
    } else {
      void stopScanner();
    }

    return () => {
      isCancelled = true;
    };
  }, [opened]);

  useEffect(() => {
    if (!opened) return;

    let isCancelled = false;

    const startScanner = async () => {
      setScanError(null);
      await stopScanner();

      if (!readerRef.current) {
        readerRef.current = new Html5Qrcode(containerId, {
          verbose: false,
          // Use the Html5Qrcode decoder for consistent multi-format support.
          useBarCodeDetectorIfSupported: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.CODE_93,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.UPC_EAN_EXTENSION,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.PDF_417,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.RSS_EXPANDED,
            Html5QrcodeSupportedFormats.RSS_14,
          ],
        });
      }

      try {
        const cameraConfig = selectedCameraId
          ? { deviceId: { exact: selectedCameraId } }
          : { facingMode };

        await readerRef.current.start(
          cameraConfig,
          {
            fps: 10,
            // Wider target box is better for product barcodes than a square.
            qrbox: { width: 420, height: 180 },
          },
          (decodedText, result) => {
            if (isCancelled) return;
            console.log("Decoder used:", result.result.debugData?.decoderName);
            onDetectedRef.current(decodedText);
          },
          (errorMessage) => {
            if (
              !errorMessage.includes("NotFoundException") &&
              !errorMessage.includes("No MultiFormat Readers")
            ) {
              console.warn("Scan error:", errorMessage);
            }
          },
        );
        isScanningRef.current = true;
      } catch {
        if (!isCancelled) {
          setScanError("Unable to start scanner. Check camera permission.");
        }
      }
    };

    void startScanner();

    return () => {
      isCancelled = true;
      void stopScanner();
    };
  }, [opened, selectedCameraId, facingMode]);

  if (!opened) return null;

  return (
    <div className="relative">
      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="camera-select" className="text-sm font-medium">
          Camera
        </label>
        <Button
          type="button"
          size="sm"
          variant={facingMode === "environment" ? "default" : "outline"}
          onClick={() => {
            setSelectedCameraId("");
            setFacingMode("environment");
          }}
        >
          Back
        </Button>
        <Button
          type="button"
          size="sm"
          variant={facingMode === "user" ? "default" : "outline"}
          onClick={() => {
            setSelectedCameraId("");
            setFacingMode("user");
          }}
        >
          Front
        </Button>
        <select
          id="camera-select"
          className="bg-background rounded-md border px-2 py-1 text-sm"
          value={selectedCameraId}
          onChange={(e) => setSelectedCameraId(e.target.value)}
        >
          <option value="">Auto ({facingMode})</option>
          {cameras.map((camera) => (
            <option key={camera.id} value={camera.id}>
              {camera.label || `Camera ${camera.id.slice(0, 6)}`}
            </option>
          ))}
        </select>
      </div>
      <div
        id={containerId}
        className="min-h-[320px] w-full rounded-md border"
      />
      {scanError ? (
        <p className="mt-2 text-sm text-red-600">{scanError}</p>
      ) : null}
      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="destructive"
          onClick={() => {
            void stopScanner().finally(() => action());
          }}
        >
          Close
        </Button>
      </div>
    </div>
  );
}
