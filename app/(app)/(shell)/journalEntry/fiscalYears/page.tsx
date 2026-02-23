import { getFiscalYears } from "@/lib/actions/fiscalYear";
import FiscalYearManager from "../_components/FiscalYearManager";

type JournalProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
    usersquery?: string;
    sort?: string;
    entryType?: string;
    account_id?: string;
    categoryId?: string;
    isPosted?: string;
  }>;
};

export default async function Page({ searchParams }: JournalProps) {
  const param = await searchParams;
  const {
    from,
    to,
    usersquery = "",
    page = "1",
    limit = "13",
    sort,
    entryType,
    account_id,
    isPosted,
  } = param || {};

  // ✅ Fix: default to false, and handle "true"/"false" correctly
  const posted =
    isPosted === "true" ? true : isPosted === "false" ? false : false;

  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  // ✅ Ensure async calls are awaited
  const fiscalYear = await getFiscalYears();

  return (
    <div className="p-2">
      <FiscalYearManager fiscalYear={fiscalYear ?? []} />
    </div>
  );
}
