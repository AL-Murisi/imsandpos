"use client";

import SearchInput from "@/components/common/searchtest";
import { Selection } from "@/components/common/sellingcat";
import { selectAvailableStock } from "@/lib/selectors";
import { addItem, updateQty } from "@/lib/slices/cartSlice";
import { setProductsLocal } from "@/lib/slices/productsSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { CashierItem, ProductForSale } from "@/lib/zodType";
import { useEffect, useState } from "react";
import { Card } from "../../../components/ui/card";
import { FormatPrice } from "@/hooks/usePrice";
import { Label } from "@/components/ui/label";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
const ScrollArea = dynamic(
  () => import("@/components/ui/scroll-area").then((m) => m.ScrollArea),
  {
    ssr: false,
    // ensures it only loads on the client
    // optional fallback
  },
);
type CartItem = CashierItem & {
  originalStockQuantity: number;
  originalUnitsPerPacket: number;
  originalPacketsPerCarton: number;
  availableCartons: number;
  availablePackets: number;
  availableUnits: number;
};

type Category = {
  id: string;
  name: string;
};
type forsale = ProductForSale & {
  warehousename: string;
};
interface ProductsListProps {
  action: (products: ProductForSale) => void;
  cart: CartItem[];
  formData: {
    // warehouses: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    // brands: { id: string; name: string }[];
    // suppliers: { id: string; name: string }[];
  };
  refreshTrigger?: number; // Add this prop to force refresh
}
type Props = {
  query?: string;
  categoryId?: string;
  supplierId?: string;
  warehouseId?: string;
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

export default function ProductsList({
  product,
  formData,
  searchParams,
  queryr,
}: prop) {
  const t = useTranslations("cashier");
  // const {
  //   pagination,
  //   sorting,
  //   globalFilter,
  //   setPagination,
  //   setSorting,
  //   setGlobalFilter,
  //   warehouseId,
  //   supplierId,
  //   categoryId,
  //   setParam,
  // } = useTablePrams();
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectAvailableStock);
  const categories = useAppSelector((s) => s.products.categories);
  const status = useAppSelector((s) => s.products.status);

  const items = useAppSelector((s) => s.cart);

  useEffect(() => {
    if (!product || product.length === 0) return;
    if (queryr && product.length === 1) {
      handleAdd(product[0], true);
    }

    dispatch(setProductsLocal(product));
  }, [dispatch, searchParams, queryr]);

  const handleAdd = (products: forsale, search: boolean) => {
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
        sellingUnit: "carton",
        warehouseId: products.warehouseId,
        selectedQty: 1,
        originalStockQuantity: products.availableCartons,
        packetsPerCarton: products.packetsPerCarton,
        unitsPerPacket: products.unitsPerPacket,
      }),
    );

    if (!search) {
      dispatch(
        updateQty({
          id: products.id,
          sellingUnit: "carton",
          quantity: 1,
          action: "plus",
        }),
      );
    }
  };

  return (
    <div className="rounded-2xl p-2 lg:col-span-1">
      <div className="mb-4 flex flex-col gap-3 bg-transparent px-3 md:flex-row">
        <div className="h-10 w-sm md:w-full">
          <SearchInput placeholder={t("search")} paramKey="product" />
        </div>

        <Selection
          options={formData.categories}
          placeholder={t("filter")}
          selectkey="categoryId"
        />

        {/* <div className="flex gap-2">
            <ShoppingCart />
            <ShoppingCart />
            <ShoppingCart />
          </div> */}
      </div>
      {queryr && product.length === 0 && (
        <div className="text-muted-foreground mt-4 px-4 text-center text-sm">
          <p>{t("noProductFound", { query: queryr })}</p>
        </div>
      )}
      {(product.length > 0 || !queryr) && (
        <ScrollArea className="overflow-y-auto">
          <div className="text-muted-foreground mt-4 px-4 text-center text-sm">
            <div className="grid auto-rows-fr grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-x-5 gap-y-4">
              {products.map((products) => (
                <div
                  key={products.id}
                  className="border-primary rounded-2xl border-2 shadow-xl/20 shadow-gray-500"
                >
                  {products.availableCartons > 0 && (
                    <Card
                      onClick={() => handleAdd(products, false)}
                      className="group relative h-40 cursor-pointer overflow-hidden p-2"
                    >
                      {/* Header (qty / label / price) */}
                      <div className="bg-primary text-background absolute top-0 right-0 left-0 flex text-xs font-bold">
                        <div className="flex w-full flex-col px-4">
                          {/* Carton */}
                          <div className="flex items-center justify-between gap-2 p-1">
                            <span className="w-8 text-left">
                              {FormatPrice(Number(products.availableCartons))}
                            </span>
                            <span className="flex-1 text-center">
                              {t("carton")}
                            </span>
                            <span className="w-16 text-right">
                              ${FormatPrice(Number(products.pricePerCarton))}
                            </span>
                          </div>

                          {/* Packet */}
                          <div className="flex items-center justify-between gap-2 p-1">
                            <span className="w-8 text-left">
                              {FormatPrice(Number(products.availablePackets))}
                            </span>
                            <span className="flex-1 text-center">
                              {t("packet")}
                            </span>
                            <span className="w-16 text-right">
                              ${FormatPrice(Number(products.pricePerPacket))}
                            </span>
                          </div>

                          {/* Unit */}
                          {products.pricePerUnit !== undefined && (
                            <div className="flex items-center justify-between gap-2 p-1">
                              <span className="w-8 text-left">
                                {FormatPrice(Number(products.availableUnits))}
                              </span>
                              <span className="flex-1 text-center">
                                {t("unit")}
                              </span>
                              <span className="w-16 text-right">
                                ${FormatPrice(Number(products.pricePerUnit))}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Name */}
                      <div className="bg-primary-foreground absolute right-0 bottom-0 left-0 flex h-[86px] items-center justify-center">
                        <div className="text-foreground mt-2 mb-3 line-clamp-2 px-2 text-center text-sm font-medium sm:pb-6">
                          <Label>{products.name}</Label>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
