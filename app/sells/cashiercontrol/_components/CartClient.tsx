"use client";

import { socket } from "@/app/socket";
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
import { FormatPrice, useFormatter } from "@/hooks/usePrice";
import { updateProductStockOptimistic } from "@/lib/slices/productsSlice";
import { useAppDispatch } from "@/lib/store";
import { ProductForSale, SellingUnit } from "@/lib/zod";
import { Minus, Plus, Trash2Icon } from "lucide-react";
import { memo, useCallback } from "react";

// تم تعديل النوع ليشمل مصفوفة الوحدات الديناميكية
type props = ProductForSale & {
  warehousename: string;
  sellingMode: string;
  sellingUnits: SellingUnit[];
  availableStock: Record<string, number>; // التعديل هنا: سجل يحتوي على الكمية لكل وحدة ID
};

// 🚀 مكون التبويبات (لم يتغير كثيراً)
export const CartTab = memo(({ cart, isActive, onSelect, onRemove }: any) => (
  <div className="flex flex-row gap-1">
    <Button
      className={`rounded ${
        isActive
          ? "bg-primary border-2 text-black"
          : "bg-card text-foreground border-primary border-2"
      }`}
      onClick={onSelect}
    >
      {cart.name}
    </Button>
    <button className="mt-1" onClick={onRemove}>
      <Trash2Icon color="red" size={20} />
    </button>
  </div>
));
CartTab.displayName = "CartTab";

// 🚀 مكون سطر المنتج في السلة (تم تحديثه للوحدات الديناميكية)
export const CartItemRow = memo(
  ({ item, index, products, onUpdateQty, onChangeUnit, onRemove, t }: any) => {
    const dispatch = useAppDispatch();

    // جلب السعر مباشرة من الوحدة المختارة في الـ item
    const itemPrice = item.selectedUnitPrice || 0;

    // حساب الحد الأقصى للكمية بناءً على المخزون المتاح لهذه الوحدة المحددة
    const getMaxQty = useCallback(() => {
      const product = products.find((p: any) => p.id === item.id);
      if (!product || !product.availableStock) return 0;
      // نستخدم ID الوحدة لجلب المخزون المتاح لها
      return product.availableStock[item.selectedUnitId] || 0;
    }, [products, item.id, item.selectedUnitId]);

    const maxQty = getMaxQty();

    return (
      <TableRow className="border-amber-300">
        <TableCell>{index + 1}</TableCell>
        <TableCell>{item.sku}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.warehousename}</TableCell>

        {/* التحكم في الكمية */}
        <TableCell>
          <div className="flex items-center gap-1">
            <button
              disabled={item.selectedQty <= 1}
              onClick={() => {
                dispatch(
                  updateProductStockOptimistic({
                    productId: item.id,
                    sellingUnit: item.selectedUnitId,
                    quantity: 1,
                    mode: "restore",
                  }),
                );
                socket.emit("stock:update", {
                  productId: item.id,
                  sellingUnit: item.selectedUnitId,
                  quantity: 1,
                  mode: "restore",
                });
                onUpdateQty(item.id, item.selectedUnitId, 1, "mins");
              }}
              className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
            >
              <Minus size={16} />
            </button>
            <input
              readOnly
              value={item.selectedQty}
              className="w-12 rounded border text-center text-sm"
            />
            <button
              disabled={item.selectedQty >= maxQty}
              onClick={() => {
                dispatch(
                  updateProductStockOptimistic({
                    productId: item.id,
                    sellingUnit: item.selectedUnitId,
                    quantity: 1,
                    mode: "consume",
                  }),
                );
                socket.emit("stock:update", {
                  productId: item.id,
                  sellingUnit: item.selectedUnitId,
                  quantity: 1,
                  mode: "consume",
                });
                onUpdateQty(item.id, item.selectedUnitId, 1, "plus");
              }}
              className="bg-primary text-background rounded p-1 disabled:bg-gray-400"
            >
              <Plus size={16} />
            </button>
          </div>
        </TableCell>

        {/* اختيار الوحدة (ديناميكي) */}
        <TableCell>
          <Select
            value={item.selectedUnitId}
            onValueChange={(newUnitId) => {
              const newUnit = item.sellingUnits.find(
                (u: any) => u.id === newUnitId,
              );
              // تأكد من تمرير الكائن القديم والجديد بشكل صحيح للدالة
              const fromUnit = item.sellingUnits.find(
                (u: any) => u.id === item.selectedUnitId,
              );
              onChangeUnit(item.id, fromUnit, newUnit, item);
            }}
          >
            <SelectTrigger className="h-8 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {item.sellingUnits?.map((unit: SellingUnit) => {
                // 1. جلب المخزون المتاح لهذه الوحدة من البيانات التي مررناها للمنتج
                // ملاحظة: تأكد أن availableStock موجود في كائن item داخل السلة
                const isOutOfStock = (item.availableStock?.[unit.id] ?? 0) <= 0;

                return (
                  <SelectItem
                    key={unit.id}
                    value={unit.id}
                    // 2. تعطيل الاختيار إذا نفد المخزون
                    disabled={isOutOfStock}
                    className={
                      isOutOfStock ? "cursor-not-allowed opacity-50" : ""
                    }
                  >
                    <div className="flex w-full justify-between gap-2">
                      <span>{unit.name}</span>
                      {isOutOfStock && (
                        <span className="text-[10px] font-bold text-red-500">
                          (نفد)
                        </span>
                      )}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </TableCell>

        <TableCell className="whitespace-nowrap">
          {FormatPrice(itemPrice)}
        </TableCell>
        <TableCell className="font-bold whitespace-nowrap">
          {FormatPrice(itemPrice * item.selectedQty)}
        </TableCell>
        <TableCell>
          <Button
            onClick={() => {
              onRemove(item.id, item.selectedUnitId);
              socket.emit("stock:update", {
                productId: item.id,
                sellingUnit: item.selectedUnitId,
                quantity: item.selectedQty,
                mode: "restore",
              });
            }}
            variant="ghost"
            size="icon"
          >
            <Trash2Icon className="text-red-500" size={18} />
          </Button>
        </TableCell>
      </TableRow>
    );
  },
);
CartItemRow.displayName = "CartItemRow";

