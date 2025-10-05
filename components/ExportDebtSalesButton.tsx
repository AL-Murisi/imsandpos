// components/ExportDebtSalesButton.tsx
"use client";

import { useState } from "react";
import {
  Download,
  Loader2,
  FileText,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SortingState } from "@tanstack/react-table";

interface ExportDebtSalesButtonProps {
  from?: string;
  to?: string;
  usersquery?: string;
  pagesize?: number;
  limit?: number;
}

export function ExportDebtSalesButton({
  from,
  to,
  usersquery = "",
  pagesize,
  limit,
}: ExportDebtSalesButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(false);
    setProgress(10);

    try {
      setProgress(30);

      const response = await fetch("/api/export-debt-sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to,
          usersquery,
          pagesize,
          limit,
        }),
      });

      setProgress(60);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || errorData.error || "فشل في إنشاء التقرير",
        );
      }

      setProgress(80);

      // Create blob from response
      const blob = await response.blob();

      setProgress(90);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `debt-sales-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setProgress(100);
      setSuccess(true);

      // Reset after delay
      setTimeout(() => {
        setProgress(0);
        setSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "فشل في تصدير التقرير. حاول مرة أخرى.";
      setError(errorMessage);

      // Clear error after 5 seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className={`flex w-2xs flex-col gap-2 md:w-sm`}>
      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="relative gap-2 overflow-hidden"
      >
        {/* Progress bar */}
        {progress > 0 && (
          <div
            className="absolute top-0 right-0 h-full bg-blue-100 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}

        {/* Button content */}
        <span className="relative z-10 flex items-center gap-2">
          {success ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>تم التصدير بنجاح!</span>
            </>
          ) : isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {progress < 40
                  ? "جاري جلب البيانات..."
                  : progress < 70
                    ? "جاري إنشاء التقرير..."
                    : "جاري التحميل..."}
              </span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              تصدير تقرير الديون
            </>
          )}
        </span>
      </Button>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
