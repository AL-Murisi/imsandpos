"use client";
import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  BarChart3,
  Wifi,
  Receipt,
  Check,
  Menu,
  X,
  Shield,
  Clock,
  Database,
  Cloud,
  Smartphone,
  Bell,
  Globe,
  SmartphoneIcon,
  Laptop,
  Apple,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ModeToggle } from "./toggoletheme";
import { CarouselDemo } from "./common/carousel";
import { Carouselp } from "./common/carouselp";
import { ScrollArea } from "./ui/scroll-area";
export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const goToSignup = (plan: "STARTER" | "PRO" | "ENTERPRISE" | "TRIAL") => {
    router.push(`/signup?plan=${plan}`);
  };

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
              <div className="mb-2 flex justify-center">
                <div className="relative h-10 w-10 rounded-full bg-white p-1 shadow-2xl ring-4 ring-blue-600/20">
                  <Image
                    src={"/icons/icon-rounded-192.png"}
                    alt="Logo"
                    width={56}
                    height={56}
                    className="h-full w-full rounded-full object-contain"
                  />
                </div>
              </div>
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-2xl font-bold text-transparent">
                ستوكلي
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
                onClick={() => goToSignup("STARTER")}
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
                onClick={() => goToSignup("STARTER")}
                className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-2 text-white"
              >
                إنشاء حساب
              </button>
            </div>
          )}
        </div>
      </nav>
      <ScrollArea className="h-[100vh]" dir="rtl">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 px-6 pt-32 pb-20">
          <div className="mx-auto max-w-[1800px]">
            <div className="grid items-center gap-12 md:grid-cols-[0.9fr_2.1fr]">
              <div className="space-y-8 text-right">
                {/* Heading */}
                <h1 className="text-5xl leading-tight font-bold text-white md:text-6xl">
                  إدارة متجرك بذكاء… في نظام واحد
                </h1>

                {/* Description */}
                <p className="text-xl leading-relaxed text-gray-300">
                  نظام متكامل لنقاط البيع وإدارة المخزون يمنحك تحكمًا كاملاً في
                  المبيعات، المنتجات، والتقارير — مع أداء سريع وتنبيهات ذكية
                  تساعدك على اتخاذ القرار في الوقت المناسب.
                </p>

                {/* CTA Buttons */}
                <div className="flex flex-col justify-start gap-4 sm:flex-row">
                  <button
                    onClick={() => router.push("/login")}
                    className="group flex transform items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-8 py-4 font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-2xl"
                  >
                    <span>ابدأ الآن</span>
                    <ArrowLeft
                      className="transition group-hover:translate-x-1"
                      size={20}
                    />
                  </button>

                  <button className="rounded-xl border-2 border-gray-300 bg-white/10 px-8 py-4 font-semibold text-white backdrop-blur-sm transition hover:border-blue-400 hover:bg-white/20">
                    مشاهدة العرض التوضيحي
                  </button>
                </div>
              </div>
              {/* Dashboard Mockup */}
              {/*   <div className="relative">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-400 to-indigo-400 opacity-20 blur-3xl"></div>
              <div className="relative rounded-2xl border border-gray-700 bg-slate-800/50 p-4 shadow-2xl backdrop-blur-sm">
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
                </div> */}
              <div className="relative -ml-4 h-full w-full md:-ml-10">
                <CarouselDemo />
              </div>
              {/* </div>
            </div> */}
            </div>
          </div>
        </section>
        {/* Features Section */}
        <section
          id="features"
          className="bg-slate-50 px-6 py-20 dark:bg-slate-900"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-12 md:grid-cols-[0.9fr_2.1fr]">
              <div className="w-xs">
                <Carouselp />
              </div>
              <div>
                <div className="mb-16 text-center">
                  <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
                    ميزات قوية لعملك
                  </h2>
                  <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
                    كل ما تحتاجه لإدارة متجرك بكفاءة، كل ذلك في مكان واحد
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <div className="group rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-8 text-right transition hover:shadow-xl dark:border-purple-800 dark:from-purple-950 dark:to-indigo-950">
                    {/* Icons */}
                    <div className="mb-6 grid grid-cols-3 justify-items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg transition group-hover:scale-110">
                        <Globe className="text-white" size={28} />
                      </div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg transition group-hover:scale-110">
                        <SmartphoneIcon className="text-white" size={28} />
                      </div>
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg transition group-hover:scale-110">
                        <Laptop className="text-white" size={28} />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                      يعمل على جميع المنصات
                    </h3>

                    {/* Description */}
                    <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                      نظام متكامل يعمل على
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        Desktop
                      </span>
                      ،
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        iOS
                      </span>{" "}
                      و
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        Android
                      </span>
                      . يمكنك استخدامه كـ
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        Web App
                      </span>
                      أو كتطبيق
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        Native
                      </span>
                      .
                    </p>

                    {/* Platform List with Icons */}
                    <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <li className="flex items-center justify-end gap-2">
                        <span>يدعم أجهزة Desktop</span>
                        <Laptop size={16} className="text-purple-600" />
                      </li>

                      <li className="flex items-center justify-end gap-2">
                        <span>متوفر على iOS</span>
                        <Apple size={16} className="text-purple-600" />
                      </li>

                      <li className="flex items-center justify-end gap-2">
                        <span>متوافق مع Android</span>
                        <SmartphoneIcon size={16} className="text-purple-600" />
                      </li>

                      <li className="flex items-center justify-end gap-2">
                        <span>يعمل بدون تثبيت (Web)</span>
                        <Globe size={16} className="text-purple-600" />
                      </li>
                    </ul>
                  </div>
                  <div className="group rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-right transition hover:shadow-xl dark:border-blue-800 dark:from-blue-950 dark:to-indigo-950">
                    {/* Icon */}
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg transition group-hover:scale-110">
                      <Bell className="text-white" size={28} />
                    </div>
                    {/* Title */}
                    <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                      إشعارات فورية وذكية
                    </h3>
                    {/* Description */}
                    <p className="space-y-2 leading-relaxed text-gray-600 dark:text-gray-300">
                      احصل على تنبيهات فورية لإدارة المخزون بكفاءة:
                    </p>
                    {/* Notifications List */}
                    <ul className="mt-4 space-y-2 text-sm font-medium">
                      <li className="text-red-600 dark:text-red-400">
                        🔴 منتجات منتهية الصلاحية تحتاج إجراء فوري
                      </li>
                      <li className="text-orange-600 dark:text-orange-400">
                        🟠 منتجات قاربت على الانتهاء (لتجنب الخسارة)
                      </li>
                      <li className="text-red-700 dark:text-red-500">
                        ⛔ نفاد المخزون بالكامل
                      </li>
                      <li className="text-yellow-600 dark:text-yellow-400">
                        ⚠️ انخفاض المخزون (أقل من الحد المحدد)
                      </li>
                      <li className="text-blue-600 dark:text-blue-400">
                        💰 إشعارات المبيعات والمدفوعات
                      </li>
                    </ul>
                  </div>
                  <div className="group rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-8 text-right transition hover:shadow-xl dark:border-purple-800 dark:from-purple-950 dark:to-pink-950">
                    {/* Icon */}
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg transition group-hover:scale-110">
                      <Package className="text-white" size={28} />
                    </div>

                    {/* Title */}
                    <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                      إدارة المخزون
                    </h3>

                    {/* Description */}
                    <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                      تحكم كامل في مخزونك مع تتبع لحظي ودقيق لكل حركة.{" "}
                    </p>

                    {/* Features */}
                    <ul className="mt-4 space-y-2 text-sm font-medium">
                      <li className="text-blue-600 dark:text-blue-400">
                        📦 تتبع الكميات (المتوفر / المحجوز / المباع)
                      </li>

                      <li className="text-yellow-600 dark:text-yellow-400">
                        ⚠️ تنبيهات انخفاض المخزون حسب الحد الأدنى
                      </li>

                      <li className="text-red-600 dark:text-red-400">
                        🔴 تنبيهات المنتجات المنتهية أو القريبة من الانتهاء
                      </li>

                      <li className="text-green-600 dark:text-green-400">
                        📊 تقارير وتحليلات لحركة المخزون
                      </li>

                      <li className="text-purple-600 dark:text-purple-400">
                        📍 إدارة مواقع التخزين (مخازن / رفوف)
                      </li>
                    </ul>
                  </div>
                  <div className="group rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-right transition hover:shadow-xl dark:border-green-800 dark:from-green-950 dark:to-emerald-950">
                    {/* Icon */}
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg transition group-hover:scale-110">
                      <BarChart3 className="text-white" size={28} />
                    </div>

                    {/* Title */}
                    <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                      تحليلات ذكية
                    </h3>

                    {/* Description */}
                    <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                      تقارير شاملة تساعدك على فهم أداء عملك واتخاذ قرارات دقيقة
                      مبنية على البيانات.
                    </p>

                    {/* Key Highlights */}
                    <ul className="mt-4 space-y-2 text-sm font-medium">
                      <li className="text-green-600 dark:text-green-400">
                        📊 تقارير المبيعات والأرباح
                      </li>

                      <li className="text-blue-600 dark:text-blue-400">
                        📦 تحليل المخزون وحركته
                      </li>

                      <li className="text-yellow-600 dark:text-yellow-400">
                        👥 أداء المستخدمين والعملاء
                      </li>

                      <li className="text-purple-600 dark:text-purple-400">
                        💳 المدفوعات والديون والمصروفات
                      </li>

                      <li className="text-emerald-600 dark:text-emerald-400">
                        📈 رؤى وتقارير قابلة للتخصيص
                      </li>
                    </ul>
                  </div>
                  <div className="group rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-8 text-right transition hover:shadow-xl dark:border-purple-800 dark:from-purple-950 dark:to-indigo-950">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-gray-500 to-slate-600 shadow-lg">
                      <Receipt className="text-white" size={28} />
                    </div>

                    <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                      الفواتير والطباعة
                    </h3>

                    <p className="text-gray-600 dark:text-gray-300">
                      إنشاء وطباعة فواتير احترافية مع دعم الطابعات .
                    </p>

                    <ul className="mt-4 space-y-2 text-sm font-medium">
                      <li className="text-blue-600">🧾 فواتير بيع وشراء</li>
                      <li className="text-green-600">🖨️ طباعة وفواتير PDF</li>
                      <li className="text-purple-600">
                        🎨 تخصيص الشعار والبيانات
                      </li>
                    </ul>
                  </div>
                  <div className="group rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-blue-50 p-8 text-right transition hover:shadow-xl dark:border-cyan-800 dark:from-cyan-950 dark:to-blue-950">
                    {/* Icon */}
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg transition group-hover:scale-110">
                      <Shield className="text-white" size={28} />
                    </div>

                    {/* Title */}
                    <h3 className="mb-3 text-2xl font-bold text-gray-900 dark:text-white">
                      آمن وموثوق
                    </h3>

                    {/* Description */}
                    <p className="leading-relaxed text-gray-600 dark:text-gray-300">
                      نظام أمان متكامل لحماية بياناتك وإدارة الصلاحيات بدقة، مع
                      ضمان استمرارية العمل وحماية المعلومات الحساسة.
                    </p>

                    {/* Features */}
                    <ul className="mt-4 space-y-2 text-sm font-medium">
                      <li className="text-blue-600 dark:text-blue-400">
                        🔐 تشفير البيانات وحماية الجلسات
                      </li>

                      <li className="text-green-600 dark:text-green-400">
                        💾 نسخ احتياطي تلقائي واستعادة البيانات
                      </li>

                      <li className="text-purple-600 dark:text-purple-400">
                        👥 نظام صلاحيات متقدم (Role-Based Access)
                      </li>

                      <li className="text-yellow-600 dark:text-yellow-400">
                        🧾 تسجيل جميع الأنشطة (Activity Logs)
                      </li>

                      <li className="text-cyan-600 dark:text-cyan-400">
                        🛡️ حماية من الوصول غير المصرح به
                      </li>
                    </ul>
                  </div>
                </div>
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
            {/* Header */}
            <div className="mb-16 text-center">
              <h2 className="mb-4 text-4xl font-bold md:text-5xl">
                لماذا تختار ستوكي؟
              </h2>
              <p className="mx-auto max-w-2xl text-xl opacity-90">
                نظام متكامل لإدارة أعمالك بكفاءة، مصمم لزيادة الإنتاجية وتقليل
                الأخطاء
              </p>
            </div>

            {/* Benefits */}
            <div className="grid gap-6 md:grid-cols-2">
              {[
                "🚨 تنبيهات فورية: نفاد المخزون، انخفاض الكمية، المنتجات المنتهية أو القريبة من الانتهاء",
                "⚡ أداء سريع واستجابة فورية في جميع العمليات",
                "☁️ نسخ احتياطي تلقائي وحماية كاملة للبيانات",
                "📦 مزامنة المخزون في الوقت الفعلي",
                "🏬 إدارة فروع ومستودعات متعددة بسهولة",
                "📊 تقارير دقيقة للمبيعات والأرباح واتخاذ القرار",
                "👥 نظام صلاحيات متقدم للتحكم في المستخدمين",
                "📷 دعم الباركود و QR لتسريع عمليات البيع",
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

            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-4">
              {" "}
              {/* Free Trial Plan */}
              <div className="rounded-2xl border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 p-8 text-right transition hover:border-green-500 hover:shadow-xl dark:border-green-700 dark:from-green-950 dark:to-emerald-950">
                <div className="mb-2 inline-block rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700 dark:bg-green-900 dark:text-green-300">
                  تجربة مجانية
                </div>

                <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
                  النسخة التجريبية
                </h3>

                <div className="mb-6 text-4xl font-bold text-gray-900 dark:text-white">
                  0 ر.س
                  <span className="text-lg text-gray-600 dark:text-gray-400">
                    {" "}
                    /7 أيام
                  </span>
                </div>

                <ul className="mb-8 space-y-4">
                  <li className="flex items-center gap-2">
                    <Check className="text-green-600" size={20} />
                    <span className="text-gray-700 dark:text-gray-300">
                      فرع واحد
                    </span>
                  </li>

                  <li className="flex items-center gap-2">
                    <Check className="text-green-600" size={20} />
                    <span className="text-gray-700 dark:text-gray-300">
                      كاشير واحد
                    </span>
                  </li>

                  <li className="flex items-center gap-2">
                    <Check className="text-green-600" size={20} />
                    <span className="text-gray-700 dark:text-gray-300">
                      مخزن واحد
                    </span>
                  </li>

                  <li className="flex items-center gap-2">
                    <Check className="text-green-600" size={20} />
                    <span className="text-gray-700 dark:text-gray-300">
                      حتى 2 مستخدم
                    </span>
                  </li>
                </ul>

                <button
                  onClick={() => goToSignup("TRIAL")}
                  className="w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-900 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
                  ابدأ الآن
                </button>
              </div>
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
                <button
                  onClick={() => goToSignup("STARTER")}
                  className="w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-900 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
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
                <button
                  onClick={() => goToSignup("PRO")}
                  className="w-full rounded-xl bg-white py-3 font-semibold text-blue-600 transition hover:shadow-lg"
                >
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
                <button
                  onClick={() => goToSignup("ENTERPRISE")}
                  className="w-full rounded-xl bg-gray-100 py-3 font-semibold text-gray-900 transition hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                >
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
              <button
                onClick={() => goToSignup("TRIAL")}
                className="flex transform items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-blue-600 transition hover:scale-105 hover:shadow-2xl"
              >
                <span>ابدأ التجربة المجانية</span>
                <ArrowLeft size={20} />
              </button>
              <button className="rounded-xl border-2 border-white bg-transparent px-8 py-4 font-semibold text-white transition hover:bg-white hover:text-blue-600">
                جدولة عرض توضيحي
              </button>
            </div>
            <p className="mt-6 text-sm opacity-75">
              لا يلزم وجود بطاقة ائتمان • تجربة مجانية لمدة 14 يومًا • إلغاء في
              أي وقت
            </p>
          </div>
        </section>
        {/* Footer */}
        <footer className="bg-slate-900 px-6 py-12 text-gray-400">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 grid gap-8 text-right md:grid-cols-4">
              <div>
                <div className="mb-4 flex items-center gap-2">
                  <div className="relative h-10 w-10 rounded-full bg-white p-1 shadow-2xl ring-4 ring-blue-600/20">
                    <Image
                      src={"/icons/icon-rounded-192.png"}
                      alt="Logo"
                      width={56}
                      height={56}
                      className="h-full w-full rounded-full object-contain"
                    />
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
              <p>© 2025 ستوكلي. جميع الحقوق محفوظة.</p>
            </div>
          </div>
        </footer>
      </ScrollArea>
    </div>
  );
}
