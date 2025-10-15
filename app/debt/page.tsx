import { FetchDebtSales } from "@/app/actions/sells";
import { ParsedSort } from "@/hooks/sort";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
import DebtSells from "./_components/table";
type DashboardProps = {
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
  }>;
};
export default async function DebtSell({ searchParams }: DashboardProps) {
  const param = await searchParams;
  const {
    from,
    to,

    usersquery = "",
    page = "1",
    limit = "13",
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
  const filter: Prisma.SaleWhereInput = {
    paymentStatus: {
      in: ["partial"],
    },
  };
  const parsedSort: SortingState = ParsedSort(sort);
  const data = await FetchDebtSales(
    filter,
    usersquery,
    from,
    to,
    pageIndex,
    pageSize,
    parsedSort,
  );
  return (
    <div dir="rtl">
      <DebtSells
        data={data}
        total={data.length}
        sort={parsedSort}
        from={from ?? ""}
        to={to ?? ""}
        usersquery={usersquery ?? ""}
        pagesize={pageIndex}
        limit={pageSize}
      />
    </div>
  );
}
