// import { addItem, updateQty } from "@/lib/slices/cartSlice";
// import {
//   setProductsLocal,
//   updateProductSock,
//   updateProductStockLocal,
//   updateProductStockOptimistic,
// } from "@/lib/slices/productsSlice";
// import { useAppDispatch, useAppSelector } from "@/lib/store";
// import { ProductForSale } from "@/lib/zod";
// import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";

// import { useFormatter } from "@/hooks/usePrice";
// import { useTranslations } from "next-intl";
// import dynamic from "next/dynamic";

// import { parseAsString, useQueryState } from "nuqs";
// import { ProductCard } from "./CartClient";

// const ScrollArea = dynamic(
//   () => import("@/components/ui/scroll-area").then((m) => m.ScrollArea),
//   { ssr: false },
// );

// type forsale = ProductForSale & {
//   warehousename: string;
//   sellingMode: string;
// };

// type prop = {
//   product: forsale[];
//   formData: {
//     warehouses: { id: string; name: string }[];
//     categories: { id: string; name: string }[];
//   };
//   searchParams: any;
//   queryr: string;
// };

// ProductCard.displayName = "ProductCard";

// export default function List({ product, formData, queryr }: prop) {
//   const t = useTranslations("cashier");
//   const dispatch = useAppDispatch();
//   const products = useAppSelector((state) => state.products.products);
//   const { formatCurrency, formatPriceK, formatQty } = useFormatter();
//   const [query, setQuery] = useQueryState(
//     `productquery`,
//     parseAsString.withDefault("").withOptions({
//       shallow: false,
//     }),
//   );
//   const handleAdd = useCallback(
//     (products: forsale, search: boolean) => {
//       // Determine initial selling unit based on available quantities
//       // and the selling mode from backend
//       let sellingUnit: "unit" | "carton" = "unit";

//       if (products.sellingMode === "cartonOnly") {
//         sellingUnit = "carton";
//       } else {
//         sellingUnit = "unit"; // default for full & cartonUnit
//       }

//       dispatch(
//         addItem({
//           id: products.id,
//           sku: products.sku,
//           name: products.name,
//           pricePerUnit: products.pricePerUnit ?? 0,
//           pricePerPacket: products.pricePerPacket ?? 0,
//           pricePerCarton: products.pricePerCarton ?? 0,
//           action: "",
//           warehousename: products.warehousename,
//           sellingUnit,
//           warehouseId: products.warehouseId,
//           selectedQty: 0,
//           sellingMode: products.sellingMode,
//           originalStockQuantity: products.availableCartons,
//           packetsPerCarton: products.packetsPerCarton,
//           unitsPerPacket: products.unitsPerPacket,
//         }),
//       );

//       if (!search) {
//         dispatch(
//           updateQty({
//             id: products.id,
//             sellingUnit,
//             quantity: 1,
//             action: "plus",
//           }),
//         );
//         dispatch(
//           updateProductStockOptimistic({
//             productId: products.id,
//             sellingUnit,
//             quantity: 1,
//             mode: "consume",
//           }),
//         );
//       }
//       //   dispatch(
//       //     updateProductSock({
//       //       productId: products.id,
//       //       sellingUnit,
//       //       selectedQty: 1,
//       //       availableUnits: products.availableUnits,
//       //       unitsPerPacket: products.availableUnits,
//       //       packetsPerCarton: products.availableCartons,
//       //     }),
//       //   );
//       setQuery("");
//     },
//     [dispatch],
//   );

//   // useEffect(() => {
//   //   if (!product || product.length === 0) return;

//   //   if (queryr && product.length === 1) {
//   //     handleAdd(product[0], true);
//   //   }

//   //   // Always dispatch updated product list
//   //   dispatch(setProductsLocal([...product])); // create new reference to force re-render
//   // }, [product, queryr, dispatch, handleAdd]);
//   useEffect(() => {
//     if (!product || product.length === 0) return;

//     dispatch(setProductsLocal(product));
//   }, [product]);
//   const autoAddedRef = useRef(false);

