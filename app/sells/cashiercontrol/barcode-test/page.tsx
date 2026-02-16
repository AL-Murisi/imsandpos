// "use client";

// import Barcode from "react-barcode";
// import { useState } from "react";

// // 1. Define the allowed formats as a constant with 'as const'
// const FORMATS = ["CODE128", "CODE39", "EAN13", "EAN8", "UPC", "ITF14"] as const;

// // 2. Create a type based on that array
// type BarcodeFormat = (typeof FORMATS)[number];

// export default function BarcodeTestPage() {
//   const [value, setValue] = useState("123456789012");

//   // 3. Explicitly type the state
//   const [format, setFormat] = useState<BarcodeFormat>("CODE128");

//   return (
//     <main className="mx-auto max-w-xl space-y-4 p-4">
//       <h1 className="text-xl font-semibold">Barcode Test</h1>

//       {/* ... rest of your UI ... */}

//       <div className="space-y-2">
//         <label className="text-sm font-medium">Format</label>
//         <select
//           className="w-full rounded border px-3 py-2 text-sm text-black"
//           value={format}
//           onChange={(e) => setFormat(e.target.value as BarcodeFormat)} // 4. Cast the value
//         >
//           {FORMATS.map((item) => (
//             <option key={item} value={item}>
//               {item}
//             </option>
//           ))}
//         </select>
//       </div>

//       <div className="flex justify-center rounded border bg-white p-4">
//         {/* TypeScript is now happy because 'format' matches the expected union type */}
//         <Barcode value={value || " "} format={format} />
//       </div>
//     </main>
//   );
// }
