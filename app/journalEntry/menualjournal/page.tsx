import {
  getExpenseCategories,
  getJournalEntries,
} from "@/lib/actions/Journal Entry";
import { getFiscalYears } from "@/lib/actions/fiscalYear";

import { Fetchcustomerbyname } from "@/lib/actions/customers";
import { getSuppliers } from "@/lib/actions/manualJournalEntry";
import ManualJournalEntry from "../_components/Manualjournal";

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
  const [data, accounts, fiscalYear, customers, suppliers] = await Promise.all([
    getJournalEntries(account_id, posted, from, to, pageIndex, pageSize),
    getExpenseCategories(),
    getFiscalYears(),
    Fetchcustomerbyname(usersquery),
    getSuppliers(),
  ]);

  return (
    <div className="p-2">
      <ManualJournalEntry
        account={accounts}
        customers={customers}
        suppliers={suppliers}
      />
    </div>
  );
}
