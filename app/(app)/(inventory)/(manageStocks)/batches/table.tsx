"use client";

import Link from "next/link";
import { Calendar22 } from "@/components/common/DatePicker";
import { DataTable } from "@/components/common/ReusbleTable";
import SearchInput from "@/components/common/searchtest";
import { Button } from "@/components/ui/button";
import { useTablePrams } from "@/hooks/useTableParams";
import { batchColumns } from "../_components/columnsMovment";
import { useSearchParams } from "next/navigation";

type BatchRow = {
  id: string;
  quantity: number;
  remainingQuantity: number;
  costPrice: string | number;
  expiredAt: string | Date | null;
  receivedAt: string | Date;
  status: string;
  supplier?: { id: string; name: string } | null;
  inventory: {
    product: { id: string; name: string; sku: string };
    warehouse: { id: string; name: string; location: string };
  };
};

type BatchStats = {
  active: number;
  soon: number;
  expired: number;
  totalTracked: number;
};

type BatchesTableProps = {
  batches: BatchRow[];
  total: number;
  stats: BatchStats;
  expiryStatus: string;
};

function buildHref(
  current: Record<string, string | undefined>,
  expiryStatus: string,
) {
  const params = new URLSearchParams();

  if (expiryStatus !== "all") {
    params.set("expiryStatus", expiryStatus);
  }

  if (current.batchquery) {
    params.set("batchquery", current.batchquery);
  }

  if (current.page && current.page !== "1") {
    params.set("page", current.page);
  }

  if (current.limit && current.limit !== "20") {
    params.set("limit", current.limit);
  }

  if (current.warehouseId) {
    params.set("warehouseId", current.warehouseId);
  }

  if (current.supplierId) {
    params.set("supplierId", current.supplierId);
  }

  const query = params.toString();
  return query ? `/batches?${query}` : "/batches";
}

export default function BatchesTable({
  batches,
  total,
  stats,
  expiryStatus,
}: BatchesTableProps) {
  const {
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
    warehouseId,
    supplierId,
  } = useTablePrams();
  const searchParams = useSearchParams();

  const current = {
    page: String(pagination.pageIndex + 1),
    limit: String(pagination.pageSize),
    batchquery: searchParams.get("batchquery") ?? "",
    warehouseId: warehouseId?.toString(),
    supplierId: supplierId?.toString(),
  };

  const tabs = [
    { key: "all", label: "الكل" },
    { key: "expired", label: "منتهي" },
    { key: "soon", label: "قريب من الانتهاء" },
  ] as const;

  return (
    <div
      className="bg-accent w-full rounded-2xl p-2 shadow-xl/20 shadow-gray-500 group-data-[[state=pending]]:animate-pulse"
      dir="rtl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 p-2">
        <div className="flex flex-wrap gap-2">
          <Calendar22 />
          <SearchInput placeholder="بحث في الدُفعات..." paramKey="batch" />
        </div>

        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <Button
              key={item.key}
              asChild
              variant={expiryStatus === item.key ? "default" : "outline"}
            >
              <Link href={buildHref(current, item.key)}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 px-2 pb-2 md:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
          <div className="text-sm text-slate-200">إجمالي الدُفعات</div>
          <div className="mt-2 text-3xl font-semibold">
            {stats.totalTracked}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
          <div className="text-sm text-slate-200">منتهي</div>
          <div className="mt-2 text-3xl font-semibold">{stats.expired}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
          <div className="text-sm text-slate-200">قريب من الانتهاء</div>
          <div className="mt-2 text-3xl font-semibold">{stats.soon}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
          <div className="text-sm text-slate-200">ساري</div>
          <div className="mt-2 text-3xl font-semibold">{stats.active}</div>
        </div>
      </div>

      <DataTable
        data={batches}
        columns={batchColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.max(Math.ceil(total / pagination.pageSize), 1)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        highet="h-[48vh]"
        totalCount={total}
      />
    </div>
  );
}
