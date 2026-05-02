import { getInventoryBatchesByCompany } from "@/lib/actions/warehouse";
import { getSession } from "@/lib/session";
import BatchesTable from "./table";

type DashboardProps = {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    batchquery?: string;
    expiryStatus?: string;
    warehouseId?: string;
    inventoryId?: string;
    supplierId?: string;
  }>;
};

export default async function BatchesPage({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const user = await getSession();
  if (!user) return null;

  const page = Math.max(Number(params.page ?? 1), 1);
  const limit = Math.max(Number(params.limit ?? 20), 1);
  const expiryStatus = params.expiryStatus ?? "all";
  const batchquery = params.batchquery ?? "";

  const result = await getInventoryBatchesByCompany(user.companyId, {
    searchQuery: batchquery,
    expiryStatus,
    warehouseId: params.warehouseId,
    supplierId: params.supplierId,
    page,
    pageSize: limit,
    inventoryId: params.inventoryId,
  });

  return (
    <div className="p-3">
      <BatchesTable
        batches={result.data as any[]}
        total={result.totalCount}
        stats={result.stats}
        expiryStatus={expiryStatus}
      />
    </div>
  );
}
