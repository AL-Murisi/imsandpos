import { getExpenseCategories } from "@/lib/actions/Journal Entry";

import { Fetchcustomerbyname } from "@/lib/actions/customers";
import { getSuppliers } from "@/lib/actions/manualJournalEntry";
import ManualJournalEntry from "../_components/Manualjournal";
import { Suspense } from "react";
import JournalEntrySkeleton from "./loading";

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

  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  // ✅ Ensure async calls are awaited
  const [accounts, customers, suppliers] = await Promise.all([
    getExpenseCategories(),
    Fetchcustomerbyname(usersquery),
    getSuppliers(),
  ]);

  return (
    <Suspense fallback={<JournalEntrySkeleton />}>
      {" "}
      <ManualJournalEntry
        account={accounts}
        customers={customers}
        suppliers={suppliers}
      />{" "}
    </Suspense>
  );
}
