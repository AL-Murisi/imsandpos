import { getCustomerById } from "@/lib/actions/customers";
import { getSession } from "@/lib/session";
import CustomerClinet from "./_components/table";
import { getCompanySubscriptionUsage } from "@/lib/actions/subscription";
type DashboardProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    categoryId?: string;

    customersquery?: string;
    page?: string;
    limit?: string;

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

    customersquery,
    page = "1",
    limit = "13",
  } = param || {};

  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);
  const [data, subscriptionUsage] = await Promise.all([
    getCustomerById(
      user.companyId,
      pageIndex,
      pageSize,
      customersquery,
      undefined,
      from,
      to,
    ),
    getCompanySubscriptionUsage(),
  ]);
  // const data = await FetchDebtSales(filter);
  return (
    <div className="p-3">
      {" "}
      <CustomerClinet
        users={data.result}
        total={data.total}
        cus={subscriptionUsage?.users ?? null}
      />
    </div>
  );
}
