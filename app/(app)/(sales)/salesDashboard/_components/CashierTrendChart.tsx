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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrendItem = {
  date: string;
  total: number;
};

export default function CashierTrendChart({ data }: { data: TrendItem[] }) {
  return (
    <Card className="min-w-0 border-0 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">
          اتجاه المبيعات خلال 7 أيام
        </CardTitle>
        <p className="text-sm text-slate-500">
          متابعة حركة التحصيل والمبيعات اليومية بشكل سريع.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("ar-EG", {
                    weekday: "short",
                  })
                }
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#475569", fontSize: 12 }}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [value.toLocaleString("en-US"), "المبيعات"]}
                labelFormatter={(value) =>
                  new Date(value).toLocaleDateString("ar-EG", {
                    day: "numeric",
                    month: "short",
                  })
                }
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  background: "#fff",
                }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#salesGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
