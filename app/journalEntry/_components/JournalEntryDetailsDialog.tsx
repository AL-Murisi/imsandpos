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
    entry_number: string;
    entry_date: string;
    description: string;
    debit: number;
    credit: number;
    is_posted: boolean;
    is_automated: boolean;
    reference_type: string | null;
    reference_id: string | null;
    fiscal_period: string | null;
    accounts: {
      account_code: string | null;
      account_name_ar: string | null;
      account_name_en: string;
    };
  };
}

export default function JournalEntryDetailsDialog({
  entry,
}: JournalEntryDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const { formatCurrency } = useFormatter();
  const handlepostin = async () => {
    const result = await UpateJournalEntriesPosting([entry.entry_number], true);
    if (result.success) {
      toast(`${entry.description}تم ترحيل القيد المحاسبي بنجاح ✅`);
    } else {
      toast(`${result.error}حدث خطأ أثناء ترحيل القيد المحاسبي ❌`);
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
        {/* Entry Header */}
        <div className="rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <span className="font-mono text-2xl font-bold text-indigo-900">
                  {entry.entry_number}
                </span>
                {entry.is_automated && (
                  <Badge className="bg-blue-600 text-white">قيد تلقائي</Badge>
                )}
                {entry.is_posted ? (
                  <Badge className="bg-green-600 text-white">مرحّل</Badge>
                ) : (
                  <Badge className="bg-yellow-600 text-white">
                    قيد الإنشاء
                  </Badge>
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {entry.description}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {new Date(entry.entry_date).toLocaleDateString("ar-IQ", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Account Information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-1 text-sm text-gray-600">رمز الحساب</p>
            <p className="font-mono text-lg font-semibold text-gray-900">
              {entry.accounts.account_code}
            </p>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <p className="mb-1 text-sm text-gray-600">اسم الحساب</p>
            <p className="font-semibold text-gray-900">
              {entry.accounts.account_name_ar || entry.accounts.account_name_en}
            </p>
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <p className="mb-1 text-sm font-medium text-green-600">
              المبلغ المدين
            </p>
            <p className="font-mono text-2xl font-bold text-green-900">
              {formatCurrency(entry.debit)}
            </p>
          </div>

          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="mb-1 text-sm font-medium text-red-600">
              المبلغ الدائن
            </p>
            <p className="font-mono text-2xl font-bold text-red-900">
              {formatCurrency(entry.credit)}
            </p>
          </div>

          {entry.fiscal_period && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-1 text-sm text-gray-600">الفترة المالية</p>
              <p className="font-semibold text-gray-900">
                {entry.fiscal_period}
              </p>
            </div>
          )}

          {entry.reference_type && (
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-1 text-sm text-gray-600">نوع المرجع</p>
              <p className="font-semibold text-gray-900">
                {typeMap[entry.reference_type] || entry.reference_type}
              </p>
            </div>
          )}
        </div>

        {/* Reference Information */}
        {entry.reference_id && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="mb-2 text-sm font-medium text-blue-600">
              معلومات المرجع
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">معرّف المرجع</p>
                <p className="font-mono text-sm text-gray-900">
                  {entry.reference_id}
                </p>
              </div>
              <Button variant="outline" size="sm">
                عرض المرجع
              </Button>
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="border-t pt-4">
          <h4 className="mb-3 font-semibold">معلومات إضافية</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">نوع القيد:</span>
              <span className="mr-2 font-medium">
                {entry.is_automated
                  ? "قيد تلقائي (تم إنشاؤه من معاملة)"
                  : "قيد يدوي"}
              </span>
            </div>
            <div>
              <span className="text-gray-600">الحالة:</span>
              <span className="mr-2 font-medium">
                {entry.is_posted ? "مرحّل إلى دفتر الأستاذ" : "قيد الإنشاء"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            إغلاق
          </Button>
          {!entry.is_posted && (
            <Button onClick={handlepostin}>ترحيل القيد</Button>
          )}
        </div>
      </ScrollArea>
    </Dialogreuse>
  );
}
