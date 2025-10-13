"use client";

import React, { useState } from "react";
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
import { CalendarIcon, DownloadIcon } from "lucide-react";
import { format } from "date-fns";

const reports = [
  { value: "sales", label: "Sales Report" },
  { value: "inventory", label: "Inventory Report" },
  { value: "payments", label: "Payments Report" },
  { value: "customers", label: "Customers Report" },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const handleDownload = async () => {
    if (!reportType) return alert("Please select a report type");

    // Example API call
    const query = new URLSearchParams({
      reportType,
      fromDate,
      toDate,
    });

    const res = await fetch(`/api/reports/download?${query.toString()}`);
    if (!res.ok) return alert("Failed to download report");

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${reportType}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-6 text-2xl font-bold">📊 Reports</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {/* Report Type */}
        <div>
          <Label>Report Type</Label>
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger>
              <SelectValue placeholder="Select a report" />
            </SelectTrigger>
            <SelectContent>
              {reports.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* From Date */}
        <div>
          <Label>From</Label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            placeholder="Start date"
          />
        </div>

        {/* To Date */}
        <div>
          <Label>To</Label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            placeholder="End date"
          />
        </div>
      </div>

      <Button onClick={handleDownload} className="flex items-center gap-2">
        <DownloadIcon className="h-4 w-4" />
        Download Report
      </Button>
    </div>
  );
}
