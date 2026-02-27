"use client";

import { useEffect, useRef } from "react";
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
  const containerId = "live-qr-reader";

  useEffect(() => {
    if (!opened) return;

    const isNativeSupported = "BarcodeDetector" in window;

    const html5QrCode = new Html5Qrcode(containerId, {
      verbose: false,
      useBarCodeDetectorIfSupported: true,
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

    readerRef.current = html5QrCode;

    html5QrCode
      .start(
        { facingMode: "environment" },
        {
          fps: 5, // native API can handle higher fps
          qrbox: 250,
          aspectRatio: 1.7778,
        },
        (decodedText, result) => {
          // result.result.debugData?.decoderName tells you which decoder fired
          console.log("Decoder used:", result.result.debugData?.decoderName);
          onDetected(decodedText);
        },
        (errorMessage) => {
          if (
            !errorMessage.includes("NotFoundException") &&
            !errorMessage.includes("No MultiFormat Readers")
          ) {
            console.warn("Scan error:", errorMessage);
          }
        },
      )
      .catch(console.error);

    return () => {
      html5QrCode.stop().catch(() => {});
    };
  }, [opened, onDetected]);

  return (
    <div className="relative">
      <div
        id={containerId}
        className="min-h-[320px] w-full rounded-md border"
      />
      <div className="mt-4 flex justify-end">
        <Button
          variant="destructive"
          onClick={() => {
            readerRef.current?.stop().finally(() => action());
          }}
        >
          Close
        </Button>
      </div>
    </div>
  );
}
