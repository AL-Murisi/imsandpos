"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableCell, TableRow } from "@/components/ui/table";
import { FormatPrice } from "@/hooks/usePrice";
import { ProductForSale } from "@/lib/zod";
import { Minus, Plus, Trash2Icon } from "lucide-react";
import { memo, useCallback } from "react";

export type SellingUnit = "carton" | "packet" | "unit";
export type discountType = "fixed" | "percentage";
type forsale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
};
interface CustomDialogProps {
  users: {
    id?: string;
    name?: string;
    phoneNumber?: string | null;
    outstanding?: any;
  } | null;
  product: forsale[];
}

// 🚀 Memoized Cart Tab Component
export const CartTab = memo(
  ({
    cart,
    isActive,
    onSelect,
    onRemove,
  }: {
    cart: any;
    isActive: boolean;
    onSelect: () => void;
    onRemove: () => void;
  }) => (
    <div className="flex flex-row gap-1">
      <Button
        className={`rounded ${
          isActive
            ? "bg-primary hover:bg-secondary rounded-md border-2 text-black hover:scale-100"
            : "bg-card hover:bg-primary border-primary text-foreground rounded-md border-2 hover:text-black"
        }`}
        onClick={onSelect}
      >
        {cart.name}
      </Button>
      <div className="mt-1" onClick={onRemove}>
        <Trash2Icon color="red" />
      </div>
    </div>
  ),
);

CartTab.displayName = "CartTab";

// 🚀 Memoized Cart Item Row
export const CartItemRow = memo(
  ({
    item,
    index,
    products,
    onUpdateQty,
    onChangeUnit,
    onRemove,
    t,
  }: {
    item: any;
    index: number;
    products: forsale[];
    onUpdateQty: (
      id: string,
      sellingUnit: SellingUnit,
      quantity: number,
      action: string,
    ) => void;
    onChangeUnit: (
      id: string,
      from: SellingUnit,
      to: SellingUnit,
      item: any,
    ) => void;
    onRemove: (id: string) => void;
    t: any;
  }) => {
    const itemPrice =
      item.sellingUnit === "unit"
        ? (item.pricePerUnit ?? 0)
        : item.sellingUnit === "packet"
          ? (item.pricePerPacket ?? 0)
          : (item.pricePerCarton ?? 0);

    const getMaxQty = useCallback(() => {
      const product = products.find((p: any) => p.id === item.id);
      if (!product) return 0;

      if (item.sellingUnit === "carton") {
        return Math.floor(product.availableCartons);
      } else if (item.sellingUnit === "packet") {
        const decimalPart = product.availableCartons % 1;
        const packetsFromCartons = Math.floor(decimalPart * 100);
        return packetsFromCartons + product.availablePackets;
      }
      return product.availableUnits;
    }, [products, item.id, item.sellingUnit]);
    const product = products.find((p: any) => p.id === item.id);
    if (!product) return 0;
    const maxQty = getMaxQty();

    return (
      <TableRow className="border-amber-300">
        <TableCell>{index + 1}</TableCell>
        <TableCell>{item.sku}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.warehousename}</TableCell>
        <TableCell>
          <button
            disabled={item.selectedQty <= 1}
            onClick={() => onUpdateQty(item.id, item.sellingUnit, 1, "mins")}
            className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
          >
            <Minus size={16} />
          </button>
          <input
            value={item.selectedQty}
            onChange={(e) => {
              const qty = Math.max(1, Number(e.target.value) || 1);
              onUpdateQty(item.id, item.sellingUnit, qty, "plus");
            }}
            className="w-16 rounded border bg-white px-2 py-1 text-center text-black dark:bg-gray-800 dark:text-white"
            min={1}
          />
          <button
            disabled={item.selectedQty >= maxQty}
            onClick={() => onUpdateQty(item.id, item.sellingUnit, 1, "plus")}
            className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
          >
            <Plus size={16} />
          </button>
        </TableCell>
        <TableCell>
          <Select
            value={item.sellingUnit}
            onValueChange={(value: string) =>
              onChangeUnit(
                item.id,
                item.sellingUnit,
                value as SellingUnit,
                item,
              )
            }
          >
            <SelectTrigger className="rounded border px-2 py-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* ✅ Full mode → all options available */}
              {item.sellingMode === "full" && (
                <>
                  <SelectItem
                    disabled={item.selectedQty >= product.availableCartons}
                    value="carton"
                  >
                    كرتون
                  </SelectItem>
                  <SelectItem
                    disabled={item.selectedQty >= product.packetsPerCarton}
                    value="packet"
                  >
                    حزمة
                  </SelectItem>
                  <SelectItem value="unit">حبة</SelectItem>
                </>
              )}

              {/* ✅ Carton + Unit mode (no packet) */}
              {item.sellingMode === "cartonUnit" && (
                <>
                  <SelectItem
                    disabled={item.selectedQty >= product.availableCartons}
                    value="carton"
                  >
                    كرتون
                  </SelectItem>
                  <SelectItem value="unit">حبة</SelectItem>
                </>
              )}

              {/* ✅ Carton only mode */}
              {item.sellingMode === "cartonOnly" && (
                <SelectItem value="carton">كرتون</SelectItem>
              )}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="whitespace-nowrap">${itemPrice}</TableCell>
        <TableCell className="whitespace-nowrap">
          ${(itemPrice * item.selectedQty).toFixed(2)}
        </TableCell>
        <TableCell>
          <Button onClick={() => onRemove(item.id)} variant="ghost" size="icon">
            <Trash2Icon color="red" size={18} />
          </Button>
        </TableCell>
      </TableRow>
    );
  },
  (prev, next) => {
    return (
      prev.item.selectedQty === next.item.selectedQty &&
      prev.item.sellingUnit === next.item.sellingUnit &&
      prev.products === next.products
    );
  },
);

// Memoized Product Card Component
export const ProductCard = memo(
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
      <div className="border-primary rounded-2xl border-2 shadow-xl/20 shadow-gray-500 transition group-has-[[data-pending]]:animate-pulse hover:scale-[1.02] hover:shadow-lg">
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
