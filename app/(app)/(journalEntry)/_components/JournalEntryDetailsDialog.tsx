"use client";

import Dialogreuse from "@/components/common/dailogreuse";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFormatter } from "@/hooks/usePrice";
import { UpateJournalEntriesPosting } from "@/lib/actions/Journal Entry";
import { Eye } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface JournalEntryDetailsDialogProps {
  entry: {
    id: string;
    entryNumber: string;
    entryDate: string;
    description?: string | null;
    status: string;
    referenceType?: string | null;
    createdUser?: { name?: string | null; email?: string | null } | null;
    lines: {
      debit: number;
      credit: number;
      currencyCode?: string | null;
      memo?: string | null;
      account: {
        account_code: string | null;
        account_name_ar: string | null;
        account_name_en: string;
      };
    }[];
    debit: number;
    credit: number;
  };
}

export default function JournalEntryDetailsDialog({
  entry,
}: JournalEntryDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const { formatCurrency } = useFormatter();

  const handlepostin = async () => {
    const result = await UpateJournalEntriesPosting([entry.entryNumber], true);
    if (result.success) {
      toast(`تم ترحيل القيد ${entry.entryNumber} بنجاح ✅`);
    } else {
      toast(`حدث خطأ أثناء ترحيل القيد ❌`);
    }
  };

  const typeMap: Record<string, string> = {
    sale: "بيع",
    purchase: "شراء",
    expense: "مصروف",
    payment: "دفعة",
    supplier_payment: "دفعة لمورد",
    opening_balance: "رصيد افتتاحي",
  };

  const isPosted = entry.status === "POSTED";

  return (
    <Dialogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-100"
        >
          <Eye className="h-4 w-4" />
        </Button>
      }
      titel="تفاصيل القيد"
      description="معلومات تفصيلية عن القيد المحاسبي"
      style={""}
    >
      <ScrollArea className="max-h-[80vh] w-full space-y-6">
        <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="font-mono text-2xl font-bold text-indigo-900">
                  {entry.entryNumber}
                </span>
                {isPosted ? (
                  <Badge className="bg-green-600 text-white">مرحل</Badge>
                ) : (
                  <Badge className="bg-yellow-600 text-white">
                    قيد الإنشاء
                  </Badge>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {entry.description || "—"}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {new Date(entry.entryDate).toLocaleDateString("ar-IQ", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {entry.createdUser?.name && (
                <p className="mt-1 text-sm text-gray-600">
                  أنشأ بواسطة: {entry.createdUser.name}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-1 text-sm text-gray-600">نوع المرجع</p>
            <p className="font-semibold text-gray-900">
              {entry.referenceType
                ? typeMap[entry.referenceType] || entry.referenceType
                : "—"}
            </p>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="mb-1 text-sm font-medium text-green-600">المدين</p>
            <p className="font-mono text-2xl font-bold text-green-900">
              {formatCurrency(entry.debit)}
            </p>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="mb-1 text-sm font-medium text-red-600">الدائن</p>
            <p className="font-mono text-2xl font-bold text-red-900">
              {formatCurrency(entry.credit)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <h4 className="mb-3 font-semibold">تفاصيل البنود</h4>
          <div className="space-y-3">
            {entry.lines.map((line, idx) => (
              <div key={idx} className="rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {line.account.account_name_ar ||
                        line.account.account_name_en}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {line.account.account_code || ""}
                    </p>
                    {line.memo && (
                      <p className="mt-1 text-xs text-gray-600">{line.memo}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-700">
                      مدين: {formatCurrency(Number(line.debit || 0))}
                    </p>
                    <p className="text-sm text-red-700">
                      دائن: {formatCurrency(Number(line.credit || 0))}
                    </p>
                    {line.currencyCode && (
                      <p className="text-xs text-gray-500">
                        العملة: {line.currencyCode}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            إغلاق
          </Button>
          {!isPosted && (
            <Button onClick={handlepostin}>ترحيل القيد</Button>
          )}
        </div>
      </ScrollArea>
    </Dialogreuse>
  );
}
