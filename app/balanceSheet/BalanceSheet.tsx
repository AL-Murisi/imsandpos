"use client";
import React, { useState } from "react";
import { ChevronDown, ChevronUp, Download, Calendar } from "lucide-react";
import { useFormatter } from "@/hooks/usePrice";
import { Calendar22 } from "@/components/common/DatePicker";

// Types
type Account = {
  name: string;
  balance: number;
};

type BalanceSheetData = {
  assets: Account[];
  liabilities: Account[];
  equity: Account[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  equation: boolean;
};

type BalanceSheetProps = {
  balanceSheetData: BalanceSheetData;
};

type SectionType = "assets" | "liabilities" | "equity";

type AccountSectionProps = {
  title: string;
  accounts: Account[];
  total: number;
  type: SectionType;
  isExpanded: boolean;
};

export default function BalanceSheet({ balanceSheetData }: BalanceSheetProps) {
  const [expandedSections, setExpandedSections] = useState<
    Record<SectionType, boolean>
  >({
    assets: true,
    liabilities: true,
    equity: true,
  });

  const { formatCurrency } = useFormatter();

  const toggleSection = (section: SectionType) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const AccountSection = ({
    title,
    accounts,
    total,
    type,
    isExpanded,
  }: AccountSectionProps) => (
    <div className="mb-6 overflow-hidden rounded-xl border-r-4 border-emerald-600 bg-white shadow-lg">
      <div
        className="flex cursor-pointer items-center justify-between bg-gradient-to-l from-emerald-700 to-emerald-800 p-5"
        onClick={() => toggleSection(type)}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronUp className="text-white" />
          ) : (
            <ChevronDown className="text-white" />
          )}
          <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <div className="text-xl font-bold text-white">
          {formatCurrency(total)}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6">
          {accounts.map((account: Account, idx: number) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded border-b border-gray-100 px-4 py-3 transition-colors hover:bg-emerald-50"
            >
              <span className="text-lg text-gray-700">{account.name}</span>
              <span className="text-lg font-semibold text-gray-900">
                {formatCurrency(account.balance)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-6"
      dir="rtl"
    >
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 rounded-2xl border-t-4 border-emerald-600 bg-white p-8 shadow-xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-4xl font-bold text-gray-800">
                الميزانية العمومية
              </h1>
              <p className="text-lg text-gray-600">Balance Sheet Report</p>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-white shadow-lg transition-colors hover:bg-emerald-700">
              <Download size={20} />
              تصدير
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4 text-gray-600">
            <Calendar22 />
          </div>
        </div>

        {/* Assets Section */}
        <AccountSection
          title="الأصول"
          accounts={balanceSheetData.assets}
          total={balanceSheetData.totalAssets}
          type="assets"
          isExpanded={expandedSections.assets}
        />

        {/* Liabilities Section */}
        <AccountSection
          title="الخصوم"
          accounts={balanceSheetData.liabilities}
          total={balanceSheetData.totalLiabilities}
          type="liabilities"
          isExpanded={expandedSections.liabilities}
        />

        {/* Equity Section */}
        <AccountSection
          title="حقوق الملكية"
          accounts={balanceSheetData.equity}
          total={balanceSheetData.totalEquity}
          type="equity"
          isExpanded={expandedSections.equity}
        />

        {/* Summary Section */}
        <div className="rounded-2xl bg-gradient-to-l from-emerald-800 to-emerald-900 p-8 text-white shadow-2xl">
          <h3 className="mb-6 border-b border-emerald-600 pb-4 text-2xl font-bold">
            الملخص
          </h3>

          <div className="space-y-4 text-lg">
            <div className="flex items-center justify-between">
              <span>إجمالي الأصول:</span>
              <span className="text-2xl font-bold">
                {formatCurrency(balanceSheetData.totalAssets)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>إجمالي الخصوم:</span>
              <span className="text-2xl font-bold">
                {formatCurrency(balanceSheetData.totalLiabilities)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span>إجمالي حقوق الملكية:</span>
              <span className="text-2xl font-bold">
                {formatCurrency(balanceSheetData.totalEquity)}
              </span>
            </div>

            <div className="mt-4 border-t-2 border-emerald-600 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xl">الخصوم + حقوق الملكية:</span>
                <span className="text-2xl font-bold">
                  {formatCurrency(
                    balanceSheetData.totalLiabilities +
                      balanceSheetData.totalEquity,
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Equation Check */}
          <div
            className={`mt-6 rounded-lg p-4 text-center ${
              balanceSheetData.equation
                ? "bg-opacity-30 bg-green-600"
                : "bg-opacity-30 bg-red-600"
            }`}
          >
            <span className="text-lg font-semibold">
              {balanceSheetData.equation
                ? "✓ الميزانية متوازنة"
                : "✗ الميزانية غير متوازنة"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-600">
          <p className="text-sm">
            تم إنشاء التقرير تلقائياً • Automatically Generated Report
          </p>
        </div>
      </div>
    </div>
  );
}
