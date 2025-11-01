import SearchInput from "@/components/common/searchtest";
import { Selection } from "@/components/common/sellingcat";
import { ProductForSale } from "@/lib/zod";

import { getTranslations } from "next-intl/server";
import dynamic from "next/dynamic";

const List = dynamic(() => import("../_components/productListing"));

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

export default async function ProductsList({
  product,
  formData,
  searchParams,
  queryr,
}: prop) {
  const t = await getTranslations("cashier");

  return (
    <div className="rounded-2xl p-2 lg:col-span-1">
      <List
        product={product}
        formData={formData}
        queryr={queryr}
        searchParams={undefined}
      />
    </div>
  );
}
