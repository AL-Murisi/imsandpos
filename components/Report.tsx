// components/ReportTemplate.tsx
"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function ReportTemplate({
  company,
  data,
}: {
  company: any;
  data: any[];
}) {
  return (
    <div className="p-6 font-sans">
      <header className="flex items-center gap-4 mb-6">
        {company.logoUrl && (
          <img src={company.logoUrl} alt="logo" className="h-12" />
        )}
        <div>
          <h1 className="text-xl font-bold">{company.name}</h1>
          <p>{company.address}</p>
        </div>
      </header>

      <h2 className="text-lg font-semibold mb-4">Sales Report</h2>

      {/* Chart */}
      <BarChart width={600} height={300} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="sales" fill="#3b82f6" />
      </BarChart>

      {/* Table */}
      <table className="w-full mt-6 border-collapse border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1">Product</th>
            <th className="border px-2 py-1">Qty</th>
            <th className="border px-2 py-1">Sales</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.name}>
              <td className="border px-2 py-1">{r.name}</td>
              <td className="border px-2 py-1">{r.qty}</td>
              <td className="border px-2 py-1">{r.sales}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
