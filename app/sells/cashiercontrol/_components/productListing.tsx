"use client";

import { addItem } from "@/lib/slices/cartSlice";
import { updateProductStockOptimistic } from "@/lib/slices/productsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { ProductForSale, SellingUnit } from "@/lib/zod";
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
  sellingUnits: SellingUnit[];
  availableStock: Record<string, number>;
};

type Props = {
  product: Forsale[];
};

export default function List({ product }: Props) {
  const t = useTranslations("cashier");
  const dispatch = useAppDispatch();
  const products = useAppSelector((s) => s.products.products);
  const { formatCurrency } = useFormatter();
  const cartItems =
    useAppSelector(
      (s) => s.cart.carts.find((c) => c.id === s.cart.activeCartId)?.items,
    ) ?? [];

  const getAvailableStock = (
    product: Forsale,
    unitId: string,
    cartItems: any[],
  ) => {
    const baseStock = product.availableStock?.[unitId] ?? 0;

    const inCartQty = cartItems
      .filter((i) => i.id === product.id && i.selectedUnitId === unitId)
      .reduce((sum, i) => sum + i.selectedQty, 0);

    return baseStock - inCartQty;
  };

  /**
   * ✅ ADD TO CART (single source)
   */
  // داخل مكون List
  const handleAdd = useCallback(
    (p: Forsale, selectedUnit?: SellingUnit) => {
      // تحديد الوحدة: إما المختارة من الزر أو الافتراضية
      const targetUnit =
        selectedUnit ||
        p.sellingUnits.find((u) => u.isbase) ||
        p.sellingUnits[0];

      if (!targetUnit) return;

      // فحص المخزون بناءً على الوحدة المستهدفة
      // ملحوظة: نستخدم cartItems من الـ scope الخارجي كما أصلحناها سابقاً
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
          // unitsPerPacket: p.unitsPerPacket,
          // packetsPerCarton: p.packetsPerCarton,
          sellingUnits: p.sellingUnits,
          // ✅ نستخدم بيانات الوحدة المستهدفة
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
    },
    [dispatch, cartItems], // مهم جداً تحديث التبعيات
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
