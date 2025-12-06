// ✅ فصل البيانات الثابتة لتقليل حجم المكون الرئيسي

import {
  FileTextIcon,
  TrendingUpIcon,
  PackageIcon,
  ShoppingCartIcon,
  DollarSignIcon,
  UsersIcon,
} from "lucide-react";

export const REPORTS_DATA = [
  // ===== Sales Reports =====
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

  // ===== Inventory Reports =====
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

  // ===== Purchases Reports =====
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

  // ===== Payments Reports =====
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

  // ===== Customers Reports =====
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
    name: "تقرير المدفوعات من العملاء",
    id: "customer-payments",
    type: "customers",
    icon: "💰",
    description: "مدفوعات العملاء",
  },
] as const;

export const CATEGORIES = [
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
] as const;

export const QUICK_TIPS = [
  "استخدم الفترة الزمنية لتصفية البيانات حسب التاريخ",
  "جميع التقارير يتم تصديرها بصيغة PDF",
  "يمكنك طباعة التقارير مباشرة من ملف PDF",
  "تقارير العملاء يمكن تصفيتها حسب عميل محدد",
] as const;
