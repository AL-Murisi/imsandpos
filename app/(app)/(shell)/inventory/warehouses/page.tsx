import { fetchWarehouse } from "@/lib/actions/warehouse";

import WarehouseTable from "./_components/tables";
import { getSession } from "@/lib/session";
import Clint from "./_components/clint";
import { Suspense } from "react";
import Loading from "./loading";
export default async function Warehouses() {
  const user = await getSession();
  if (!user) return;
  const data = await fetchWarehouse(user.companyId);
  return (
    <Suspense fallback={<Loading />}>
      {" "}
      <Clint
        products={data}
        total={data.length}
        formData={{
          warehouses: [],
          categories: [],
          brands: [],
          suppliers: [],
        }}
      />
    </Suspense>
    // </CardContainer>
  );
}