// 🚀 مكون بطاقة المنتج (تم تحديثه للعرض الديناميكي)
// 🚀 مكون بطاقة المنتج
export const ProductCard = memo(
  ({ product, onAdd, t, formatCurrency }: any) => {
    if (!product.sellingUnits || product.sellingUnits.length === 0) return null;

    return (
      <div className="border-primary rounded-2xl border-2 shadow-sm transition hover:scale-[1.02] hover:shadow-md">
        <Card className="group relative flex h-48 cursor-pointer flex-col justify-between overflow-hidden p-2">
          {/* قسم الوحدات */}
          <div className="bg-primary text-background flex flex-col rounded-md px-2 py-1 text-[11px] font-bold">
            {product.sellingUnits.map((unit: any) => {
              const stock = product.availableStock?.[unit.id] || 0;
              return (
                <div
                  key={unit.id}
                  onClick={(e) => {
                    e.stopPropagation(); // منع تفعيل الضغط على الكارت
                    if (stock > 0) onAdd(product, unit);
                  }}
                  className={`flex items-center justify-between rounded border-b border-white/20 px-1 py-1 transition-colors last:border-0 hover:bg-white/10 ${stock <= 0 ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                >
                  <span className="w-6 rounded-sm bg-white/20 text-center text-white dark:text-black">
                    {stock}
                  </span>
                  <span className="flex-1 truncate px-1 text-center text-white dark:text-black">
                    {unit.name}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-white dark:text-black">
                      {FormatPrice(unit.price)}
                    </span>
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white shadow-sm">
                      +
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* قسم اسم المنتج */}
          <div className="bg-primary-foreground text-foreground mt-1 flex h-[50px] items-center justify-center rounded-md">
            <Label className="line-clamp-2 cursor-pointer px-2 text-center text-xs font-bold">
              {product.name}
            </Label>
          </div>
        </Card>
      </div>
    );
  },
  (prev, next) => {
    return (
      prev.product.id === next.product.id &&
      JSON.stringify(prev.product.availableStock) ===
        JSON.stringify(next.product.availableStock)
    );
  },
);

ProductCard.displayName = "ProductCard";
