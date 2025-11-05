import { fetchPOSManagers, getPOSList } from "@/lib/actions/pos";
import SalesPointTable from "./_components/Table";
import { getSession } from "@/lib/session";

export default async function SalePoint() {
  const user = await getSession();
  if (!user) return;
  const userSelection = fetchPOSManagers(user.companyId);
  if (!user) return;
  const salesPoint = getPOSList(user?.companyId);
  return (
    <div className="p-3">
      <SalesPointTable salespoint={salesPoint} total={0} role={userSelection} />
    </div>
  );
}
