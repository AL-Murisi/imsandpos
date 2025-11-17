"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DownloadIcon } from "lucide-react";
import { format } from "date-fns/format";
import { SelectField } from "@/components/common/selection";
import { Calendar22 } from "@/components/common/DatePicker";

const reports = [
  { id: "sales", name: "تقرير المبيعات" },
  { id: "inventory", name: "تقرير المخزون" },
  { id: "payments", name: "تقرير المدفوعات" },
  { id: "customers", name: "تقرير العملاء" },
  { id: "profit-loss", name: "تقرير الربح والخسارة" },
];

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Get initial values from URL params
  const [fromDate, setFromDate] = useState<string>(
    searchParams.get("from") || "",
  );
  const [toDate, setToDate] = useState<string>(searchParams.get("to") || "");
  const [reportType, setReportType] = useState<string>(
    searchParams.get("reportType") || "",
  );

  // Update state if URL params change
  useEffect(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("reportType");

    if (from) setFromDate(from);
    if (to) setToDate(to);
    if (type) setReportType(type);
  }, [searchParams]);

  const handleDownload = async () => {
    if (!reportType) return alert("الرجاء اختيار نوع التقرير");
    setIsSubmitting(true);
    const endpoint = `/api/reports/${reportType}`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
        }),
      });

      if (!res.ok) return alert("فشل تحميل التقرير");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      a.click();

      window.URL.revokeObjectURL(url);
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      alert("حدث خطأ أثناء تحميل التقرير");
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-6 text-2xl font-bold">📊 التقارير</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {/* Report Type */}

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-3">
            <SelectField
              placeholder="اختر التقرير"
              options={reports}
              paramKey={"reportType"}
            />
          </div>

          {/* <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue placeholder="اختر التقرير" />
            </SelectTrigger>
            <SelectContent>
              {reports.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select> */}
          <div>
            {" "}
            <Calendar22 />
          </div>
        </div>

        {/* From Date */}
      </div>

      <Button
        disabled={isSubmitting}
        onClick={handleDownload}
        className="flex items-center gap-2"
      >
        <DownloadIcon className="h-4 w-4" />
        {isSubmitting ? "  تنزيل التقرير" : "تحميل التقرير"}
      </Button>
    </div>
  );
}
