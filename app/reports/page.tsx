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
  const users = await Fetchcustomerbyname(usersquery);
  const banks = await Fetchbanks();
  const accounts = await fetchAccountsForSelect();
  const filtering = await filteringData();

  return (
    <ScrollArea className="max-h-[95vh] p-2" dir="rtl">
      <ReportsPage
        users={users}
        suppliers={filtering?.suppliers}
        banks={banks}
        user={filtering?.user}
        accounts={accounts}
        warehouse={filtering?.warehouses}
      />
    </ScrollArea>
  );
}
