"use client";

import { Selection } from "@/components/common/sellingcat";
import { ProductForSale, SellingUnit } from "@/lib/zod";
import SearchInput from "@/components/common/searchlist";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import List from "./productListing";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { setProductsLocal } from "@/lib/slices/productsSlice";
import { useAppDispatch } from "@/lib/store";
const FastPOSScanner = dynamic(
  () => import("../_components/BarcodeScannerZXing"),
  {
    ssr: false,
  },
);
type forsale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
  sellingUnits: SellingUnit[];
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
          options={product.map((p) => ({
            id: p.id,
            name: p.name,
          }))} // 👈 map your products into { id, name }
          action={(selected) => {
            setSelectedproduct(selected);
          }}
        />
      </div>
      <List
        product={product}
        // queryr={queryr || (selectedproduct ? selectedproduct.name || "" : "")}
      />
      <FastPOSScanner
        action={(text) => {
          setLast({ text, format: "Unknown" });
        }}
      />

      {last ? (
        <div className="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          Last scan: {last.text} ({last.format})
        </div>
      ) : null}
    </div>
  );
}