//   useEffect(() => {
//     if (!product || product.length === 0) return;

//     if (queryr && product.length === 1 && !autoAddedRef.current) {
//       handleAdd(product[0], true);
//       autoAddedRef.current = true;
//     }
//   }, [product, queryr, handleAdd]);

//   // Memoize the product grid
//   const productGrid = useMemo(
//     () => (
//       <div className="grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-5 gap-y-4">
//         {products.map((prod) => (
//           <ProductCard
//             key={prod.id}
//             product={prod}
//             onAdd={(p) => handleAdd(p, false)}
//             t={t}
//             formatCurrency={formatCurrency}
//           />
//         ))}
//       </div>
//     ),
//     [products, handleAdd, t],
//   );
//   ProductCard.displayName = "ProductCard";
//   return (
//     <ScrollArea className="h-[85vh]">
//       {queryr && product.length === 0 && (
//         <div className="text-muted-foreground mt-4 px-4 text-center text-sm">
//           <p>{t("noProductFound", { query: queryr })}</p>
//         </div>
//       )}
//       {(product.length > 0 || !queryr) && (
//         <div className="text-muted-foreground mt-4 px-4 text-center text-sm">
//           {productGrid}
//         </div>
//       )}
//     </ScrollArea>
//   );
// }
"use client";

import { addItem } from "@/lib/slices/cartSlice";
import { updateProductStockOptimistic } from "@/lib/slices/productsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { ProductForSale } from "@/lib/zod";
import { useCallback, useMemo } from "react";

import { useFormatter } from "@/hooks/usePrice";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

import { ProductCard } from "./CartClient";

const ScrollArea = dynamic(
  () => import("@/components/ui/scroll-area").then((m) => m.ScrollArea),
  { ssr: false },
);

type Forsale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
};

type Props = {
  product: Forsale[];
};

export default function List({ product }: Props) {
  const t = useTranslations("cashier");
  const dispatch = useAppDispatch();
  const products = useAppSelector((s) => s.products.products);
  const { formatCurrency } = useFormatter();

  /**
   * ✅ ADD TO CART (single source)
   */
  const handleAdd = useCallback(
    (p: Forsale) => {
      let sellingUnit: "unit" | "carton" = "unit";

      if (p.sellingMode === "cartonOnly") {
        sellingUnit = "carton";
      }

      // 🟢 1️⃣ add item ONLY if not exists
      dispatch(
        addItem({
          id: p.id,
          sku: p.sku,
          name: p.name,
          pricePerUnit: p.pricePerUnit ?? 0,
          pricePerPacket: p.pricePerPacket ?? 0,
          pricePerCarton: p.pricePerCarton ?? 0,
          warehousename: p.warehousename,
          sellingUnit,
          warehouseId: p.warehouseId,
          selectedQty: 1, // ✅ start from 1
          sellingMode: p.sellingMode,
          originalStockQuantity: p.availableCartons,
          packetsPerCarton: p.packetsPerCarton,
          unitsPerPacket: p.unitsPerPacket,
          action: "",
        }),
      );

      // 🟢 2️⃣ optimistic consume stock
      dispatch(
        updateProductStockOptimistic({
          productId: p.id,
          sellingUnit,
          quantity: 1,
          mode: "consume",
        }),
      );
    },
    [dispatch],
  );

  /**
   * ✅ UI GRID
   */
  const productGrid = useMemo(
    () => (
      <div className="grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-5 gap-y-4">
        {products.map((prod) => (
          <ProductCard
            key={prod.id}
            product={prod}
            onAdd={handleAdd}
            t={t}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>
    ),
    [products, handleAdd, t, formatCurrency],
  );

  return (
    <ScrollArea className="h-[85vh]">
      {/* {products.length === 0 && (
        <div className="text-muted-foreground mt-4 px-4 text-center text-sm">
          <p>{t("noProductFound")}</p>
        </div>
      )} */}

      {products.length > 0 && <div className="mt-4 px-4">{productGrid}</div>}
    </ScrollArea>
  );
}
