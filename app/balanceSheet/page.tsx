import { getBalanceSheet } from "@/lib/actions/Journal Entry";
import BalanceSheet from "./BalanceSheet";

export default async function BalanceSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const asOfDate = params?.date ? new Date(params.date) : new Date();

  const result = await getBalanceSheet(asOfDate);
  console.log(result.data);
  if (!result?.data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        لا توجد بيانات
      </div>
    );
  }

  return (
    <BalanceSheet
      balanceSheetData={{
        ...result.data,
        assets: result.data.assets.map((asset) => ({
          ...asset,
          name_ar: asset.name_ar ?? "",
        })),
        liabilities: result.data.liabilities.map((liability) => ({
          ...liability,
          name_ar: liability.name_ar ?? "",
        })),
        equity: result.data.equity.map((equityItem) => ({
          ...equityItem,
          name_ar: equityItem.name_ar ?? "",
        })),
      }}
    />
  );
}
