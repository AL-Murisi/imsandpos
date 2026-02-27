import { fetchAllFormData } from "@/lib/actions/roles";
import { getStockMovements } from "@/lib/actions/warehouse";

import { ParsedSort } from "@/hooks/sort";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
import { getSession } from "@/lib/session";

import ManagemovementClient from "../_components/getMovementhistry";

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
    inventoreyquery = "",
    supplierId,
    warehouseId,
    categoryId,
    tab,
  } = params || {};

  const currentTab = tab ?? "inventory";
  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  const where: Prisma.InventoryWhereInput = {
    warehouseId,
  };
  const user = await getSession();
  if (!user) return;
  const parsedSort: SortingState = ParsedSort(sort);
  const input: any = {
    supplierId,
    warehouseId,
    categoryId,
  };
  // ✅ Run all fetches in parallelfetchAllFormData

  //   const b = await fetchPayments();
  const formData = await fetchAllFormData(user.companyId);
  // Collect common params
  const commonParams = {
    from,
    to,
    pageIndex,
    pageSize,
    supplierId,
    warehouseId,
    categoryId,
    parsedSort,
  };

  // Tab-specific params

  const movementData = await getStockMovements(
    user.companyId,
    query,
    input,
    from,
    to,
    pageIndex,
    pageSize,
  );

  return (
    <ManagemovementClient
      products={movementData.movements}
      total={movementData.totalCount}
      formData={formData}
    />
  );
}
