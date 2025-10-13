"use client";

import { useState } from "react";
import { Download, Loader2, FileText, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ExportDashboardButtonAPIProps {
  role: string;
  filters?: {
    allFrom?: string;
    allTo?: string;
    salesFrom?: string;
    salesTo?: string;
    purchasesFrom?: string;
    purchasesTo?: string;
    revenueFrom?: string;
    revenueTo?: string;
    debtFrom?: string;
    debtTo?: string;
  };
  pagination?: {
    page?: number;
    pageSize?: number;
    query?: string;
    sort?: string;
  };
  className?: string;
}

export function ExportDashboardButtonAPI({
  role,
  filters,
  pagination,
  className = "",
}: ExportDashboardButtonAPIProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setProgress(10);

    try {
      setProgress(30);

      const response = await fetch("/api/export-dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role,
          filters,
          pagination,
        }),
      });

      setProgress(60);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.details || errorData.error || "Failed to generate PDF",
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
      link.download = `dashboard-report-${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setProgress(100);
      toast("✅ creacting dasboard report successed");

      // Reset progress after a short delay
      setTimeout(() => {
        setProgress(0);
      }, 1000);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to export PDF. Please try again.";
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
    <div className={`flex flex-col gap-2 ${className}`}>
      <Button
        onClick={handleExport}
        disabled={isExporting}
        className="relative gap-2 overflow-hidden"
      >
        {/* Progress bar */}
        {progress > 0 && (
          <div
            className="absolute top-0 left-0 h-full bg-blue-100 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        )}

        {/* Button content */}
        <span className="relative z-10 flex items-center gap-2">
          {isExporting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {progress < 40
                  ? "Fetching data..."
                  : progress < 70
                    ? "Generating PDF..."
                    : "Downloading..."}
              </span>
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              تنزيل التقرير
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
