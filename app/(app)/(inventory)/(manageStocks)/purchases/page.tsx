import { ParsedSort } from "@/hooks/sort";

import { SortingState } from "@tanstack/react-table";
import { getSession } from "@/lib/session";

import { getPurchasesByCompany } from "@/lib/actions/suppliers";

import PurchasesTable from "../_components/PurchasesTable";

type DashboardProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
    query?: string;
    movementquery?: string;
    inventoreyquery?: string;
    sort?: string;
    supplierId?: string;
    warehouseId?: string;
    categoryId?: string;
    tab?: string;
  }>;
};

export default async function manageStocks({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const {
    from,
    to,
    movementquery = "",
    query = "",
    page = "1",
    limit = "13",
    sort,
  } = params || {};

  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  const user = await getSession();
  if (!user) return;
  const parsedSort: SortingState = ParsedSort(sort);

  const purchasesPromise = await getPurchasesByCompany(user.companyId, {
    pageIndex,
    pageSize,
    from,
    to,
    parsedSort,
  });

  return (
    <div className="px-2">
      {" "}
      <PurchasesTable
        data={purchasesPromise.data}
        total={purchasesPromise.total}
      />
    </div>
  );
}
