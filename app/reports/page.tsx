import { ScrollArea } from "@/components/ui/scroll-area";
import ReportsPage from "./clinet";
import { Fetchcustomerbyname } from "@/lib/actions/customers";
import { Fetchbanks, getbanks } from "@/lib/actions/banks";
import { FetchSupplierbyname } from "@/lib/actions/suppliers";
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
  const suppliers = await FetchSupplierbyname(usersquery);
  const banks = await Fetchbanks();
  return (
    <ScrollArea className="max-h-[95vh] p-2" dir="rtl">
      <ReportsPage users={users} suppliers={suppliers} banks={banks} />
    </ScrollArea>
  );
}
