import React from "react";
import JournalEntriesTable from "./_components/table";
import {
  getExpenseCategories,
  getJournalEntries,
} from "@/lib/actions/Journal Entry";
import { getFiscalYears } from "@/lib/actions/fiscalYear";

type JournalProps = {
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

export default async function Page({ searchParams }: JournalProps) {
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

  // ✅ Fix: default to false, and handle "true"/"false" correctly
  const posted =
    isPosted === "true" ? true : isPosted === "false" ? false : false;

  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  // ✅ Ensure async calls are awaited
  const data = getJournalEntries(
    account_id,
    posted,
    from,
    to,
    pageIndex,
    pageSize,
  );
  const accounts = getExpenseCategories();
  const fy = getFiscalYears();

  return (
    <JournalEntriesTable dataj={data} acounts={accounts} fiscalYears={fy} />
  );
}
