// "use client";
// import { useEffect, useState } from "react";
// import DashboardContentClient from "./DashboardContent";

// export default function DashboardContentClientWrapper({ filters }) {
//   const [data, setData] = useState<any>(null);
//   const [loading, setLoading] = useState(true);

//  useEffect(() => {
//   const query = new URLSearchParams({
//     from: filters.salesFrom || filters.allFrom || "", // pick the right fallback
//     to: filters.salesTo || filters.allTo || "",
//     topItems: filters.topItems?.toString() || "10",
//   }).toString();

//   setLoading(true);

//   fetch(`/api/dashboard?${query}`)
//     .then((res) => res.json())
//     .then((json) => setData(json))
//     .catch((err) => console.error("Dashboard fetch error:", err))
//     .finally(() => setLoading(false));
// }, [filters]);

//   if (loading)
//     return <div className="p-4 text-center">جارٍ تحميل البيانات...</div>;
// //   if (!data)
//     return (
//       <div className="p-4 text-center text-red-500">
//         حدث خطأ أثناء تحميل البيانات
//       </div>
//     );

//   return (
//     <DashboardContentClient
//       result={{
//         topProducts: data.topProducts,
//         recentSales: [],
//         activityLogs: [],
//         revenue: data.salesOverview.map((d: any) => ({
//           date: d.date,
//           value: d.revenue,
//         })),
//         pagination: { page: 1, limit: 5, total: 0 },
//         sort: [],
//         formData: [],
//       }}
//       salesSummary={{
//         sales: {
//           total: data.summaryCards.revenue,
//           chart: data.salesOverview.map((d: any) => ({
//             date: d.date,
//             value: d.revenue,
//           })),
//         },
//         purchases: {
//           total: data.summaryCards.purchases,
//           chart: data.salesOverview.map((d: any) => ({
//             date: d.date,
//             value: d.purchases,
//           })),
//         },
//         revenue: {
//           total: data.summaryCards.revenue,
//           chart: data.salesOverview.map((d: any) => ({
//             date: d.date,
//             value: d.revenue,
//           })),
//         },
//         debt: {
//           unreceived: data.summaryCards.debt,
//           unreceivedChart: data.salesOverview.map((d: any) => ({
//             date: d.date,
//             value: d.debts,
//           })),
//           receivedChart: [],
//           received: 0,
//         },
//         //   netProfit: data.summaryCards.netProfit,
//         expenseBreakdown: data.expenseBreakdown,
//       }}
//     />
//   );
// }
