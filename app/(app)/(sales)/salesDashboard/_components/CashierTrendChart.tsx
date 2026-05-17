"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ───────── types ───────── */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrendItem = {
  date: string;
  total: number;
};

type CashierTrendChartProps = {
  data: TrendItem[];
};

/* ───────── constants ───────── */

const AR = "ar-EG";
const EN = "en-US";

const GRADIENT_STOPS = (
  <>
    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
  </>
);

const TOOLTIP_STYLE = {
  borderRadius: 16,
  border: "1px solid #e2e8f0",
  background: "#fff",
} as const;

const CHART_MARGIN = { top: 10, right: 12, left: 0, bottom: 0 } as const;

/* ───────── formatters ───────── */

const fmtCurrency = (v: number) => v.toLocaleString(EN);
const fmtShortDay = (d: string) =>
  new Date(d).toLocaleDateString(AR, { weekday: "short" });
const fmtTooltipLabel = (d: string) =>
  new Date(d).toLocaleDateString(AR, { day: "numeric", month: "short" });
const fmtTooltipValue = (v: number) => [fmtCurrency(v), "المبيعات"];

/* ───────── component ───────── */

export default function CashierTrendChart({ data }: CashierTrendChartProps) {
  return (
    <Card className="min-w-0 border-0 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">
          اتجاه المبيعات خلال 7 أيام
        </CardTitle>
        <p className="text-sm text-slate-500">
          متابعة حركة المبيعات اليومية بشكل سريع خلال آخر سبعة أيام.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={CHART_MARGIN}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  {GRADIENT_STOPS}
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
              />

              <XAxis
                dataKey="date"
                tickFormatter={fmtShortDay}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#475569", fontSize: 12 }}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#64748b", fontSize: 12 }}
              />

              <Tooltip
                formatter={fmtTooltipValue}
                labelFormatter={fmtTooltipLabel}
                contentStyle={TOOLTIP_STYLE}
              />

              <Area
                type="monotone"
                dataKey="total"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#salesGradient)"
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
