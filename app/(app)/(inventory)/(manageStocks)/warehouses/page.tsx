import { fetchWarehouse } from "@/lib/actions/warehouse";
import { getCompanySubscriptionUsage } from "@/lib/actions/subscription";

import WarehouseTable from "./_components/tables";
import { getSession } from "@/lib/session";
import Clint from "./_components/clint";
import { Suspense } from "react";
import Loading from "./loading";
export default async function Warehouses() {
  const user = await getSession();
  if (!user) return;
  const [data, subscriptionUsage] = await Promise.all([
    fetchWarehouse(user.companyId),
    getCompanySubscriptionUsage(),
  ]);
  return (
    <div className="p-3">
      <Clint
        products={data}
        total={data.length}
        warehouseLimit={subscriptionUsage?.warehouses ?? null}
        formData={{
          warehouses: [],
          categories: [],
          brands: [],
          suppliers: [],
        }}
      />
    </div>
    // </CardContainer>
  );
}
