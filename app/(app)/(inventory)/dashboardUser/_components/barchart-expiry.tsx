"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type WarehouseChartItem = {
  name: string;
  stock: number;
  available: number;
  healthy: number;
  low: number;
  out: number;
};

type WarehouseCardItem = {
  id: string;
  name: string;
  location: string;
  totalItems: number;
  totalStock: number;
  expiredItems: number;
  expiringSoonItems: number;
  lowItems: number;
  outItems: number;
  utilization: number;
  lastStockTake: string;
};

interface WarehouseStatusChartProps {
  data: WarehouseChartItem[];
  warehouses: WarehouseCardItem[];
}

function getBarColor(item: WarehouseChartItem) {
  if (item.out > 0) return "#dc2626";
  if (item.low > 0) return "#d97706";
  return "#0f766e";
}

function getUtilizationTone(utilization: number) {
  if (utilization >= 85) return "bg-emerald-500";
  if (utilization >= 55) return "bg-sky-500";
  if (utilization >= 30) return "bg-amber-500";
  return "bg-slate-400";
}

export default function WarehouseStatusChart({
  data,
  warehouses,
}: WarehouseStatusChartProps) {
  return (
    <div className="min-w-0 space-y-6">
      <Card className="min-w-0 border-0 bg-white/90 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-slate-900">
            توزيع المخزون على المخازن
          </CardTitle>
          <p className="text-sm text-slate-500">
            إجمالي الوحدات المتاحة في كل مخزن مع تلوين حسب درجة الاستعجال.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 16, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="name"
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
                  cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                  contentStyle={{
                    borderRadius: 16,
                    border: "1px solid #e2e8f0",
                    background: "#ffffff",
                  }}
                />
                <Bar dataKey="available" radius={[12, 12, 0, 0]}>
                  {data.map((entry) => (
                    <Cell key={entry.name} fill={getBarColor(entry)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        {warehouses.map((warehouse) => (
          <Card
            key={warehouse.id}
            className="min-w-0 border-0 bg-white/90 shadow-sm"
          >
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-slate-900">
                    {warehouse.name}
                  </h3>
                  <p className="break-words text-sm text-slate-500">
                    {warehouse.location}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  {warehouse.totalItems} صنف
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="text-slate-500">الوحدات</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {warehouse.totalStock}
                  </div>
                </div>
                <div className="rounded-2xl bg-rose-50 p-3">
                  <div className="text-rose-700">منتهي</div>
                  <div className="mt-1 text-lg font-semibold text-rose-900">
                    {warehouse.expiredItems}
                  </div>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3">
                  <div className="text-amber-700">قريب من الانتهاء</div>
                  <div className="mt-1 text-lg font-semibold text-amber-900">
                    {warehouse.expiringSoonItems}
                  </div>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-3">
                  <div className="text-emerald-700">مخزون منخفض</div>
                  <div className="mt-1 text-lg font-semibold text-emerald-900">
                    {warehouse.lowItems}
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-3 sm:col-span-2">
                  <div className="text-slate-500">الأصناف غير المتاحة</div>
                  <div className="mt-1 text-lg font-semibold text-slate-900">
                    {warehouse.outItems}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">نسبة استغلال السعة</span>
                  <span className="font-medium text-slate-700">
                    {warehouse.utilization}%
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      getUtilizationTone(warehouse.utilization),
                    )}
                    style={{ width: `${warehouse.utilization}%` }}
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">{warehouse.lastStockTake}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
