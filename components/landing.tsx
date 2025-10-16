"use client";
import React, { useState, useEffect } from "react";
import {
  ArrowRight,
  ShoppingCart,
  Package,
  BarChart3,
  Wifi,
  WifiOff,
  Check,
  Menu,
  X,
  Zap,
  Shield,
  Clock,
  Database,
  Cloud,
  Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ModeToggle } from "./toggoletheme";
import { ScrollArea } from "@radix-ui/react-scroll-area";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  // useEffect to handle scroll change for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Component structure with Arabic content and RTL adjustments
  return (
    // Added dir="rtl" for right-to-left layout
    <div className="bg-background flex flex-col">
      {/* Navigation */}
      <nav
        className={`fixed z-50 w-full transition-all duration-300 ${scrolled ? "bg-[#0b142a] shadow-lg backdrop-blur-lg" : "bg-[#0b142a]"}`}
      >
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-2">
                <ShoppingCart className="text-white" size={24} />
              </div>
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-2xl font-bold text-transparent">
                Stocky {/* Arabic: سمارت بي أو إس برو */}
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden items-center space-x-8 space-x-reverse md:flex">
              <a
                href="#features"
                className="text-white transition hover:text-blue-600"
              >
                الميزات
              </a>
              <a
                href="#how-it-works"
                className="text-white transition hover:text-blue-600"
              >
                آلية العمل
              </a>
              <a
                href="#benefits"
                className="text-white transition hover:text-blue-600"
              >
                الفوائد
              </a>
              <a
                href="#pricing"
                className="text-white transition hover:text-blue-600"
              >
                التسعير
              </a>
              <button
                onClick={() => router.push("/login")}
                className="transform rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-white transition hover:scale-105 hover:shadow-lg"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => router.push("/login/signup")}
                className="transform rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-white transition hover:scale-105 hover:shadow-lg"
              >
                sign up
              </button>

              <ModeToggle />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="mt-4 space-y-4 pb-4 md:hidden">
              <a
                href="#features"
                className="block text-white hover:text-blue-600"
              >
                الميزات
              </a>
              <a
                href="#how-it-works"
                className="block text-white hover:text-blue-600"
              >
                آلية العمل
              </a>
              <a
                href="#benefits"
                className="text-whit blocke hover:text-blue-600"
              >
                الفوائد
              </a>
              <a
                href="#pricing"
                className="text-whit blocke hover:text-blue-600"
              >
                التسعير
              </a>
              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-white"
              >
                تسجيل الدخول
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 pt-32 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="space-y-8 text-right">
              <div className="inline-flex items-center space-x-2 space-x-reverse rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                <Wifi size={16} />
                <span>يعمل عبر الإنترنت وبدون اتصال</span>
              </div>

              <h1 className="text-5xl leading-tight font-bold text-gray-900 md:text-6xl">
                نظام نقاط بيع ذكي لا يتوقف عن العمل
              </h1>

              <p className="text-xl leading-relaxed text-gray-600">
                نظام نقاط البيع وإدارة المخزون المثالي. حافظ على سير عملك بسلاسة
                حتى عند انقطاع الإنترنت. مصمم لتجار التجزئة العصريين الذين
                يحتاجون إلى الموثوقية.
              </p>

              <div className="flex flex-col justify-start gap-4 sm:flex-row">
                <button
                  onClick={() => router.push("/login")}
                  className="group flex transform items-center justify-center space-x-2 space-x-reverse rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 font-semibold text-white transition hover:scale-105 hover:shadow-2xl"
                >
                  {/* Changed translate-x-1 to -translate-x-1 for RTL icon movement */}
                  <span className="order-2">عرض لوحة التحكم</span>
                  <ArrowRight
                    className="order-1 transition group-hover:-translate-x-1"
                    size={20}
                  />
                </button>

                <button className="rounded-xl border-2 border-gray-200 bg-white px-8 py-4 font-semibold text-gray-900 transition hover:border-blue-600 hover:shadow-lg">
                  مشاهدة العرض التوضيحي
                </button>
              </div>

              <div className="flex items-center space-x-8 space-x-reverse pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">99.9%</div>
                  <div className="text-sm text-gray-600">وقت التشغيل</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-600">منشأة تجارية</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900">24/7</div>
                  <div className="text-sm text-gray-600">دعم فني</div>
                </div>
              </div>
            </div>

            {/* Dashboard Mockup (Visual element, no translation change needed) */}
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400 to-indigo-400 opacity-20 blur-3xl"></div>
              <div className="relative rounded-2xl border border-gray-100 bg-white p-8 shadow-2xl">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-green-600">
                        النظام متصل
                      </span>
                    </div>
                    <div className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                      مُتزامن
                    </div>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-right text-white">
                    <div className="mb-2 text-sm opacity-90">مبيعات اليوم</div>
                    <div className="mb-4 text-4xl font-bold">$12,847</div>
                    <div className="flex items-center justify-end space-x-2 space-x-reverse text-sm">
                      <div className="rounded-lg bg-white/20 px-3 py-1">
                        ↑ 23%
                      </div>
                      <span className="opacity-90">مقارنة بالأمس</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-gray-50 p-4 text-center">
                      <ShoppingCart
                        className="mx-auto mb-2 text-blue-600"
                        size={24}
                      />
                      <div className="text-2xl font-bold text-gray-900">
                        143
                      </div>
                      <div className="text-xs text-gray-600">مبيعات</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 text-center">
                      <Package
                        className="mx-auto mb-2 text-indigo-600"
                        size={24}
                      />
                      <div className="text-2xl font-bold text-gray-900">
                        892
                      </div>
                      <div className="text-xs text-gray-600">منتج</div>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4 text-center">
                      <BarChart3
                        className="mx-auto mb-2 text-purple-600"
                        size={24}
                      />
                      <div className="text-2xl font-bold text-gray-900">
                        $89
                      </div>
                      <div className="text-xs text-gray-600">متوسط البيع</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-accent px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
              ميزات قوية لعملك
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600">
              كل ما تحتاجه لإدارة متجرك بكفاءة، كل ذلك في مكان واحد
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="group rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-right transition hover:shadow-xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 transition group-hover:scale-110">
                <WifiOff className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                العمل بدون اتصال بالإنترنت أولاً
              </h3>
              <p className="leading-relaxed text-gray-600">
                استمر في معالجة المبيعات حتى بدون الإنترنت. تتم مزامنة جميع
                البيانات تلقائيًا عند العودة للاتصال.
              </p>
            </div>

            <div className="group rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-8 text-right transition hover:shadow-xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 transition group-hover:scale-110">
                <Package className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                إدارة المخزون
              </h3>
              <p className="leading-relaxed text-gray-600">
                تتبع المخزون في الوقت الفعلي، تنبيهات انخفاض المخزون، وإعادة طلب
                تلقائية للحفاظ على رفوفك ممتلئة.
              </p>
            </div>

            <div className="group rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-right transition hover:shadow-xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-600 to-emerald-600 transition group-hover:scale-110">
                <BarChart3 className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                تحليلات ذكية
              </h3>
              <p className="leading-relaxed text-gray-600">
                تقارير مفصلة ورؤى لمساعدتك في اتخاذ قرارات تستند إلى البيانات
                لعملك.
              </p>
            </div>

            <div className="group rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-red-50 p-8 text-right transition hover:shadow-xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-600 to-red-600 transition group-hover:scale-110">
                <Zap className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                سرعة البرق
              </h3>
              <p className="leading-relaxed text-gray-600">
                مُحسَّن للسرعة مع بحث فوري عن المنتجات وعملية دفع سريعة.
              </p>
            </div>

            <div className="group rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50 p-8 text-right transition hover:shadow-xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600 transition group-hover:scale-110">
                <Shield className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                آمن وموثوق
              </h3>
              <p className="leading-relaxed text-gray-600">
                أمان بمستوى البنوك مع نسخ احتياطي تلقائي وتخزين مشفر للبيانات.
              </p>
            </div>

            <div className="group rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-purple-50 p-8 text-right transition hover:shadow-xl">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 transition group-hover:scale-110">
                <Smartphone className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900">
                متعدد الأجهزة
              </h3>
              <p className="leading-relaxed text-gray-600">
                يعمل بسلاسة على سطح المكتب، والتابلت، والجوال. أدر عملك من أي
                مكان.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
              آلية العمل
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600">
              إعداد بسيط، نتائج قوية. ابدأ في غضون دقائق.
            </p>
          </div>

          {/* RTL adjustment: space-x-reverse is implicitly handled by using flex/grid properties that support RTL or are direction-agnostic. */}
          <div className="grid gap-8 md:grid-cols-4">
            <div className="relative">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">
                  التسجيل
                </h3>
                <p className="text-gray-600">
                  أنشئ حسابك وقم بإعداد ملف متجرك في دقائق
                </p>
              </div>
              {/* Note: Directional line for flow is now right-to-left. Changed left-full to right-full and bg-gradient-to-r to bg-gradient-to-l */}
              <div className="absolute top-10 right-full hidden h-0.5 w-full bg-gradient-to-l from-blue-600 to-indigo-600 opacity-20 md:block"></div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-lg">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">
                  إضافة المنتجات
                </h3>
                <p className="text-gray-600">
                  استورد مخزونك أو أضف المنتجات يدويًا باستخدام مسح الباركود
                </p>
              </div>
              {/* Note: Directional line for flow is now right-to-left. Changed left-full to right-full and bg-gradient-to-r to bg-gradient-to-l */}
              <div className="absolute top-10 right-full hidden h-0.5 w-full bg-gradient-to-l from-indigo-600 to-purple-600 opacity-20 md:block"></div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">
                  بدء البيع
                </h3>
                <p className="text-gray-600">
                  قم بمعالجة المبيعات عبر الإنترنت أو دون اتصال مع عملية دفع
                  فائقة السرعة
                </p>
              </div>
              {/* Note: Directional line for flow is now right-to-left. Changed left-full to right-full and bg-gradient-to-r to bg-gradient-to-l */}
              <div className="absolute top-10 right-full hidden h-0.5 w-full bg-gradient-to-l from-purple-600 to-pink-600 opacity-20 md:block"></div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-600 to-red-600 shadow-lg">
                  <span className="text-3xl font-bold text-white">4</span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">
                  تنمية الأعمال
                </h3>
                <p className="text-gray-600">
                  استخدم التحليلات لتحسين العمليات وزيادة الإيرادات
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section
        id="benefits"
        className="bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-20 text-white"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              لماذا تختار SmartPOS Pro؟
            </h2>
            <p className="mx-auto max-w-2xl text-xl opacity-90">
              مُصمم خصيصًا لتجار التجزئة الذين لا يمكنهم تحمل وقت التوقف
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {[
              "لا تفقد أي عملية بيع بسبب مشاكل الإنترنت",
              "نسخ احتياطي سحابي تلقائي لجميع البيانات",
              "مزامنة المخزون في الوقت الفعلي",
              "إدارة مستودعات متعددة",
              "برامج ولاء العملاء",
              "تقارير مفصلة للمبيعات والأرباح",
              "التحكم في وصول المستخدمين على أساس الدور",
              "مسح الباركود ورمز الاستجابة السريعة (QR)",
              "تصميم متجاوب ومتوافق مع الجوال",
              "تحديثات مجانية وميزات جديدة",
              "دعم العملاء ذو الأولوية",
              "التكامل مع بوابات الدفع",
            ].map((benefit, index) => (
              <div
                key={index}
                className="flex items-center space-x-3 space-x-reverse rounded-xl bg-white/10 p-4 backdrop-blur-sm transition hover:bg-white/20"
              >
                <div className="rounded-lg bg-white/20 p-2">
                  <Check className="text-white" size={20} />
                </div>
                <span className="text-lg">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="bg-accent px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">
              تسعير بسيط وشفاف
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600">
              اختر الخطة التي تناسب احتياجات عملك
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {/* Starter Plan */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 text-right transition hover:border-blue-600">
              <h3 className="mb-2 text-2xl font-bold text-gray-900">المبتدئ</h3>
              <div className="mb-6 text-4xl font-bold text-gray-900">
                $29<span className="text-lg text-gray-600">/شهر</span>
              </div>
              <ul className="mb-8 space-y-4">
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check className="text-green-600" size={20} />
                  <span>موقع واحد</span>
                </li>
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check className="text-green-600" size={20} />
                  <span>حتى 500 منتج</span>
                </li>
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check className="text-green-600" size={20} />
                  <span>2 مستخدمين</span>
                </li>
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check className="text-green-600" size={20} />
                  <span>دعم عبر البريد الإلكتروني</span>
                </li>
              </ul>
              <button className="w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-900 transition hover:bg-gray-200">
                ابدأ الآن
              </button>
            </div>

            {/* Professional Plan (Most Popular) */}
            <div className="scale-105 transform rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-8 text-right text-white shadow-2xl">
              <div className="mb-4 inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-semibold text-white">
                الأكثر شيوعاً
              </div>
              <h3 className="mb-2 text-2xl font-bold">الاحترافي</h3>
              <div className="mb-6 text-4xl font-bold">
                $79<span className="text-lg opacity-90">/شهر</span>
              </div>
              <ul className="mb-8 space-y-4">
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check size={20} />
                  <span>3 مواقع</span>
                </li>
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check size={20} />
                  <span>منتجات غير محدودة</span>
                </li>
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check size={20} />
                  <span>10 مستخدمين</span>
                </li>
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check size={20} />
                  <span>دعم ذو أولوية</span>
                </li>
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check size={20} />
                  <span>تحليلات متقدمة</span>
                </li>
              </ul>
              <button className="w-full rounded-xl bg-white py-3 font-semibold text-blue-600 transition hover:shadow-lg">
                ابدأ الآن
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 text-right transition hover:border-indigo-600">
              <h3 className="mb-2 text-2xl font-bold text-gray-900">
                المؤسسات
              </h3>
              <div className="mb-6 text-4xl font-bold text-gray-900">
                حسب الطلب
              </div>
              <ul className="mb-8 space-y-4">
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check className="text-green-600" size={20} />
                  <span>مواقع غير محدودة</span>
                </li>
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check className="text-green-600" size={20} />
                  <span>منتجات غير محدودة</span>
                </li>
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check className="text-green-600" size={20} />
                  <span>مستخدمون غير محدودون</span>
                </li>
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check className="text-green-600" size={20} />
                  <span>دعم مخصص 24/7</span>
                </li>
                <li className="flex items-center space-x-2 space-x-reverse">
                  <Check className="text-green-600" size={20} />
                  <span>عمليات تكامل مخصصة</span>
                </li>
              </ul>
              <button className="w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-900 transition hover:bg-gray-200">
                اتصل بالمبيعات
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-slate-900 to-blue-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">
            هل أنت مستعد لتحويل عملك؟
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl opacity-90">
            انضم إلى مئات من تجار التجزئة الذين يثقون في SmartPOS Pro لدعم
            مبيعاتهم. ابدأ تجربتك المجانية لمدة 14 يومًا اليوم.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button className="flex transform items-center justify-center space-x-2 space-x-reverse rounded-xl bg-white px-8 py-4 font-semibold text-blue-600 transition hover:scale-105 hover:shadow-2xl">
              {/* Changed icon position for RTL */}
              <span className="order-2">ابدأ التجربة المجانية</span>
              <ArrowRight size={20} className="order-1" />
            </button>
            <button className="rounded-xl border-2 border-white bg-transparent px-8 py-4 font-semibold text-white transition hover:bg-white hover:text-blue-600">
              جدولة عرض توضيحي
            </button>
          </div>
          <p className="mt-6 text-sm opacity-75">
            لا يلزم وجود بطاقة ائتمان • تجربة مجانية لمدة 14 يومًا • إلغاء في أي
            وقت
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 px-6 py-12 text-gray-400">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-8 text-right md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center space-x-2 space-x-reverse">
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 p-2">
                  <ShoppingCart className="text-white" size={20} />
                </div>
                <span className="text-xl font-bold text-white">Stocky</span>
              </div>
              <p className="text-sm">
                نظام نقاط البيع وإدارة المخزون المثالي الذي يعمل بدون اتصال
                أولاً لتجار التجزئة العصريين.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">المنتج</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="transition hover:text-white">
                    الميزات
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-white">
                    التسعير
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-white">
                    العرض التوضيحي
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-white">
                    الوثائق
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">الشركة</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="transition hover:text-white">
                    من نحن
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-white">
                    المدونة
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-white">
                    الوظائف
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-white">
                    الاتصال
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-white">الدعم</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="transition hover:text-white">
                    مركز المساعدة
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-white">
                    المجتمع
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-white">
                    شروط الخدمة
                  </a>
                </li>
                <li>
                  <a href="#" className="transition hover:text-white">
                    سياسة الخصوصية
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2025 Stocky Pro. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
