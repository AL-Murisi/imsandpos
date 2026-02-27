"use client";

import { useTablePrams } from "@/hooks/useTableParams";

import { SelectField } from "@/components/common/selection";

import dynamic from "next/dynamic";

// import SearchInput from "@/components/common/SearchInput";
const DataTable = dynamic(
  () => import("@/components/common/ReusbleTable").then((m) => m.DataTable),
  {
    ssr: true, // 🔥 IMPORTANT
    // loading: () => <TableSkeleton rows={20} columns={10} />,
  },
);

const CustomerForm = dynamic(() => import("./Newcustomer"), {
  ssr: false,
});
import SearchInput from "@/components/common/searchtest";
import { customerColumns } from "./columns";
import TableSkeleton from "@/components/common/TableSkeleton";
import { Calendar22 } from "@/components/common/DatePicker";
import { use, useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useRouter } from "next/navigation";

type Props = {
  users: any[];
  total: number;
  role: { id: string; name: string }[];
};

export default function CustomerClinet({ users, total, role }: Props) {
  const {
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
    warehouseId,
    supplierId,
    categoryId,
    roles,
    setParam,
  } = useTablePrams();
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    let channel: any;

    async function initRealtime() {
      const { supabase } = await import("@/lib/supabaseClient");

      if (!user?.companyId || !users?.length) return;

      const customerIds = new Set(users.map((c) => c.id));

      channel = supabase
        .channel(`journal-${user.companyId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "journal_entries",
            filter: `company_id=eq.${user.companyId}`,
          },
          (payload) => {
            const newRow = payload.new as { reference_id?: string };

            if (newRow?.reference_id && customerIds.has(newRow.reference_id)) {
              router.refresh();
            }
          },
        )
        .subscribe();
    }

    initRealtime();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [user?.companyId, users]);
  const [message, setMessage] = useState<string | null>(null);
  async function sendWebPush(message: string) {
    if (!message) return alert("Message is empty");
    if (!user) return alert("No subscription");

    try {
      await fetch("/api/web-push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: user.companyId,
          title: "Test Notification",
          body: message,
        }),
      });
      // alert("Push sent 🚀");
    } catch (err) {
      console.error(err);
      alert("Failed to send push");
    }
  }
  return (
    <div className="bg-accent flex flex-col p-3" dir="rtl">
      {/* Add dir="rtl" for proper RTL layout */}
      <input
        placeholder={"Type push message ..."}
        value={message ?? ""}
        onChange={(e) => setMessage(e.target.value)}
      />
      <button onClick={() => sendWebPush(message ?? "")}>Test Web Push</button>
      {message}
      <DataTable
        search={
          <div className="mb-2 flex flex-wrap gap-2">
            <Calendar22 />
            <SearchInput placeholder={"بحث"} paramKey={"customers"} />{" "}
            {/* Translate placeholder */}
            <SelectField options={role} paramKey="role" placeholder="الفئة" />
            <CustomerForm />
          </div>
        }
        data={users}
        columns={customerColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(total / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        totalCount={total}
        highet="h-[68vh]"
      />
      {/* <CustomerStatementPage customers={user.result} /> */}
    </div>
  );
}

