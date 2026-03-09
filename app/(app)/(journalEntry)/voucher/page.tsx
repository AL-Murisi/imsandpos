import { getVouchers } from "@/lib/actions/Journal Entry";
import { getSession } from "@/lib/session";
import { SortingState } from "@tanstack/react-table";
import { ParsedSort } from "@/hooks/sort";
import VouvherEntriesTable from "../_components/voucherable";
type vocher = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    categoryId?: string;
    tab?: string;
    usersquery?: string;
    page?: string;
    limit?: string;
    allFrom?: string;
    allTo?: string;
    salesFrom?: string;
    salesTo?: string;
    purchasesFrom?: string;
    purchasesTo?: string;
    revenueFrom?: string;
    revenueTo?: string;
    debtFrom?: string;
    debtTo?: string;
    chartTo?: string;
    chartFrom?: string;
    sort: string;
    sale_type?: string;
  }>;
};

export default async function Voucher({ searchParams }: vocher) {
  const param = await searchParams;
  const {
    from,
    to,
    usersquery,
    page = "1",
    limit = "13",
    sale_type = "SALE",
    salesFrom,
    salesTo,
    purchasesFrom,
    purchasesTo,
    revenueFrom,
    revenueTo,
    debtFrom,
    debtTo,
    chartTo,
    chartFrom,
    allFrom,
    sort,
    allTo,
  } = param;
  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);
  const parsedSort: SortingState = ParsedSort(sort);
  const sessio = await getSession();
  if (!sessio) return;
  const voucher = await getVouchers(
    sessio.companyId,
    usersquery,
    from,
    to,
    pageIndex,
    pageSize,
    parsedSort,
  );
  return (
    <div className="p-3">
      <VouvherEntriesTable data={voucher.data ?? undefined} />
    </div>
  );
}
