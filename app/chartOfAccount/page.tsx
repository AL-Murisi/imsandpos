// app/accounting/chart-of-accounts/page.tsx

import { ParsedSort } from "@/hooks/sort";
import { Prisma } from "@prisma/client";
import { SortingState } from "@tanstack/react-table";
import ChartOfAccountsTable from "./_components/table";
import { use } from "react";
import { getSession } from "@/lib/session";
import {
  getChartOfAccounts,
  getParentAccounts,
} from "../actions/chartOfaccounts";

type ChartOfAccountsPageProps = {
  searchParams: Promise<{
    search?: string;
    accountType?: string;
    accountCategory?: string;
    page?: string;
    limit?: string;
    sort?: string;
    status?: string;
  }>;
};

export default async function ChartOfAccountsPage({
  searchParams,
}: ChartOfAccountsPageProps) {
  const params = await searchParams;
  const {
    search = "",
    accountType = "all",
    accountCategory = "all",
    page = "1",
    limit = "20",
    sort,
    status = "all",
  } = params;

  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  // Build filter
  const filter: Prisma.accountsWhereInput = {};

  if (accountType && accountType !== "all") {
    filter.account_type = accountType as any;
  }

  if (accountCategory && accountCategory !== "all") {
    filter.account_category = accountCategory as any;
  }

  if (status && status !== "all") {
    filter.is_active = status === "active";
  }

  if (search) {
    filter.OR = [
      { account_code: { contains: search, mode: "insensitive" } },
      { account_name_en: { contains: search, mode: "insensitive" } },
      { account_name_ar: { contains: search, mode: "insensitive" } },
    ];
  }

  const user = await getSession();
  if (!user) {
    return <div>Unauthorized</div>;
  }

  const parsedSort: SortingState = ParsedSort(sort);

  // Fetch dat
  const { totals, data } = await getChartOfAccounts();
  // const result = await getChartOfAccounts();

  // if (!data.success) {
  //   return <div>Error loading accounts</div>;
  // }

  // Filter data based on search params
  let filteredData = data || [];

  if (accountType && accountType !== "all") {
    filteredData = filteredData.filter(
      (acc: any) => acc.account_type === accountType,
    );
  }

  if (accountCategory && accountCategory !== "all") {
    filteredData = filteredData.filter(
      (acc: any) => acc.account_category === accountCategory,
    );
  }

  if (status && status !== "all") {
    filteredData = filteredData.filter((acc: any) =>
      status === "active" ? acc.is_active : !acc.is_active,
    );
  }

  if (search) {
    filteredData = filteredData.filter(
      (acc: any) =>
        acc.account_code?.toLowerCase().includes(search.toLowerCase()) ||
        acc.account_name_en?.toLowerCase().includes(search.toLowerCase()) ||
        acc.account_name_ar?.toLowerCase().includes(search.toLowerCase()),
    );
  }

  return (
    <div dir="rtl">
      <ChartOfAccountsTable
        data={filteredData}
        total={filteredData.length}
        totals={totals}
        sort={parsedSort}
        accountType={accountType}
        accountCategory={accountCategory}
        pagesize={pageIndex}
        limit={pageSize}
        searchQuery={search}
      />
    </div>
  );
}
