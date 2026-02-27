"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
// import BarcodeScanner from "../_components/barcodetesting";

const BarcodeScanner = dynamic(() => import("./barcodetesting"), {
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
        action={() => setOpenScanner(false)}
        onDetected={handleDetected}
      />
    </>
  );
}
