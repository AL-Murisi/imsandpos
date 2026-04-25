"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Dailogreuse from "@/components/common/dailogreuse";

export default function FiscalYearDetailsDialog({
  fiscalYear,
}: {
  fiscalYear: any;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const router = useRouter();

  const handleCloseFiscalYear = async (id: string) => {
    try {
      setClosing(true);

      const response = await fetch("/api/fisicalyear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fiscalYearId: id }),
      });

      const data = await response.json();
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || "Failed to close fiscal year");
      }

      toast.success(data?.message || "Fiscal year closed successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to close fiscal year";
      toast.error(message);
    } finally {
      setClosing(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={<Eye className="h-4 w-4" />}
      style="max-h-[90vh] overflow-y-auto sm:max-w-3xl"
      description="معلومات تفصيلية عن السنة المالية"
    >
      <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <span className="font-mono text-2xl font-bold text-indigo-900">
                {fiscalYear.period_name ?? fiscalYear.year_name}
              </span>

              {fiscalYear.is_closed ? (
                <Badge className="bg-red-600 text-white">مقفلة</Badge>
              ) : (
                <Badge className="bg-green-600 text-white">نشطة</Badge>
              )}
            </div>

            <h3 className="text-xl font-bold text-gray-900">
              السنة المالية {fiscalYear.period_name ?? fiscalYear.year_name}
            </h3>

            <p className="mt-1 text-sm text-gray-600">
              من{" "}
              {new Date(fiscalYear.start_date).toLocaleDateString("ar-IQ", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              إلى{" "}
              {new Date(fiscalYear.end_date).toLocaleDateString("ar-IQ", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <h3 className="text-lg font-semibold">الفترات التابعة</h3>

        {fiscalYear.periods?.length === 0 && (
          <p className="text-sm text-gray-500">لا توجد فترات متاحة.</p>
        )}

        {fiscalYear.periods?.map((period: any, i: number) => (
          <div
            key={period.id}
            className="flex items-center justify-between rounded-lg border bg-gray-50 p-4"
          >
            <div>
              <p className="font-semibold">
                الفترة {i + 1}: {period.period_name}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(period.start_date).toLocaleDateString("ar-IQ")} -{" "}
                {new Date(period.end_date).toLocaleDateString("ar-IQ")}
              </p>
            </div>

            {period.is_closed ? (
              <Badge className="bg-red-500 text-white">مقفلة</Badge>
            ) : (
              <Badge className="bg-green-500 text-white">نشطة</Badge>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-3 border-t pt-4">
        <Button variant="outline" onClick={() => setOpen(false)}>
          إغلاق
        </Button>

        {!fiscalYear.is_closed && (
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={() => handleCloseFiscalYear(fiscalYear.id)}
            disabled={closing}
          >
            {closing ? "جارٍ الإقفال..." : "إقفال السنة"}
          </Button>
        )}
      </div>
    </Dailogreuse>
  );
}
