"use client";

import React, { useState, useEffect, use, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DownloadIcon,
  FileTextIcon,
  TrendingUpIcon,
  PackageIcon,
  ShoppingCartIcon,
  DollarSignIcon,
  UsersIcon,
  AlertCircleIcon,
} from "lucide-react";
import { format } from "date-fns/format";
import { SelectField } from "@/components/common/selection";
import { Calendar22 } from "@/components/common/DatePicker";
import SearchInput from "@/components/common/searchlist";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Decimal } from "@prisma/client/runtime/library";

const reports = [
  // Sales
  {
    name: "تقرير المبيعات",
    id: "sales",
    type: "sales",
    icon: "📊",
    description: "تقرير شامل لجميع المبيعات",
  },
  {
    name: "تقرير المبيعات حسب المنتج",
    id: "sales-by-product",
    type: "sales",
    icon: "📦",
    description: "تحليل المبيعات حسب المنتج",
  },
  {
    name: "تقرير المبيعات حسب المستخدم",
    id: "sales-by-user",
    type: "sales",
    icon: "👤",
    description: "أداء الموظفين في المبيعات",
  },
  {
    name: "تقرير المبيعات اليومية",
    id: "daily-sales",
    type: "sales",
    icon: "📅",
    description: "مبيعات يومية مفصلة",
  },
  {
    name: "تقرير الأرباح حسب المنتج",
    id: "profit-by-product",
    type: "sales",
    icon: "💰",
    description: "ربحية كل منتج",
  },
  {
    name: "تقرير الربح والخسارة",
    id: "profit-loss",
    type: "sales",
    icon: "📈",
    description: "بيان الربح والخسارة",
  },

  // Inventory
  {
    name: "تقرير المخزون",
    id: "inventory",
    type: "inventory",
    icon: "📦",
    description: "حالة المخزون الحالية",
  },
  {
    name: "تقرير المنتجات قليلة المخزون",
    id: "low-stock",
    type: "inventory",
    icon: "⚠️",
    description: "منتجات تحتاج إعادة طلب",
  },
  {
    name: "تقرير حركة المخزون",
    id: "stock-movement",
    type: "inventory",
    icon: "🔄",
    description: "حركات الإدخال والإخراج",
  },
  {
    name: "تقرير المنتجات منتهية الصلاحية",
    id: "expiring-products",
    type: "inventory",
    icon: "⏰",
    description: "منتجات قريبة من انتهاء الصلاحية",
  },
  {
    name: "تقرير الجرد",
    id: "stock-take",
    type: "inventory",
    icon: "📋",
    description: "مطابقة المخزون الفعلي",
  },

  // Purchases
  {
    name: "تقرير المشتريات",
    id: "purchases",
    type: "purchases",
    icon: "🛒",
    description: "سجل المشتريات",
  },
  {
    name: "تقرير مرتجعات المشتريات",
    id: "purchase-returns",
    type: "purchases",
    icon: "↩️",
    description: "المرتجعات للموردين",
  },
  {
    name: "تقرير الموردين",
    id: "suppliers",
    type: "purchases",
    icon: "🏢",
    description: "قائمة الموردين ونشاطهم",
  },
  {
    name: "تقرير المبالغ المستحقة للموردين",
    id: "supplier-balance",
    type: "purchases",
    icon: "💳",
    description: "الذمم الدائنة",
  },

  // Payments
  {
    name: "تقرير المدفوعات",
    id: "payments",
    type: "payments",
    icon: "💵",
    description: "جميع المدفوعات",
  },
  {
    name: "تقرير المصروفات",
    id: "expenses",
    type: "payments",
    icon: "💸",
    description: "المصروفات التشغيلية",
  },
  // {
  //   name: "تقرير الصندوق",
  //   id: "cash-register",
  //   type: "payments",
  //   icon: "🏦",
  //   description: "حركة النقدية",
  // },
  // {
  //   name: "تقرير ضريبة المبيعات",
  //   id: "tax",
  //   type: "payments",
  //   icon: "🧾",
  //   description: "ضرائب المبيعات المحصلة",
  // },

  // Customers
  {
    name: "تقرير العملاء",
    id: "customers",
    type: "customers",
    icon: "👥",
    description: "قاعدة بيانات العملاء",
  },
  {
    name: "تقرير ديون العملاء",
    id: "customer-debts",
    type: "customers",
    icon: "📉",
    description: "الذمم المدينة",
  },
  {
    name: "        كشف حساب العملاء",
    id: "customer_statment",
    type: "customers",
    icon: "🧾",
    description: "    كشف حساب العملاء",
  },
  {
    name: "طباعة كافة فواتير العملاء",
    id: "customer-receipts",
    type: "customers",
    icon: "🧾",
    description: "عرض وطباعة جميع سندات وفواتير العملاء في صفحة واحدة",
  },
  {
    name: "تقرير المدفوعات من العملاء",
    id: "customer-payments",
    type: "customers",
    icon: "💰",
    description: "مدفوعات العملاء",
  },
];

