"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { useFormatter } from "@/hooks/usePrice";
import { Calendar22 } from "@/components/common/DatePicker";
import { ScrollArea } from "@/components/ui/scroll-area";

type Account = {
  name_ar: string;
  name_en: string;
  balance: number;
};

type BalanceSheetData = {
  assets: Account[];
  liabilities: Account[];
  equity: Account[];
  totals: {
    assets: number;
    liabilities: number;
    equity: number;
    liabilitiesPlusEquity: number;
  };
};

type Props = {
  balanceSheetData: BalanceSheetData;
};

type SectionType = "assets" | "liabilities" | "equity";

export default function BalanceSheet({ balanceSheetData }: Props) {
  const { formatCurrency } = useFormatter();

  const [expanded, setExpanded] = useState<Record<SectionType, boolean>>({
    assets: true,
    liabilities: true,
    equity: true,
  });

  const toggle = (section: SectionType) =>
    setExpanded((p) => ({ ...p, [section]: !p[section] }));

  const Section = ({
    title,
    type,
    accounts,
    total,
  }: {
    title: string;
    type: SectionType;
    accounts: Account[];
    total: number;
  }) => (
    <div className="bg-accent mb-6 overflow-hidden rounded-xl border-r-4 border-emerald-600 shadow-lg">
      <div
        onClick={() => toggle(type)}
        className="flex cursor-pointer items-center justify-between bg-gradient-to-l from-emerald-700 to-emerald-800 p-5"
      >
        <div className="flex items-center gap-3">
          {expanded[type] ? (
            <ChevronUp className="" />
          ) : (
            <ChevronDown className="" />
          )}
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <div className="text-xl font-bold">{formatCurrency(total)}</div>
      </div>

      {expanded[type] && (
        <div className="p-6">
          {accounts.map((a, i) => (
            <div key={i} className="flex justify-between border-b px-4 py-3">
              <span className="">{a.name_ar || a.name_en}</span>
              <span className="font-semibold">{formatCurrency(a.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const balanced =
    Math.round(balanceSheetData.totals.assets) ===
    Math.round(balanceSheetData.totals.liabilitiesPlusEquity);

  return (
    <ScrollArea className="h-[94vh] p-3">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="rounded-2xl border-t-4 border-emerald-600 p-8 shadow-xl">
          <div className="flex justify-between">
            <div>
              <h1 className="text-4xl font-bold">الميزانية العمومية</h1>
              <p className="text-gray-600">Balance Sheet</p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-4">
              <Calendar22 />
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 hover:bg-emerald-700">
              <Download size={18} />
              تصدير
            </button>
          </div>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <Section
            title="الأصول"
            type="assets"
            accounts={balanceSheetData.assets}
            total={balanceSheetData.totals.assets}
          />

          <Section
            title="الخصوم"
            type="liabilities"
            accounts={balanceSheetData.liabilities}
            total={balanceSheetData.totals.liabilities}
          />

          <Section
            title="حقوق الملكية"
            type="equity"
            accounts={balanceSheetData.equity}
            total={balanceSheetData.totals.equity}
          />
        </div>
        {/* Summary */}
        <div className="rounded-2xl bg-emerald-900 p-8 shadow-2xl">
          <h3 className="border-b pb-4 text-2xl font-bold">الملخص</h3>

          <Row label="إجمالي الأصول" value={balanceSheetData.totals.assets} />
          <Row
            label="إجمالي الخصوم"
            value={balanceSheetData.totals.liabilities}
          />
          <Row
            label="إجمالي حقوق الملكية"
            value={balanceSheetData.totals.equity}
          />

          <div className="mt-4 border-t pt-4">
            <Row
              label="الخصوم + حقوق الملكية"
              value={balanceSheetData.totals.liabilitiesPlusEquity}
            />
          </div>

          <div
            className={`mt-6 rounded-lg p-4 text-center ${
              balanced ? "bg-green-600/30" : "bg-red-600/30"
            }`}
          >
            {balanced ? "✓ الميزانية متوازنة" : "✗ الميزانية غير متوازنة"}
          </div>
        </div>{" "}
      </div>
    </ScrollArea>
  );

  function Row({ label, value }: { label: string; value: number }) {
    return (
      <div className="flex justify-between text-lg">
        <span>{label}</span>
        <span className="font-bold">{formatCurrency(value)}</span>
      </div>
    );
  }
}
