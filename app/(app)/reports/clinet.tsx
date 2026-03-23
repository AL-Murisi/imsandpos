"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  X,
} from "lucide-react";
import { format } from "date-fns/format";
import { SelectField } from "@/components/common/selection";
import { Calendar22 } from "@/components/common/DatePicker";
import SearchInput from "@/components/common/searchlist";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Decimal } from "@prisma/client/runtime/library";
import { UserOption } from "@/lib/actions/currnciesOptions";
import { useAuth } from "@/lib/context/AuthContext";

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
    type: "others",
    icon: "💰",
    description: "ربحية كل منتج",
  },
  {
    name: "تقرير الربح والخسارة",
    id: "profit-loss",
    type: "others",
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
    type: "inventory",
    icon: "🛒",
    description: "سجل المشتريات",
  },
  // {
  //   name: "تقرير مرتجعات المشتريات",
  //   id: "purchase-returns",
  //   type: "suppliers",
  //   icon: "↩️",
  //   description: "المرتجعات للموردين",
  // },
  {
    name: "تقرير الموردين",
    id: "suppliers",
    type: "suppliers",
    icon: "🏢",
    description: "قائمة الموردين ونشاطهم",
  },
  {
    name: "تقرير المبالغ المستحقة للموردين",
    id: "supplier-balance",
    type: "suppliers",
    icon: "💳",
    description: "الذمم الدائنة",
  },
  {
    name: "   كشف حساب الموردين",
    id: "supplier_statment",
    type: "suppliers",
    icon: "💳",
    description: "كشف حساب الموردين",
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
  // {
  //   name: "تقرير المدفوعات من العملاء",
  //   id: "customer-payments",
  //   type: "customers",
  //   icon: "💰",
  //   description: "مدفوعات العملاء",
  // },
  // {
  //   name: "  كشف حساب بنكي ",
  //   id: "bank-statment",
  //   type: "payments",
  //   icon: "💰",
  //   description: "كشف حساب بنكي",
  // },
  {
    name: "سندات الموردين ",
    id: "supplier-receipts",
    type: "suppliers",
    icon: "🧾",
    description: "كشف حساب بنكي",
  },

  {
    name: " كشف حساب  ",
    id: "accounts-statement",
    type: "others",
    icon: "🧾",
    description: "كشف حساب بنكي",
  },
  {
    name: "انشطه المستخدمين  ",
    id: "user-activities",
    type: "others",
    icon: "🧾",
    description: "كشف حساب بنكي",
  },
  // {
  //   name: " كشف حساب  ",
  //   id: "cash-statement",
  //   type: "others",
  //   icon: "🧾",
  //   description: "كشف حساب صناديق",
  // },
  // {
  //   name: " كشف حساب  ",
  //   id: "invontery-statement",
  //   type: "others",
  //   icon: "🧾",
  //   description: "كشف حساب مخزن",
  // },
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
    name: "المدفوعات",
    id: "payments",
    icon: <DollarSignIcon className="h-4 w-4" />,
    color: "bg-yellow-500",
  },
  {
    name: "الموردين",
    id: "suppliers",
    icon: <UsersIcon className="h-4 w-4" />,
    color: "bg-blue-500",
  },
  {
    name: "العملاء",
    id: "customers",
    icon: <UsersIcon className="h-4 w-4" />,
    color: "bg-pink-500",
  },
  {
    name: " تقارير اخرى ",
    id: "others",
    icon: <ShoppingCartIcon className="h-4 w-4" />,
    color: "bg-purple-500",
  },
];

const reportAccessByRole: Record<
  string,
  { ids?: string[]; types?: string[]; all?: boolean }
> = {
  admin: { all: true },
  accountant: {
    ids: ["payments", "expenses", "profit-loss", "accounts-statement"],
  },
  manager_wh: {
    types: ["inventory"],
    ids: ["purchases"],
  },
  cashier: {
    ids: [
      "sales",
      "sales-by-product",
      "sales-by-user",
      "daily-sales",
      "customer-receipts",
      "customer_statment",
    ],
  },
  supplier: {
    ids: ["supplier_statment", "supplier-balance", "supplier-receipts"],
  },
};