const categories = [
  {
    name: "الكل",
    id: "all",
    icon: <FileTextIcon className="h-4 w-4" />,
    color: "bg-gray-500",
  },
  {
    name: "المبيعات",
    id: "sales",
    icon: <TrendingUpIcon className="h-4 w-4" />,
    color: "bg-green-500",
  },
  {
    name: "المخزون",
    id: "inventory",
    icon: <PackageIcon className="h-4 w-4" />,
    color: "bg-blue-500",
  },
  {
    name: "المشتريات",
    id: "purchases",
    icon: <ShoppingCartIcon className="h-4 w-4" />,
    color: "bg-purple-500",
  },
  {
    name: "المدفوعات",
    id: "payments",
    icon: <DollarSignIcon className="h-4 w-4" />,
    color: "bg-yellow-500",
  },
  {
    name: "العملاء",
    id: "customers",
    icon: <UsersIcon className="h-4 w-4" />,
    color: "bg-pink-500",
  },
];

export default function ReportsPage({
  users,
}: {
  users:
    | {
        id?: string;
        name?: string;
        phoneNumber?: string | null;
        totalDebt?: number;
      }[]
    | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [category, setCategory] = useState("all");
  const [selectedReport, setSelectedReport] = useState<
    (typeof reports)[0] | null
  >(null);
  const [fromDate, setFromDate] = useState<string>(
    searchParams.get("from") || "",
  );
  const [toDate, setToDate] = useState<string>(searchParams.get("to") || "");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [reportType, setReportType] = useState<string>(
    searchParams.get("reportType") || "",
  );

  const filteredReports =
    category === "all" ? reports : reports.filter((r) => r.type === category);

  useEffect(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("reportType");

    if (from) setFromDate(from);
    if (to) setToDate(to);
    if (type) {
      setReportType(type);
      const report = reports.find((r) => r.id === type);
      if (report) setSelectedReport(report);
    }
  }, [searchParams]);

  const handleDownload = useCallback(async () => {
    if (!reportType) {
      alert("الرجاء اختيار نوع التقرير");
      return;
    }

    setIsSubmitting(true);
    const endpoint = `/api/reports/${reportType}`;

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          customerId: selectedCustomer?.id,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        alert(`فشل تحميل التقرير: ${error.error || "خطأ غير معروف"}`);
        setIsSubmitting(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setIsSubmitting(false);
    } catch (err) {
      console.error(err);
      setIsSubmitting(false);
      alert("حدث خطأ أثناء تحميل التقرير");
    }
  }, [reportType, fromDate, toDate, selectedCustomer]);

  return (
    <div className="container mx-auto p-2">
      {/* Header */}
      {/* <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            📊 التقارير
          </h1>
          <p className="text-muted-foreground mt-1">
            قم بإنشاء وتحميل التقارير المالية والإدارية
          </p>
        </div>
      </div> */}
      {/* Category Filter */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {categories.map((cat) => (
          <Card
            key={cat.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              category === cat.id ? "ring-primary ring-2" : ""
            }`}
            onClick={() => {
              setCategory(cat.id);
              setReportType("");
              setSelectedReport(null);
            }}
          >
            <CardContent className="flex flex-col items-center space-y-2 p-4 text-center">
              <div className={`${cat.color} rounded-full p-3 text-white`}>
                {cat.icon}
              </div>
              <span className="text-sm font-medium">{cat.name}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Report Configuration */}
      <div className="px-2 py-2">
        {selectedReport && (
          <Card className="border-primary/50 px-2 py-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>{selectedReport.icon}</span>
                {selectedReport.name}
              </CardTitle>
              <CardDescription>{selectedReport.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Range */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    📅 الفترة الزمنية
                  </label>
                  <Calendar22 />
                </div>

                {/* Customer Filter for customer reports */}
                {(selectedReport.id === "customer_statment" ||
                  selectedReport.id === "customer-receipts") && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      👤 اختر عميل محدد (اختياري)
                    </label>
                    <SearchInput
                      placeholder="ابحث عن العميل"
                      paramKey="customer"
                      options={users ?? []}
                      action={(user) => setSelectedCustomer(user)}
                    />
                    {selectedCustomer && (
                      <Card className="bg-muted/50">
                        <CardContent className="space-y-1 p-3 text-sm">
                          <p className="flex items-center gap-2">
                            <strong>👤 العميل:</strong> {selectedCustomer.name}
                          </p>
                          <p className="flex items-center gap-2">
                            <strong>🆔 رقم العميل:</strong>{" "}
                            {selectedCustomer.value}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCustomer(null)}
                            className="mt-2"
                          >
                            إلغاء التحديد
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
              {/* Download Button */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  disabled={isSubmitting || !reportType}
                  onClick={handleDownload}
                  size="lg"
                  className="flex-1 md:flex-none"
                >
                  <DownloadIcon className="mr-2 h-4 w-4" />
                  {isSubmitting ? "جاري التحميل..." : "تحميل التقرير"}
                </Button>

                {!reportType && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    <AlertCircleIcon className="h-4 w-4" />
                    الرجاء اختيار تقرير أولاً
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      {/* Report Selection Grid */}{" "}
      <ScrollArea className="h-[96vh] p-2 px-2 py-2" dir="rtl">
        <Card>
          {" "}
          <CardHeader>
            <CardTitle>اختر التقرير</CardTitle>
            <CardDescription>
              {filteredReports.length} تقرير متاح في هذه الفئة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {filteredReports.map((report) => (
                <Card
                  key={report.id}
                  className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
                    reportType === report.id
                      ? "ring-primary bg-primary/5 ring-2"
                      : ""
                  }`}
                  onClick={() => {
                    setReportType(report.id);
                    setSelectedReport(report);
                    // Update URL
                    const params = new URLSearchParams(searchParams.toString());
                    params.set("reportType", report.id);
                    router.push(`?${params.toString()}`);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{report.icon}</span>
                      <div className="flex-1">
                        <h3 className="mb-1 font-semibold">{report.name}</h3>
                        <p className="text-muted-foreground text-xs">
                          {report.description}
                        </p>
                      </div>
                      {reportType === report.id && (
                        <Badge variant="default">محدد</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>{" "}
        {/* Quick Stats */}
      </ScrollArea>
      {!selectedReport && (
        <Card>
          <CardHeader>
            <CardTitle>نصائح سريعة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• استخدم الفترة الزمنية لتصفية البيانات حسب التاريخ</p>
            <p>• جميع التقارير يتم تصديرها بصيغة PDF</p>
            <p>• يمكنك طباعة التقارير مباشرة من ملف PDF</p>
            <p>• تقارير العملاء يمكن تصفيتها حسب عميل محدد</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
