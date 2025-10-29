"use client";
import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
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

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-background flex flex-col" dir="rtl">
      {/* Navigation */}
      <nav
        className={`fixed z-50 w-full transition-all duration-300 ${scrolled ? "bg-[#0f172a]/95 shadow-lg backdrop-blur-lg" : "bg-[#0f172a]"}`}
      >
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2 shadow-lg">
                <ShoppingCart className="text-white" size={24} />
              </div>
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-2xl font-bold text-transparent">
                ستوكي
              </span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden items-center gap-8 md:flex">
              <a
                href="#features"
                className="text-gray-200 transition hover:text-blue-400"
              >
                الميزات
              </a>
              <a
                href="#how-it-works"
                className="text-gray-200 transition hover:text-blue-400"
              >
                آلية العمل
              </a>
              <a
                href="#benefits"
                className="text-gray-200 transition hover:text-blue-400"
              >
                الفوائد
              </a>
              <a
                href="#pricing"
                className="text-gray-200 transition hover:text-blue-400"
              >
                التسعير
              </a>
              <button
                onClick={() => router.push("/login")}
                className="transform rounded-lg border-2 border-blue-500 px-6 py-2 text-blue-400 transition hover:scale-105 hover:bg-blue-500 hover:text-white"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="transform rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2 text-white shadow-lg transition hover:scale-105 hover:shadow-xl"
              >
                إنشاء حساب
              </button>
              <ModeToggle />
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white md:hidden"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="mt-4 space-y-4 pb-4 md:hidden">
              <a
                href="#features"
                className="block text-gray-200 hover:text-blue-400"
              >
                الميزات
              </a>
              <a
                href="#how-it-works"
                className="block text-gray-200 hover:text-blue-400"
              >
                آلية العمل
              </a>
              <a
                href="#benefits"
                className="block text-gray-200 hover:text-blue-400"
              >
                الفوائد
              </a>
              <a
                href="#pricing"
                className="block text-gray-200 hover:text-blue-400"
              >
                التسعير
              </a>
              <button
                onClick={() => router.push("/login")}
                className="w-full rounded-lg border-2 border-blue-500 px-6 py-2 text-blue-400"
              >
                تسجيل الدخول
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2 text-white"
              >
                إنشاء حساب
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-6 pt-32 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="space-y-8 text-right">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-300 backdrop-blur-sm">
                <Wifi size={16} />
                <span>يعمل عبر الإنترنت وبدون اتصال</span>
              </div>

              <h1 className="text-5xl leading-tight font-bold text-white md:text-6xl">
                نظام نقاط بيع ذكي لا يتوقف عن العمل
              </h1>

              <p className="text-xl leading-relaxed text-gray-300">
                نظام نقاط البيع وإدارة المخزون المثالي. حافظ على سير عملك بسلاسة
                حتى عند انقطاع الإنترنت. مصمم لتجار التجزئة العصريين الذين
                يحتاجون إلى الموثوقية.
              </p>

              <div className="flex flex-col justify-start gap-4 sm:flex-row">
                <button
                  onClick={() => router.push("/login")}
                  className="group flex transform items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-4 font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-2xl"
                >
                  <span>عرض لوحة التحكم</span>
                  <ArrowLeft
                    className="transition group-hover:translate-x-1"
                    size={20}
                  />
                </button>

                <button className="rounded-xl border-2 border-gray-300 bg-white/10 px-8 py-4 font-semibold text-white backdrop-blur-sm transition hover:border-blue-400 hover:bg-white/20">
                  مشاهدة العرض التوضيحي
                </button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">99.9%</div>
                  <div className="text-sm text-gray-400">وقت التشغيل</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">500+</div>
                  <div className="text-sm text-gray-400">منشأة تجارية</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">24/7</div>
                  <div className="text-sm text-gray-400">دعم فني</div>
                </div>
              </div>
            </div>

            {/* Dashboard Mockup */}
            <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400 to-indigo-400 opacity-20 blur-3xl"></div>
              <div className="relative rounded-2xl border border-gray-700 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-sm">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium text-green-400">
                        النظام متصل
                      </span>
                    </div>
                    <div className="rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400">
                      مُتزامن
                    </div>
                  </div>

                  <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-6 text-right text-white shadow-xl">
                    <div className="mb-2 text-sm opacity-90">مبيعات اليوم</div>
                    <div className="mb-4 text-4xl font-bold">12,847 ر.س</div>
                    <div className="flex items-center justify-end gap-2 text-sm">
                      <div className="rounded-lg bg-white/20 px-3 py-1 backdrop-blur-sm">
                        ↑ 23%
                      </div>
                      <span className="opacity-90">مقارنة بالأمس</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg bg-slate-700/50 p-4 text-center backdrop-blur-sm">
                      <ShoppingCart
                        className="mx-auto mb-2 text-blue-400"
                        size={24}
                      />
                      <div className="text-2xl font-bold text-white">143</div>
                      <div className="text-xs text-gray-400">مبيعات</div>
                    </div>
                    <div className="rounded-lg bg-slate-700/50 p-4 text-center backdrop-blur-sm">
                      <Package
                        className="mx-auto mb-2 text-indigo-400"
                        size={24}
                      />
                      <div className="text-2xl font-bold text-white">892</div>
                      <div className="text-xs text-gray-400">منتج</div>
                    </div>
                    <div className="rounded-lg bg-slate-700/50 p-4 text-center backdrop-blur-sm">
                      <BarChart3
                        className="mx-auto mb-2 text-purple-400"
                        size={24}
                      />
                      <div className="text-2xl font-bold text-white">
                        89 ر.س
                      </div>
                      <div className="text-xs text-gray-400">متوسط البيع</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="bg-slate-50 px-6 py-20 dark:bg-slate-900"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
              ميزات قوية لعملك
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
              كل ما تحتاجه لإدارة متجرك بكفاءة، كل ذلك في مكان واحد
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="group rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-right transition hover:shadow-xl dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg transition group-hover:scale-110">
                <WifiOff className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                العمل بدون اتصال بالإنترنت أولاً
              </h3>
              <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                استمر في معالجة المبيعات حتى بدون الإنترنت. تتم مزامنة جميع
                البيانات تلقائيًا عند العودة للاتصال.
              </p>
            </div>

            <div className="group rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-8 text-right transition hover:shadow-xl dark:border-purple-800 dark:from-purple-950 dark:to-pink-950">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg transition group-hover:scale-110">
                <Package className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                إدارة المخزون
              </h3>
              <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                تتبع المخزون في الوقت الفعلي، تنبيهات انخفاض المخزون، وإعادة طلب
                تلقائية للحفاظ على رفوفك ممتلئة.
              </p>
            </div>

            <div className="group rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-right transition hover:shadow-xl dark:border-green-800 dark:from-green-950 dark:to-emerald-950">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg transition group-hover:scale-110">
                <BarChart3 className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                تحليلات ذكية
              </h3>
              <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                تقارير مفصلة ورؤى لمساعدتك في اتخاذ قرارات تستند إلى البيانات
                لعملك.
              </p>
            </div>

            <div className="group rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 p-8 text-right transition hover:shadow-xl dark:border-orange-800 dark:from-orange-950 dark:to-red-950">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-red-600 shadow-lg transition group-hover:scale-110">
                <Zap className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                سرعة البرق
              </h3>
              <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                مُحسَّن للسرعة مع بحث فوري عن المنتجات وعملية دفع سريعة.
              </p>
            </div>

            <div className="group rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-8 text-right transition hover:shadow-xl dark:border-cyan-800 dark:from-cyan-950 dark:to-blue-950">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg transition group-hover:scale-110">
                <Shield className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                آمن وموثوق
              </h3>
              <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                أمان بمستوى البنوك مع نسخ احتياطي تلقائي وتخزين مشفر للبيانات.
              </p>
            </div>

            <div className="group rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-purple-50 p-8 text-right transition hover:shadow-xl dark:border-violet-800 dark:from-violet-950 dark:to-purple-950">
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg transition group-hover:scale-110">
                <Smartphone className="text-white" size={28} />
              </div>
              <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                متعدد الأجهزة
              </h3>
              <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                يعمل بسلاسة على سطح المكتب، والتابلت، والجوال. أدر عملك من أي
                مكان.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="bg-white px-6 py-20 dark:bg-slate-800"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
              آلية العمل
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
              إعداد بسيط، نتائج قوية. ابدأ في غضون دقائق.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            <div className="relative">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                  <span className="text-3xl font-bold text-white">1</span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                  التسجيل
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  أنشئ حسابك وقم بإعداد ملف متجرك في دقائق
                </p>
              </div>
              <div className="absolute top-10 left-full hidden h-0.5 w-full bg-gradient-to-l from-blue-500 to-indigo-600 opacity-20 md:block"></div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                  <span className="text-3xl font-bold text-white">2</span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                  إضافة المنتجات
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  استورد مخزونك أو أضف المنتجات يدويًا باستخدام مسح الباركود
                </p>
              </div>
              <div className="absolute top-10 left-full hidden h-0.5 w-full bg-gradient-to-l from-indigo-500 to-purple-600 opacity-20 md:block"></div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg">
                  <span className="text-3xl font-bold text-white">3</span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                  بدء البيع
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  قم بمعالجة المبيعات عبر الإنترنت أو دون اتصال مع عملية دفع
                  فائقة السرعة
                </p>
              </div>
              <div className="absolute top-10 left-full hidden h-0.5 w-full bg-gradient-to-l from-purple-500 to-pink-600 opacity-20 md:block"></div>
            </div>

            <div className="relative">
              <div className="text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-red-600 shadow-lg">
                  <span className="text-3xl font-bold text-white">4</span>
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900 dark:text-white">
                  تنمية الأعمال
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
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
        className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-6 py-20 text-white"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold md:text-5xl">
              لماذا تختار ستوكي؟
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
                className="flex items-center gap-3 rounded-xl bg-white/10 p-4 backdrop-blur-sm transition hover:bg-white/20"
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
      <section
        id="pricing"
        className="bg-slate-50 px-6 py-20 dark:bg-slate-900"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
              تسعير بسيط وشفاف
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
              اختر الخطة التي تناسب احتياجات عملك
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            {/* Starter Plan */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 text-right transition hover:border-blue-500 hover:shadow-xl dark:border-gray-700 dark:bg-slate-800">
              <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                المبتدئ
              </h3>
              <div className="mb-6 text-4xl font-bold text-gray-900 dark:text-white">
                29 ر.س
                <span className="text-lg text-gray-600 dark:text-gray-400">
                  /شهر
                </span>
              </div>
              <ul className="mb-8 space-y-4">
                <li className="flex items-center gap-2">
                  <Check
                    className="text-green-600 dark:text-green-400"
                    size={20}
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    موقع واحد
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check
                    className="text-green-600 dark:text-green-400"
                    size={20}
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    حتى 500 منتج
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check
                    className="text-green-600 dark:text-green-400"
                    size={20}
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    2 مستخدمين
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check
                    className="text-green-600 dark:text-green-400"
                    size={20}
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    دعم عبر البريد الإلكتروني
                  </span>
                </li>
              </ul>
              <button className="w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-900 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
                ابدأ الآن
              </button>
            </div>

            {/* Professional Plan (Most Popular) */}
            <div className="scale-105 transform rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-8 text-right text-white shadow-2xl">
              <div className="mb-4 inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur-sm">
                الأكثر شيوعاً
              </div>
              <h3 className="mb-2 text-2xl font-bold">الاحترافي</h3>
              <div className="mb-6 text-4xl font-bold">
                79 ر.س<span className="text-lg opacity-90">/شهر</span>
              </div>
              <ul className="mb-8 space-y-4">
                <li className="flex items-center gap-2">
                  <Check size={20} />
                  <span>3 مواقع</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} />
                  <span>منتجات غير محدودة</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} />
                  <span>10 مستخدمين</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} />
                  <span>دعم ذو أولوية</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={20} />
                  <span>تحليلات متقدمة</span>
                </li>
              </ul>
              <button className="w-full rounded-xl bg-white py-3 font-semibold text-blue-600 transition hover:shadow-lg">
                ابدأ الآن
              </button>
            </div>

            {/* Enterprise Plan */}
            <div className="rounded-2xl border-2 border-gray-200 bg-white p-8 text-right transition hover:border-indigo-500 hover:shadow-xl dark:border-gray-700 dark:bg-slate-800">
              <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                المؤسسات
              </h3>
              <div className="mb-6 text-4xl font-bold text-gray-900 dark:text-white">
                حسب الطلب
              </div>
              <ul className="mb-8 space-y-4">
                <li className="flex items-center gap-2">
                  <Check
                    className="text-green-600 dark:text-green-400"
                    size={20}
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    مواقع غير محدودة
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check
                    className="text-green-600 dark:text-green-400"
                    size={20}
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    منتجات غير محدودة
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check
                    className="text-green-600 dark:text-green-400"
                    size={20}
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    مستخدمون غير محدودون
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check
                    className="text-green-600 dark:text-green-400"
                    size={20}
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    دعم مخصص 24/7
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <Check
                    className="text-green-600 dark:text-green-400"
                    size={20}
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    عمليات تكامل مخصصة
                  </span>
                </li>
              </ul>
              <button className="w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-900 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600">
                اتصل بالمبيعات
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">
            هل أنت مستعد لتحويل عملك؟
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl opacity-90">
            انضم إلى مئات من تجار التجزئة الذين يثقون في ستوكي لدعم مبيعاتهم.
            ابدأ تجربتك المجانية لمدة 14 يومًا اليوم.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button className="flex transform items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-blue-600 transition hover:scale-105 hover:shadow-2xl">
              <span>ابدأ التجربة المجانية</span>
              <ArrowLeft size={20} />
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
              <div className="mb-4 flex items-center gap-2">
                <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-2">
                  <ShoppingCart className="text-white" size={20} />
                </div>
                <span className="text-xl font-bold text-white">ستوكي</span>
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
            <p>© 2025 ستوكي. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
