"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrendItem = {
  date: string;
  receipts: number;
  payments: number;
};

export default function AccountantTrendChart({ data }: { data: TrendItem[] }) {
  return (
    <Card className="min-w-0 border-0 bg-white/90 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900">
          حركة السندات خلال 7 أيام
        </CardTitle>
        <p className="text-sm text-slate-500">
          مقارنة سريعة بين سندات القبض وسندات الصرف.
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(value) =>
                  new Date(value).toLocaleDateString("ar-EG", { weekday: "short" })
                }
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#475569", fontSize: 12 }}
              />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip
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
              <Legend />
              <Bar dataKey="receipts" name="قبض" fill="#16a34a" radius={[10, 10, 0, 0]} />
              <Bar dataKey="payments" name="صرف" fill="#dc2626" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
