"use client";
import { useState, useEffect } from "react";
import { createFiscalYear } from "@/lib/actions/fiscalYear";
import { DataTable } from "@/components/common/ReusbleTable";
import { fiscalYearColumns } from "./columns/journalEntryColumns";
import { useTablePrams } from "@/hooks/useTableParams";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function FiscalYearManager({
  fiscalYear,
}: {
  fiscalYear: any[];
}) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const handleCreate = async () => {
    if (!start || !end) return alert("Set start and end dates");
    setLoading(true);
    await createFiscalYear(start, end);
    setLoading(false);
  };

  // const handleSetActive = async (id: string) => {
  // await setActiveFiscalYear(companyId, id);
  //   await loadYears();
  // };
  const {
    pagination,
    sorting,
    globalFilter,
    setPagination,
    setSorting,
    setGlobalFilter,
    setParam,
  } = useTablePrams();

  return (
    <div className="bg-accent p-3">
      <div className="grid grid-cols-1 gap-3">
        {/* Start Date */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="grid gap-1">
            <Label htmlFor="start">تاريخ البداية</Label>
            <Input
              id="start"
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="grid gap-1">
            <Label htmlFor="end">تاريخ النهاية</Label>
            <Input
              id="end"
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
        </div>
        {/* Button */}
        <Button onClick={handleCreate} disabled={loading} className="w-40">
          {loading ? "جارٍ الحفظ..." : "حفظ السنة المالية"}
        </Button>
      </div>

      <DataTable
        data={fiscalYear}
        columns={fiscalYearColumns}
        initialPageSize={pagination.pageSize}
        pageCount={Math.ceil(fiscalYear.length / pagination.pageSize)}
        pageActiom={setPagination}
        onSortingChange={setSorting}
        onGlobalFilterChange={setGlobalFilter}
        globalFilter={globalFilter}
        sorting={sorting}
        pagination={pagination}
        highet="h-[50vh]"
        totalCount={fiscalYear.length}
      />
    </div>
  );
}
