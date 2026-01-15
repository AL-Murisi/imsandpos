import { fetchAllFormData } from "@/lib/actions/roles";
import {
  fetchAllFormDatas,
  getInventoryById,
  getStockMovements,
} from "@/lib/actions/warehouse";
import { TabsContent } from "@/components/ui/tabs";
import { ParsedSort } from "@/hooks/sort";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
import { getSession } from "@/lib/session";

import { getPurchasesByCompany } from "@/lib/actions/suppliers";
import { fetchPayments } from "@/lib/actions/banks";
import ManagemovementClient from "../_components/getMovementhistry";
import ManageStocksClient from "../_components/manageinvetoryClient";

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

  const b = await fetchPayments();
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
  const MultipleInventory = await fetchAllFormDatas(user.companyId);
  // Tab-specific params
  let inventoryParams: any = {};
  let movementParams: any = {};

  if (currentTab === "inventory") {
    inventoryParams = { ...commonParams, query: inventoreyquery, where };
  } else if (currentTab === "movement") {
    movementParams = { ...commonParams, query: movementquery, input };
  }

  // Then call the functions
  const inventoryData = await getInventoryById(
    user.companyId,
    inventoryParams.query,
    inventoryParams.where,
    inventoryParams.from,
    inventoryParams.to,
    inventoryParams.pageIndex,
    inventoryParams.pageSize,
    inventoryParams.parsedSort,
  );

  return (
    <ManageStocksClient
      products={inventoryData.inventory}
      total={inventoryData.totalCount}
      formData={formData}
      multipleInventory={MultipleInventory}
      payments={b}
    />
  );
}
