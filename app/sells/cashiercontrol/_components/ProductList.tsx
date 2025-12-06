"use client";

import { Selection } from "@/components/common/sellingcat";
import { ProductForSale } from "@/lib/zod";
import SearchInput from "@/components/common/searchlist";
import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";
import List from "./productListing";
import { useTranslations } from "next-intl";

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

export default function ProductsList({
  product,
  formData,
  searchParams,
  queryr,
}: prop) {
  const t = useTranslations("cashier");

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
            // you can trigger logic here (e.g. set selected product, filter, etc.)
          }}
        />
      </div>
      <List
        product={product}
        formData={formData}
        queryr={queryr}
        searchParams={undefined}
      />
    </div>
  );
}
