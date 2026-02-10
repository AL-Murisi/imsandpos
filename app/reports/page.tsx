import { ScrollArea } from "@/components/ui/scroll-area";
import ReportsPage from "./clinet";
import { Fetchcustomerbyname } from "@/lib/actions/customers";
import {
  fetchAccountsForSelect,
  Fetchbanks,
  getbanks,
} from "@/lib/actions/banks";
import { FetchSupplierbyname } from "@/lib/actions/suppliers";
import { getUsers } from "@/lib/actions/activitylogs";
import { filteringData } from "@/lib/actions/roles";
import { fetchbranches } from "@/lib/actions/pos";
type Props = {
  searchParams: Promise<{
    productquery?: string;

    usersquery?: string;
    categoryId?: string | string[]; // ✅ handle single or multiple
    supplierId?: string;
    warehouseId?: string;
    id?: string;
  }>;
};

export default async function page({ searchParams }: Props) {
  const { usersquery = "" } = await searchParams;

  const filtering = await filteringData();

  const [users, banks, accounts, branch] = await Promise.all([
    Fetchcustomerbyname(usersquery),
    Fetchbanks(),

    fetchAccountsForSelect(),
    fetchbranches(),
  ]);
  return (
    <ScrollArea className="max-h-[95vh] p-2" dir="rtl">
      <ReportsPage
        users={users}
        branch={branch}
        suppliers={filtering?.suppliers}
        banks={banks}
        user={filtering?.user}
        accounts={accounts}
        warehouse={filtering?.warehouses}
      />
    </ScrollArea>
  );
}
