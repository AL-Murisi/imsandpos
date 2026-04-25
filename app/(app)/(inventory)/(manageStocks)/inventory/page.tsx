import { ParsedSort } from "@/hooks/sort";
import { fetchAllFormData } from "@/lib/actions/roles";
import { fetchAllFormDatas, getInventoryById } from "@/lib/actions/warehouse";
import { getSession } from "@/lib/session";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";

import { fetchPayments } from "@/lib/actions/banks";
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
    stockStatus?: string;
  }>;
};

export default async function manageStocks({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const {
    from,
    to,
    query = "",
    page = "1",
    limit = "13",
    sort,
    inventoreyquery = "",
    supplierId,
    warehouseId,
    categoryId,
    tab,
    stockStatus,
  } = params || {};

  const currentTab = tab ?? "inventory";
  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  const where: Prisma.InventoryWhereInput = {
    warehouseId,
  };

  if (stockStatus === "low") {
    where.status = "attention";
  } else if (stockStatus === "out_of_stock") {
    where.status = "out_of_stock";
  }
  const user = await getSession();
  if (!user) return;
  const parsedSort: SortingState = ParsedSort(sort);

  const [b, formData, MultipleInventory, inventoryData] = await Promise.all([
    fetchPayments(),
    fetchAllFormData(user.companyId),
    fetchAllFormDatas(user.companyId),
    getInventoryById(
      user.companyId,
      query,
      where,
      from,
      to,
      pageIndex,
      pageSize,
      parsedSort,
    ),
  ]);
  // Collect common params

  return (
    <div className="p-3">
      <ManageStocksClient
        products={inventoryData.inventory}
        total={inventoryData.totalCount}
        formData={formData}
        multipleInventory={MultipleInventory}
        payments={b}
      />
    </div>
  );
}
