// "use client";

// import React, { useState, useEffect } from "react";
// import { useSearchParams } from "next/navigation";
// import { Button } from "@/components/ui/button";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Input } from "@/components/ui/input";
// import { DownloadIcon } from "lucide-react";
// import { format } from "date-fns/format";
// import { SelectField } from "@/components/common/selection";
// import { Calendar22 } from "@/components/common/DatePicker";
// import SearchInput from "@/components/common/searchlist";
// const reports = [
//   // Sales
//   { name: "تقرير المبيعات", id: "sales", type: "sales" },
//   { name: "تقرير المبيعات حسب المنتج", id: "sales-by-product", type: "sales" },
//   { name: "تقرير المبيعات حسب المستخدم", id: "sales-by-user", type: "sales" },
//   { name: "تقرير المبيعات اليومية", id: "daily-sales", type: "sales" },
//   { name: "تقرير الأرباح حسب المنتج", id: "profit-by-product", type: "sales" },
//   { name: "تقرير الربح والخسارة", id: "profit-loss", type: "sales" },

//   // Inventory
//   { name: "تقرير المخزون", id: "inventory", type: "inventory" },
//   { name: "تقرير المنتجات قليلة المخزون", id: "low-stock", type: "inventory" },
//   { name: "تقرير حركة المخزون", id: "stock-movement", type: "inventory" },
//   {
//     name: "تقرير المنتجات منتهية الصلاحية",
//     id: "expiring-products",
//     type: "inventory",
//   },
//   { name: "تقرير الجرد", id: "stock-take", type: "inventory" },

//   // Purchases
//   { name: "تقرير المشتريات", id: "purchases", type: "purchases" },
//   {
//     name: "تقرير مرتجعات المشتريات",
//     id: "purchase-returns",
//     type: "purchases",
//   },
//   { name: "تقرير الموردين", id: "suppliers", type: "purchases" },
//   {
//     name: "تقرير المبالغ المستحقة للموردين",
//     id: "supplier-balance",
//     type: "purchases",
//   },

//   // Payments
//   { name: "تقرير المدفوعات", id: "payments", type: "payments" },
//   { name: "تقرير المصروفات", id: "expenses", type: "payments" },
//   { name: "تقرير الصندوق", id: "cash-register", type: "payments" },
//   { name: "تقرير ضريبة المبيعات", id: "tax", type: "payments" },

//   // Customers
//   { name: "تقرير العملاء", id: "customers", type: "customers" },
//   { name: "تقرير ديون العملاء", id: "customer-debts", type: "customers" },
//   {
//     name: "تقرير المدفوعات من العملاء",
//     id: "customer-payments",
//     type: "customers",
//   },
// ];
// const categories = [
//   { name: "الكل", id: "all" },
//   { name: "المبيعات", id: "sales" },
//   { name: "المخزون", id: "inventory" },
//   { name: "المشتريات", id: "purchases" },
//   { name: "المدفوعات", id: "payments" },
//   { name: "العملاء", id: "customers" },
// ];
// export default function ReportsPage() {
//   const searchParams = useSearchParams();
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [category, setCategory] = useState("");

//   const [fromDate, setFromDate] = useState<string>(
//     searchParams.get("from") || "",
//   );
//   const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

//   const [toDate, setToDate] = useState<string>(searchParams.get("to") || "");
//   const [reportType, setReportType] = useState<string>(
//     searchParams.get("reportType") || "",
//   );
//   const filteredReports = reports.filter(
//     (r) => r.type === category || r.type === "all",
//   );

//   // Update state if URL params change
//   useEffect(() => {
//     const from = searchParams.get("from");
//     const to = searchParams.get("to");
//     const type = searchParams.get("reportType");

//     if (from) setFromDate(from);
//     if (to) setToDate(to);
//     if (type) setReportType(type);
//   }, [searchParams]);

//   const handleDownload = async () => {
//     if (!reportType) return alert("الرجاء اختيار نوع التقرير");
//     setIsSubmitting(true);
//     const endpoint = `/api/reports/${reportType}`;

//     try {
//       const res = await fetch(endpoint, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           fromDate,
//           toDate,
//         }),
//       });

//       if (!res.ok) {
//         alert("فشل تحميل التقرير");
//         setIsSubmitting(false);
//         return;
//       }

//       const blob = await res.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = `${reportType}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
//       a.click();

//       window.URL.revokeObjectURL(url);
//       setIsSubmitting(false);
//     } catch (err) {
//       console.error(err);
//       setIsSubmitting(false);
//       alert("حدث خطأ أثناء تحميل التقرير");
//     }
//   };

//   return (
//     <div className="mx-auto max-w-4xl p-4">
//       <h1 className="mb-6 text-2xl font-bold">📊 التقارير</h1>

//       <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
//         {/* Report Type */}{" "}
//         <Select
//           value={category}
//           onValueChange={(val) => {
//             setCategory(val);
//             setReportType(""); // reset report
//           }}
//         >
//           <SelectTrigger className="w-full">
//             <SelectValue placeholder={"اختر الفئة"} />
//           </SelectTrigger>

//           <SelectContent>
//             {categories.map((cat) => (
//               <SelectItem key={cat.id} value={cat.id}>
//                 {cat.name}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>
//         <div className="grid gap-3">
//           <SelectField
//             placeholder="اختر التقرير"
//             options={filteredReports}
//             paramKey={"reportType"}
//           />
//         </div>
//         {/* <Select value={reportType} onValueChange={setReportType}>
//             <SelectTrigger>
//               <SelectValue placeholder="اختر التقرير" />
//             </SelectTrigger>
//             <SelectContent>
//               {reports.map((r) => (
//                 <SelectItem key={r.value} value={r.value}>
//                   {r.name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select> */}
//         <div>
//           {" "}
//           <Calendar22 />
//         </div>
//         {/* From Date */}
//       </div>
//       {/* Customer Filter when report requires customer */}
//       {reportType.includes("customers") && (
//         <div className="mt-4 space-y-2">
//           <label className="text-sm font-medium">🔍 ابحث عن عميل</label>

//           <SearchInput
//             placeholder="ابحث عن العميل"
//             paramKey="customer"
//             options={[]}
//             action={(user) => {
//               setSelectedCustomer(user);
//             }}
//           />

//           {selectedCustomer && (
//             <div className="bg-muted rounded-md p-3 text-sm">
//               <p>
//                 👤 <b>العميل:</b> {selectedCustomer.label}
//               </p>
//               <p>
//                 🆔 <b>رقم العميل:</b> {selectedCustomer.value}
//               </p>
//             </div>
//           )}
//         </div>
//       )}

//       <Button
//         disabled={isSubmitting}
//         onClick={handleDownload}
//         className="flex items-center gap-2"
//       >
//         <DownloadIcon className="h-4 w-4" />
//         {isSubmitting ? "تنزيل..." : "تحميل التقرير"}
//       </Button>
//     </div>
//   );
// }

import { ScrollArea } from "@/components/ui/scroll-area";
import ReportsPage from "./clinet";

export default function page() {
  return <ReportsPage />;
}
