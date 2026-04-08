import { fetchPOSManagers, getPOSList } from "@/lib/actions/pos";
import { getCompanySubscriptionUsage } from "@/lib/actions/subscription";
import SalesPointTable from "./_components/Table";
import { getSession } from "@/lib/session";

export default async function SalePoint() {
  const user = await getSession();
  if (!user) return;
  const [userSelection, salesPoint, subscriptionUsage] = await Promise.all([
    fetchPOSManagers(user.companyId),
    getPOSList(user.companyId),
    getCompanySubscriptionUsage(),
  ]);
  return (
    <div className="p-3">
      <SalesPointTable
        salespoint={Promise.resolve(salesPoint)}
        total={0}
        role={Promise.resolve(userSelection)}
        branchLimit={subscriptionUsage?.branches ?? null}
      />
    </div>
  );
}
