"use client";

import SearchInput from "@/components/common/searchtest";
import { Selection } from "@/components/common/sellingcat";
import { selectAvailableStock } from "@/lib/selectors";
import { addItem, updateQty } from "@/lib/slices/cartSlice";
import { setProductsLocal } from "@/lib/slices/productsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { CashierItem, ProductForSale } from "@/lib/zod";
import { useEffect, useMemo, useCallback, memo } from "react";
import { Card } from "../../../components/ui/card";

import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { FormatPrice, useFormatter } from "@/hooks/usePrice";

const ScrollArea = dynamic(
  () => import("@/components/ui/scroll-area").then((m) => m.ScrollArea),
  { ssr: false },
);

type forsale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
};

type prop = {
  product: forsale[];
  formData: {
    warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
  };
  searchParams: any;
  queryr: string;
};

// Memoized Product Card Component
const ProductCard = memo(
  ({
    product,
    onAdd,
    t,
    formatCurrency,
  }: {
    product: forsale;
    onAdd: (product: forsale) => void;
    t: any;
    formatCurrency: any;
  }) => {
    if (product.availableCartons <= 0) return null;

    // Determine selling mode automatically
    const isCartonOnly =
      product.availablePackets === 0 && product.availableUnits === 0;
    const isCartonUnit =
      product.availablePackets === 0 && product.availableUnits > 0;

    const showPacket = !isCartonOnly && !isCartonUnit; // only for full mode
    const showUnit = !isCartonOnly; // for all except carton-only

    return (
      <div className="border-primary rounded-2xl border-2 shadow-xl/20 shadow-gray-500 transition hover:scale-[1.02] hover:shadow-lg">
        <Card
          onClick={() => onAdd(product)}
          className="group relative flex h-44 cursor-pointer flex-col justify-between overflow-hidden p-2"
        >
          {/* Product header (quantities and prices) */}
          <div className="bg-primary text-background flex flex-col rounded-md px-3 py-1 text-xs font-bold">
            {/* Carton */}
            <div className="flex items-center justify-between py-1">
              <span className="w-8 text-left">
                {FormatPrice(Number(product.availableCartons))}
              </span>
              <span className="flex-1 text-center">
                {isCartonOnly ? " كرتون " : t("carton")}
              </span>
              <span className="w-16 text-right">
                {FormatPrice(Number(product.pricePerCarton))}
              </span>
            </div>

            {/* Packet */}
            {showPacket && (
              <div className="flex items-center justify-between py-1">
                <span className="w-8 text-left">
                  {FormatPrice(product.availablePackets)}
                </span>
                <span className="flex-1 text-center">{t("packet")}</span>
                <span className="w-16 text-right">
                  {FormatPrice(Number(product.pricePerPacket))}
                </span>
              </div>
            )}

            {/* Unit */}
            {showUnit && product.pricePerUnit !== undefined && (
              <div className="flex items-center justify-between py-1">
                <span className="w-8 text-left">
                  {FormatPrice(product.availableUnits)}
                </span>
                <span className="flex-1 text-center">{t("unit")}</span>
                <span className="w-16 text-right">
                  {FormatPrice(Number(product.pricePerUnit))}
                </span>
              </div>
            )}

            {/* Fillers (for consistent height) */}
            {isCartonOnly && (
              <>
                <div className="h-[24px]" />
                <div className="h-[24px]" />
              </>
            )}
            {isCartonUnit && <div className="h-[24px]" />}
          </div>

          {/* Product Name */}
          <div className="bg-primary-foreground text-foreground flex h-[60px] items-center justify-center rounded-md">
            <Label className="line-clamp-2 px-2 text-center text-sm font-medium">
              {product.name}
            </Label>
          </div>
        </Card>
      </div>
    );
  },
  (prev, next) =>
    prev.product.id === next.product.id &&
    prev.product.availableCartons === next.product.availableCartons,
);

ProductCard.displayName = "ProductCard";

export default function ProductsList({
  product,
  formData,
  searchParams,
  queryr,
}: prop) {
  const t = useTranslations("cashier");
  const dispatch = useAppDispatch();
  // const products = useAppSelector(selectAvailableStock);
  const { formatCurrency, formatPriceK, formatQty } = useFormatter();
  // Memoize the handleAdd function
  const handleAdd = useCallback(
    (products: forsale, search: boolean) => {
      // Determine initial selling unit based on available quantities
      // and the selling mode from backend
      let sellingUnit: "unit" | "carton" = "unit";

      if (products.sellingMode === "cartonOnly") {
        sellingUnit = "carton";
      } else {
        sellingUnit = "unit"; // default for full & cartonUnit
      }

      dispatch(
        addItem({
          id: products.id,
          sku: products.sku,
          name: products.name,
          pricePerUnit: products.pricePerUnit ?? 0,
          pricePerPacket: products.pricePerPacket ?? 0,
          pricePerCarton: products.pricePerCarton ?? 0,
          action: "",
          warehousename: products.warehousename,
          sellingUnit,
          warehouseId: products.warehouseId,
          selectedQty: 0,
          sellingMode: products.sellingMode,
          originalStockQuantity: products.availableCartons,
          packetsPerCarton: products.packetsPerCarton,
          unitsPerPacket: products.unitsPerPacket,
        }),
      );

      if (!search) {
        dispatch(
          updateQty({
            id: products.id,
            sellingUnit,
            quantity: 1,
            action: "plus",
          }),
        );
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (!product || product.length === 0) return;

    if (queryr && product.length === 1) {
      handleAdd(product[0], true);
    }

    // Always dispatch updated product list
    dispatch(setProductsLocal([...product])); // create new reference to force re-render
  }, [product, queryr, dispatch, handleAdd]);

  // Memoize the product grid
  const productGrid = useMemo(
    () => (
      <div className="grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-5 gap-y-4">
        {product.map((prod) => (
          <ProductCard
            key={prod.id}
            product={prod}
            onAdd={(p) => handleAdd(p, false)}
            t={t}
            formatCurrency={formatCurrency}
          />
        ))}
      </div>
    ),
    [product, handleAdd, t],
  );

  return (
    <div className="rounded-2xl p-2 lg:col-span-1">
      <div className="mb-4 flex flex-wrap gap-3 bg-transparent px-3 lg:flex-row">
        <SearchInput placeholder={t("search")} paramKey="product" />

        <Selection
          options={formData.categories}
          placeholder={t("filter")}
          selectkey="categoryId"
        />
      </div>

      {queryr && product.length === 0 && (
        <div className="text-muted-foreground mt-4 px-4 text-center text-sm">
          <p>{t("noProductFound", { query: queryr })}</p>
        </div>
      )}

      {(product.length > 0 || !queryr) && (
        <ScrollArea className="h-[85vh]">
          <div className="text-muted-foreground mt-4 px-4 text-center text-sm">
            {productGrid}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
