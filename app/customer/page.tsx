import dynamic from "next/dynamic";
import CustomerClinet from "./debtSell/table";
import { getCustomerById } from "../actions/customers";
import { getSession } from "@/lib/session";
type DashboardProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    categoryId?: string;
    tab?: string;
    customersquery?: string;
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
  const user = await getSession();
  if (!user?.companyId) return;
  const param = await searchParams;
  const {
    from,
    to,

    customersquery = "",
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
  const data = getCustomerById(user.companyId, customersquery);
  // const data = await FetchDebtSales(filter);
  return (
    <div className="rounded-xl p-3">
      <CustomerClinet users={data} total={0} role={[]} />
    </div>
  );
}
