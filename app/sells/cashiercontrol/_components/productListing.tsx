"use client";

import { addItem } from "@/lib/slices/cartSlice";
import {
  syncProductStock,
  updateProductStockOptimistic,
} from "@/lib/slices/productsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { ProductForSale, SellingUnit } from "@/lib/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
const BarcodeScanner = dynamic(
  () => import("@/app/sells/cashiercontrol/_components/BarcodeScannerZXing"),
  {
    ssr: false,
  },
);
import { useFormatter } from "@/hooks/usePrice";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

import { ProductCard } from "./CartClient";
import { socket } from "@/app/socket";
import { supabase } from "@/lib/supabaseClient";
import { useCompany } from "@/hooks/useCompany";
import Dailogreuse from "@/components/common/dailogreuse";

const ScrollArea = dynamic(
  () => import("@/components/ui/scroll-area").then((m) => m.ScrollArea),
  { ssr: false },
);

type Forsale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
  sellingUnits: SellingUnit[];
  barcode: string;
  availableStock: Record<string, number>;
};

type Props = {
  product: Forsale[];
};
export default function List({ product }: Props) {
  const { company } = useCompany();
  const t = useTranslations("cashier");
  const dispatch = useAppDispatch();
  const [opens, setOpens] = useState(false);
  const [last, setLast] = useState<{ text: string; format: string } | null>(
    null,
  );

  const products = useAppSelector((s) => s.products.products);
  const { formatCurrency } = useFormatter();
  const cartItems =
    useAppSelector(
      (s) => s.cart.carts.find((c) => c.id === s.cart.activeCartId)?.items,
    ) ?? [];
  useEffect(() => {
    /**
     * 🔥 Supabase Realtime Subscription
     * This listens for any UPDATE on the inventory table
     */
    const channel = supabase
      .channel("inventory-updates")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "inventory", // Change this to your actual stock table name
          filter: `company_id=eq.${company?.id}`,
        },
        (payload) => {
          console.log("📦 Realtime change received:", payload);

          // Assuming your table has productId and current stock
          // ✅ Correct: Matching the exact keys from your log
          console.log(payload.new);
          const { product_id, available_quantity } = payload.new;

          console.log("Product ID:", product_id);
          console.log("Available Qty:", available_quantity);

          dispatch(
            syncProductStock({
              productId: product_id, // Map the snake_case DB key to your camelCase Redux key
              baseQty: available_quantity,
            }),
          );
          // We use the new stock frtom DB to sync everyone's UI
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dispatch, supabase]);
  // 🔥 Listen for stock updates from other users
  useEffect(() => {
    const handleStockUpdate = (data: {
      productId: string;
      sellingUnit: string;
      quantity: number;
      mode: "consume" | "restore";
    }) => {
      console.log("📦 Stock updated by another user:", data);

      // Update local stock immediately
      dispatch(updateProductStockOptimistic(data));
    };

    const handleSaleRefresh = (data: {
      items: Array<{
        id: string;
        selectedUnitId: string;
        selectedQty: number;
      }>;
    }) => {
      console.log("🛒 Sale completed by another user:", data);

      // Update all affected products
      data.items.forEach((item) => {
        dispatch(
          updateProductStockOptimistic({
            productId: item.id,
            sellingUnit: item.selectedUnitId,
            quantity: item.selectedQty,
            mode: "consume",
          }),
        );
      });
    };

    socket.on("stock:updated", handleStockUpdate);
    socket.on("sale:refresh", handleSaleRefresh);

    return () => {
      socket.off("stock:updated", handleStockUpdate);
      socket.off("sale:refresh", handleSaleRefresh);
    };
  }, [dispatch]);
  const getAvailableStock = useCallback(
    (product: Forsale, unitId: string, cartItems: any[]) => {
      const baseStock = product.availableStock?.[unitId] ?? 0;

      const inCartQty = cartItems
        .filter((i) => i.id === product.id && i.selectedUnitId === unitId)
        .reduce((sum, i) => sum + i.selectedQty, 0);

      return baseStock - inCartQty;
    },
    [],
  );
  const handleAdd = useCallback(
    (p: Forsale, selectedUnit?: SellingUnit) => {
      const targetUnit =
        selectedUnit ||
        p.sellingUnits.find((u) => u.isbase) ||
        p.sellingUnits[0];

      if (!targetUnit) return;

      const availableQty = getAvailableStock(p, targetUnit.id, cartItems);

      if (availableQty <= 0) {
        console.warn("No stock left for unit:", targetUnit.name);
        return;
      }

      dispatch(
        addItem({
          id: p.id,
          sku: p.sku,
          name: p.name,
          warehousename: p.warehousename,
          warehouseId: p.warehouseId,
          originalStockQuantity: p.availableStock?.[targetUnit.id] || 0,
          sellingMode: p.sellingMode,
          sellingUnits: p.sellingUnits,
          selectedUnitId: targetUnit.id,
          selectedUnitName: targetUnit.name,
          selectedUnitPrice: targetUnit.price,
          selectedQty: 1,
          availableStock: p.availableStock,
          action: "",
        }),
      );

      dispatch(
        updateProductStockOptimistic({
          productId: p.id,
          sellingUnit: targetUnit.id,
          quantity: 1,
          mode: "consume",
        }),
      );

      // 🔥 Emit stock update to other users
    },
    [dispatch, cartItems],
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
      <Dailogreuse
        open={opens}
        setOpen={setOpens}
        btnLabl="تعديل"
        style="w-full max-w-[1400px] overflow-y-auto rounded-lg p-6 xl:max-w-[1600px]"
        titel="قم بتحديث تفاصيل المنتج"
      >
        <BarcodeScanner
          action={(result) => {
            // 1. Update the visual "Last Scanned" state
            setLast({ text: result.text, format: result.format });

            // 2. Find the product that matches the scanned text (SKU or Barcode)
            const scannedProduct = products.find(
              (p) => p.sku === result.text || p.barcode === result.text,
            );

            if (scannedProduct) {
              // 3. Trigger your existing add logic
              handleAdd(scannedProduct);

              // Optional: Close the dialog after a successful scan
              // setOpens(false);

              console.log(`Successfully added: ${scannedProduct.name}`);
            } else {
              console.warn("Product not found for code:", result.text);
              // Optional: Add a toast notification here for "Product not found"
            }
          }}
        />
      </Dailogreuse>{" "}
      {products.length > 0 && <div className="mt-4 px-4">{productGrid}</div>}
    </ScrollArea>
  );
}