function getAllowedReportsForRoles(roles: string[]) {
  if (roles.includes("admin")) {
    return reports;
  }

  const allowedIds = new Set<string>();
  const allowedTypes = new Set<string>();

  for (const role of roles) {
    const access = reportAccessByRole[role];
    if (!access) continue;
    if (access.all) return reports;
    access.ids?.forEach((id) => allowedIds.add(id));
    access.types?.forEach((type) => allowedTypes.add(type));
  }

  return reports.filter(
    (report) => allowedIds.has(report.id) || allowedTypes.has(report.type),
  );
}

export default function ReportsPage({
  user: userOptions,
  users,
  banks,
  suppliers,
  accounts,
  warehouse,
  branch,
}: {
  user:
    | {
        id?: string;
        name?: string;
      }[]
    | undefined;
  branch:
    | {
        id?: string;
        name?: string;
      }[]
    | undefined;
  users:
    | {
        id?: string;
        name?: string;
        phoneNumber?: string | null;
        totalDebt?: number;
      }[]
    | null;
  suppliers:
    | {
        id?: string;
        name?: string;
      }[]
    | undefined;
  banks: any;
  accounts: any;
  warehouse:
    | {
        id?: string;
        name?: string;
      }[]
    | undefined;
}) {
  const { user: authUser } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [salesTypes, setSalesTypes] = useState<UserOption | null>(null);
  const [category, setCategory] = useState("all");
  const [selectedReport, setSelectedReport] = useState<
    (typeof reports)[0] | null
  >(null);
  const [fromDate, setFromDate] = useState<string>(
    searchParams.get("from") || "",
  );
  const [progress, setProgress] = useState(0);
  const [paymentTypes, setPaymentTypes] = useState<UserOption | null>(null);
  const [toDate, setToDate] = useState<string>(searchParams.get("to") || "");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<any>(null);
  const [selectedbank, setSelectedbanks] = useState<any>(null);
  const [reportType, setReportType] = useState<string>(
    searchParams.get("reportType") || "",
  );
  const [warehouses, setWarehouses] = useState<any>(null);
  const [branches, setBranch] = useState<any>(null);
  const [userr, setUser] = useState<any>(null);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const allowedReports = useMemo(
    () => getAllowedReportsForRoles(authUser?.roles ?? []),
    [authUser?.roles],
  );
  const allowedReportIds = useMemo(
    () => new Set(allowedReports.map((report) => report.id)),
    [allowedReports],
  );
  const allowedCategories = useMemo(() => {
    if ((authUser?.roles ?? []).includes("admin")) return categories;
    const allowedTypes = new Set(allowedReports.map((report) => report.type));
    return categories.filter(
      (cat) => cat.id === "all" || allowedTypes.has(cat.id),
    );
  }, [allowedReports, authUser?.roles]);

  const filteredReports =
    category === "all"
      ? allowedReports
      : allowedReports.filter((r) => r.type === category);

  useEffect(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("reportType");

    if (from) setFromDate(from);
    if (to) setToDate(to);
    if (type && allowedReportIds.has(type)) {
      setReportType(type);
      const report = allowedReports.find((r) => r?.id === type) ?? null;
      if (report) setSelectedReport(report);
    } else if (type) {
      setReportType("");
      setSelectedReport(null);
    }
  }, [allowedReportIds, allowedReports, searchParams]);
  useEffect(() => {
    if (!reportType) return;
    if (!allowedReportIds.has(reportType)) {
      setReportType("");
      setSelectedReport(null);
    }
  }, [allowedReportIds, reportType]);
  // const handleDownloadAll = async () => {
  //   setIsBulkSubmitting(true);
  //   setBulkProgress(0);

  //   try {
  //     // build tasks...
  //     const total = tasks.length || 1;
  //     let done = 0;

  //     for (const task of tasks) {
  //       await downloadReport(task.type, task.payload, task.filename);
  //       done += 1;
  //       setBulkProgress(Math.round((done / total) * 100));
  //     }
  //   } finally {
  //     setIsBulkSubmitting(false);
  //     setTimeout(() => setBulkProgress(0), 600);
  //   }
  // };

  const handleDownload = async () => {
    if (!reportType) return;

    setIsSubmitting(true);
    setProgress(10);

    const fakeInterval = setInterval(() => {
      setProgress((p) => (p < 90 ? p + 10 : p));
    }, 400);

    try {
      const res = await fetch(`/api/reports/${reportType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          customerId: selectedCustomer?.id,
          accountId: selectedbank?.id,
          id: selectedAccountId?.id,
          suppliersId: selectedSupplier?.id,
          salesTypes: salesTypes?.id,
          userId: userr?.id,
          warehouseId: warehouses?.id,
          paymentTypes: paymentTypes?.id,
          branchId: branches?.id,
        }),
      });
      console.log("Fetch response:", selectedAccountId?.id);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      setProgress(100);

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${reportType}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      setIsSubmitting(false);
      setSalesTypes(null);
      setPaymentTypes(null);
      setSelectedCustomer(null);
      setSelectedSupplier(null);
      setSelectedAccountId(null);
      setSelectedbanks(null);
      setWarehouses(null);
      setUser(null);
      setBranch(null);
    } catch (e) {
      alert("حدث خطأ أثناء تحميل التقرير");
    } finally {
      clearInterval(fakeInterval);
      setTimeout(() => {
        setIsSubmitting(false);
        setProgress(0);
      }, 600);
    }
  };

  const salesType = [
    { id: "SALE", name: "بيع" },
    { id: "RETURN_SALE", name: "مرتجع" },
  ];
  const purchasesSalesTypes = [
    { id: "PURCHASE", name: "شراء" },
    { id: "RETURN_PURCHASE", name: "مرتجع" },
  ];
  const paymentType = [
    { id: "PAYMENT", name: "مدفوعات" },
    { id: "RECEIPT", name: "مصروفات" },
  ];
  return (
    <div className="w-full p-2">
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
        {allowedCategories.map((cat) => (
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
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      👤 اختر فرع محدد (اختياري)
                    </label>{" "}
                    <div className="grid grid-cols-2 gap-1">
                      <SearchInput
                        placeholder="ابحث عن  فرع محدد"
                        paramKey="branch"
                        options={branch ?? []}
                        value={branches?.name || ""}
                        action={(bank) => setBranch(bank)}
                      />{" "}
                      {branches?.name && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setBranch(null)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            الغاء
                          </button>
                        </div>
                      )}
                    </div>{" "}
                  </div>
                </div>
                {selectedReport.id === "bank-statment" && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      👤 اختر بنك محدد (اختياري)
                    </label>{" "}
                    <div className="grid grid-cols-2 gap-1">
                      <SearchInput
                        placeholder="ابحث عن بنك"
                        paramKey="customer"
                        options={banks ?? []}
                        value={selectedbank?.name || ""}
                        action={(bank) => setSelectedbanks(bank)}
                      />{" "}
                      {selectedbank?.name && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setSalesTypes(null)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            الغاء
                          </button>
                        </div>
                      )}
                    </div>{" "}
                  </div>
                )}{" "}
                {selectedReport.id === "accounts-statement" && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      👤 اختر محدد (اختياري)
                    </label>{" "}
                    <div className="grid grid-cols-2 gap-1">
                      <SearchInput
                        placeholder="ابحث عن "
                        paramKey="account"
                        options={accounts ?? []}
                        value={selectedAccountId?.name || ""}
                        action={(acc) => {
                          setSelectedAccountId(acc);
                        }}
                      />
                      {}
                      {selectedAccountId?.name && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setSelectedAccountId(null)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            الغاء
                          </button>
                        </div>
                      )}{" "}
                    </div>
                  </div>
                )}{" "}
                {["daily-sales", "sales-by-user", "user-activities"].includes(
                  selectedReport.id,
                ) && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      👤 اختر مستخدم (اختياري)
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <SearchInput
                        placeholder="ابحث عن مستخدم"
                        paramKey="users"
                        options={userOptions ?? []}
                        value={userr?.name || ""}
                        action={(acc) => {
                          setUser(acc);
                        }}
                      />
                      {userr && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setUser(null)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            الغاء
                          </button>
                        </div>
                      )}{" "}
                    </div>
                  </div>
                )}
                {/* Customer Filter for customer reports */}
                {(selectedReport.id === "supplier_statment" ||
                  selectedReport.id === "supplier-receipts" ||
                  selectedReport.id === "purchases" ||
                  selectedReport.id === "payments") && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      👤 اختر مورد محدد (اختياري)
                    </label>
                    <SearchInput
                      placeholder="ابحث عن المورد"
                      paramKey="customer"
                      options={suppliers ?? []}
                      action={(user) => setSelectedSupplier(user)}
                    />
                    {selectedSupplier && (
                      <Card className="bg-muted/50">
                        <CardContent className="space-y-1 p-3 text-sm">
                          <p className="flex items-center gap-2">
                            <strong>👤 المورد:</strong> {selectedSupplier.name}
                          </p>
                          <p className="flex items-center gap-2">
                            <strong>🆔 رقم المورد:</strong>{" "}
                            {selectedSupplier.value}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setSelectedSupplier(null)}
                            className="mt-2"
                          >
                            إلغاء التحديد
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}{" "}
                {[
                  "sales",
                  "daily-sales",
                  "sales-by-user",
                  "purchases",
                ].includes(selectedReport.id) && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      اختر نوع البيع (اختياري)
                    </label>{" "}
                    <div className="grid grid-cols-2 gap-1">
                      <SearchInput
                        placeholder="ابحث  "
                        paramKey="Sales"
                        value={
                          selectedReport.id === "purchases"
                            ? (purchasesSalesTypes[0].name ?? "PURCHASE")
                            : (salesTypes?.name ?? "")
                        }
                        options={
                          selectedReport.id === "purchases"
                            ? (purchasesSalesTypes ?? [])
                            : (salesType ?? [])
                        }
                        action={(type) => setSalesTypes(type)}
                      />{" "}
                      {warehouses && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setSalesTypes(null)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            الغاء
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}{" "}
                {["payments"].includes(selectedReport.id) && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      اختر نوع سند (اختياري)
                    </label>{" "}
                    <div className="grid grid-cols-2 gap-1">
                      <SearchInput
                        placeholder="ابحث  "
                        paramKey="Sales"
                        value={paymentTypes?.name ?? ""}
                        options={paymentType ?? []}
                        action={(type) => setPaymentTypes(type)}
                      />{" "}
                      {warehouses && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setPaymentTypes(null)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            الغاء
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {[
                  " stock-take",
                  "low-stock",
                  "stock-movement",
                  "expiring-products",
                  "stock",
                  "purchases",
                  "inventory",
                ].includes(selectedReport.id) && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      المخزن (اختياري)
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <SearchInput
                        placeholder="ابحث  "
                        paramKey="warehouses"
                        value={warehouses?.name ?? ""}
                        options={warehouse ?? []}
                        action={(type) => setWarehouses(type)}
                      />

                      {warehouses && (
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => setWarehouses(null)}
                            className="text-sm text-red-500 hover:underline"
                          >
                            الغاء
                          </button>
                        </div>
                      )}
                    </div>{" "}
                  </div>
                )}
                {(selectedReport.id === "customer_statment" ||
                  selectedReport.id === "customer-receipts" ||
                  selectedReport.id === "payments") && (
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
                {isSubmitting && (
                  <div className="bg-muted mt-2 h-2 w-full overflow-hidden rounded">
                    <div
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

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
      <ScrollArea className="max-h-[74vh] p-2 px-2 py-2" dir="rtl">
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
              {filteredReports.map(
                (report) =>
                  report && (
                    <Card
                      key={report?.id}
                      className={`cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg ${
                        reportType === report.id
                          ? "ring-primary bg-primary/5 ring-2"
                          : ""
                      }`}
                      onClick={() => {
                        setReportType(report.id);
                        setSelectedReport(report);
                        // Update URL
                        const params = new URLSearchParams(
                          searchParams.toString(),
                        );
                        params.set("reportType", report.id);
                        router.push(`?${params.toString()}`);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <span className="text-3xl">{report.icon}</span>
                          <div className="flex-1">
                            <h3 className="mb-1 font-semibold">
                              {report.name}
                            </h3>
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
                  ),
              )}
            </div>
          </CardContent>
        </Card>{" "}
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
      </ScrollArea>
    </div>
  );
}
