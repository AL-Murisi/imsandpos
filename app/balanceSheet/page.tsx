import { getBalanceSheet } from "../actions/Journal Entry";
import BalanceSheet from "./BalanceSheet";

type sheetProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
    productquery?: string;
    sort?: string;
    entryType?: string;
    account_id?: string;
    categoryId?: string;
    isPosted?: string;
  }>;
};

export default async function BalanceSheetPage({ searchParams }: sheetProps) {
  const param = await searchParams;
  const {
    from,
    to,
    productquery = "",
    page = "1",
    limit = "13",
    sort,
    entryType,
    account_id,
    isPosted,
  } = param || {};

  const balancesheet = await getBalanceSheet(from, to);

  // Handle case where getBalanceSheet returns empty array or invalid data
  if (!balancesheet || Array.isArray(balancesheet) || !balancesheet.assets) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50"
        dir="rtl"
      >
        <div className="max-w-md rounded-xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-5xl text-gray-400">📊</div>
          <h2 className="mb-2 text-2xl font-bold text-gray-800">
            لا توجد بيانات
          </h2>
          <p className="text-gray-600">
            لم يتم العثور على بيانات الميزانية العمومية
          </p>
        </div>
      </div>
    );
  }

  return <BalanceSheet balanceSheetData={balancesheet} />;
}
