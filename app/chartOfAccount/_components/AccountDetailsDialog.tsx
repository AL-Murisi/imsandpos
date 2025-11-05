"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Eye } from "lucide-react";
import { useFormatter } from "@/hooks/usePrice";
import Dailogreuse from "@/components/common/dailogreuse";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAccountDetails } from "@/lib/actions/chartOfaccounts";

interface AccountDetailsDialogProps {
  account: {
    id: string;
    account_code: string;
    account_name_en: string;
    account_name_ar: string | null;
    account_type: string;
    account_category: string;
    balance: number;
    level: number;
    is_active: boolean;
    is_system: boolean;
    parent_id: string | null;
    opening_balance?: number;
    description?: string;
    allow_manual_entry?: boolean;
    created_at?: string;
    updated_at?: string;
  };
}

export default function AccountDetailsDialog({
  account,
}: AccountDetailsDialogProps) {
  const router = useRouter();
  const { formatCurrency } = useFormatter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const typeMap: Record<string, string> = {
    ASSET: "أصول",
    LIABILITY: "خصوم",
    EQUITY: "حقوق ملكية",
    REVENUE: "إيرادات",
    EXPENSE: "مصروفات",
    COST_OF_GOODS: "تكلفة البضاعة",
  };

  const categoryMap: Record<string, string> = {
    CASH_AND_BANK: "نقد وبنوك",
    ACCOUNTS_RECEIVABLE: "ذمم مدينة",
    INVENTORY: "مخزون",
    FIXED_ASSETS: "أصول ثابتة",
    ACCOUNTS_PAYABLE: "ذمم دائنة",
    SALES_TAX_PAYABLE: "ضريبة مبيعات",
    OWNER_EQUITY: "رأس المال",
    RETAINED_EARNINGS: "أرباح محتجزة",
    SALES_REVENUE: "إيرادات مبيعات",
    COST_OF_GOODS_SOLD: "تكلفة البضاعة المباعة",
    OPERATING_EXPENSES: "مصاريف تشغيلية",
  };

  // 🔹 Fetch account details when dialog opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      getAccountDetails(account.id)
        .then((res) => {
          if (res.success) {
            setDetails(res.data);
          } else {
            console.error(res.error);
          }
        })
        .finally(() => setLoading(false));
    }
  }, [open, account.id]);

  const goToFullLedger = () => router.push(`/chartOfAccount/${account.id}`);

  const acc = details || account;
  const recentTransactions = details?.recentTransactions || [];

  return (
    <Dailogreuse
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
      style="overflow-y-auto sm:max-w-4xl"
      titel="تفاصيل الحساب"
      description="معلومات شاملة عن الحساب والمعاملات المرتبطة به"
    >
      <ScrollArea className="max-h-[90vh]">
        <div className="space-y-6">
          {/* Account Header */}
          <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-500 to-indigo-500 p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <span className="font-mono text-2xl font-bold">
                    {account.account_code}
                  </span>
                  {acc.is_system && (
                    <Badge className="bg-blue-600 text-white">حساب نظام</Badge>
                  )}
                  {acc.is_active ? (
                    <Badge className="bg-green-600 text-white">نشط</Badge>
                  ) : (
                    <Badge className="bg-gray-600 text-white">غير نشط</Badge>
                  )}
                </div>
                <h3 className="text-xl font-bold">
                  {account.account_name_ar || account.account_name_en}
                </h3>
                {acc.account_name_ar && (
                  <p className="mt-1 text-sm">{account.account_name_en}</p>
                )}
              </div>
              <div className="text-left">
                <p className="text-sm">الرصيد الحالي</p>
                <p
                  className={`text-3xl font-bold ${
                    account.balance > 0
                      ? "text-green-600"
                      : account.balance < 0
                        ? "text-red-600"
                        : ""
                  }`}
                >
                  {formatCurrency(account.balance)}
                </p>
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm">نوع الحساب</p>
              <p className="font-semibold">{typeMap[account.account_type]}</p>
            </div>
            <div>
              <p className="mb-1 text-sm">الفئة</p>
              <p className="font-semibold">
                {categoryMap[account.account_category] ||
                  account.account_category}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm">المستوى</p>
              <p className="font-semibold">المستوى {account.level}</p>
            </div>
            <div>
              <p className="mb-1 text-sm">الرصيد الافتتاحي</p>
              <p className="font-semibold">
                {formatCurrency(account.opening_balance || 0)}
              </p>
            </div>
          </div>

          {/* Recent Transactions */}
          <div>
            <h4 className="mb-4 flex items-center justify-between text-lg font-semibold">
              <span>آخر المعاملات</span>
              <Button variant="link" size="sm" onClick={goToFullLedger}>
                عرض الكل
              </Button>
            </h4>
            {loading ? (
              <div className="flex h-60 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        التاريخ
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        الوصف
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        مدين
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        دائن
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                        الرصيد
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTransactions.length > 0 ? (
                      recentTransactions.map((t: any) => (
                        <tr key={t.id} className="hover:bg-accent border-b">
                          <td className="px-4 py-3 text-sm">
                            {new Date(t.date).toLocaleDateString("ar-IQ")}
                          </td>
                          <td className="px-4 py-3 text-sm">{t.description}</td>
                          <td className="px-4 py-3 font-mono text-sm text-green-600">
                            {t.debit > 0 ? formatCurrency(t.debit) : "-"}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-red-600">
                            {t.credit > 0 ? formatCurrency(t.credit) : "-"}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm font-semibold">
                            {formatCurrency(t.balance)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={5}
                          className="py-8 text-center text-gray-500"
                        >
                          لا توجد معاملات
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              إغلاق
            </Button>
            <Button onClick={goToFullLedger}>عرض دفتر الأستاذ الكامل</Button>
          </div>
        </div>
      </ScrollArea>
    </Dailogreuse>
  );
}
