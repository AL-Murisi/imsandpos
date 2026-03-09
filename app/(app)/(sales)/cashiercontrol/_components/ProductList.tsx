"use client";

import { Selection } from "@/components/common/sellingcat";
import { ProductForSale, SellingUnit } from "@/lib/zod";
import SearchInput from "@/components/common/searchlist";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import List from "./productListing";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { setProductsLocal } from "@/lib/slices/productsSlice";
import { useAppDispatch } from "@/lib/store";

type forsale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
  sellingUnits: SellingUnit[];
  barcode: string;
  availableStock: Record<string, number>;
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
interface UserOption {
  id?: string;
  name?: string;
}

export default function ProductsList({
  product,
  formData,
  searchParams,
  queryr,
}: prop) {
  const [last, setLast] = useState<{ text: string; format: string } | null>(
    null,
  );
  const t = useTranslations("cashier");
  const [selectedproduct, setSelectedproduct] = useState<UserOption | null>(
    null,
  );
  const dispatch = useAppDispatch();
  const productSearchOptions = useMemo(() => {
    return product.map((p) => ({
      id: p.id,
      name: p.name,
    }));
  }, [product]); // Only re-calculates if the 'product' prop changes
  useEffect(() => {
    dispatch(setProductsLocal([...product]));
  }, [product, dispatch]); // Only runs when products change
  return (
    <div className="rounded-2xl p-2 lg:col-span-1">
      <div className="mb-4 grid grid-cols-2 gap-3 bg-transparent px-3 lg:flex-row">
        {/* <SearchInput placeholder={t("search")} paramKey="product" /> */}

        <Selection
          options={formData.categories}
          placeholder={t("filter")}
          selectkey="categoryId"
        />

        <SearchInput
          placeholder={t("search")}
          paramKey="product"
          options={productSearchOptions} // 2. Pass the memoized variable here} // 👈 map your products into { id, name }
          action={(selected) => {
            // 1. Set the ID to trigger the List effect
            setSelectedproduct(selected);

            // 2. IMMEDIATELY clear it (on the next tick) so typing doesn't re-trigger it
            setTimeout(() => {
              setSelectedproduct(null);
            }, 50);
          }}
        />
      </div>
      <List
        product={product}
        selecteditemId={selectedproduct?.id ?? ""}
        // queryr={queryr || (selectedproduct ? selectedproduct.name || "" : "")}
      />
    </div>
  );
}
