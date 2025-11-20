import { getCustomerStatement } from "@/app/actions/test";
import { getSession } from "@/lib/session";
import CustomerStatement from "./ccustomerStatment";
import { ScrollArea } from "@/components/ui/scroll-area";

export default async function CustomerStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
  }>;
}) {
  const user = await getSession();
  if (!user) return null;

  const { id } = await params; // 👈 wait for params before using
  const { from, to } = await searchParams;
  const dateFrom =
    from ||
    new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
  const dateTo = to || new Date().toISOString().split("T")[0];

  const result = await getCustomerStatement(
    id,
    user.companyId,
    dateFrom,
    dateTo,
  );

  if (!result.success) {
    return <div>Error: {result.error}</div>;
  }

  return (
    <ScrollArea className="max-h-[95vh] p-2" dir="rtl">
      <CustomerStatement customers={result.data} />
    </ScrollArea>
  );
}
