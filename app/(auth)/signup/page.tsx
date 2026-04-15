"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { createCompany } from "@/lib/actions/createcompnayacc";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Upload,
  X,
  Package,
  ShoppingCart,
  BarChart3,
  Wallet,
  Receipt,
  PackageSearch,
  Users,
  Boxes,
  Banknote,
  FolderKanban,
  Settings,
  ShoppingBag,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import { SelectField } from "@/components/common/selectproduct";
import { fallbackCurrencyOptions } from "@/lib/actions/currnciesOptions";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";

const CompanySignupSchema = z
  .object({
    name: z.string().min(2, "اسم الشركة يجب أن يكون على الأقل حرفين"),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    adminName: z.string().min(2, "اسم المدير يجب أن يكون على الأقل حرفين"),
    adminEmail: z.string().email("البريد الإلكتروني غير صحيح"),
    adminPassword: z
      .string()
      .min(6, "كلمة المرور يجب أن تكون على الأقل 6 أحرف"),
    confirmPassword: z.string(),
    base_currency: z.string(),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof CompanySignupSchema>;

const PLAN_OPTIONS = [
  {
    key: "STARTER",
    label: "Starter",
    description: "مناسب للبدايات والمحال الصغيرة",
  },
  {
    key: "PRO",
    label: "Pro",
    description: "للنمو والمخزون الأكثر حركة",
  },
  {
    key: "ENTERPRISE",
    label: "Enterprise",
    description: "حل مؤسسي بمرونة أكبر",
  },
] as const;

export default function CompanySignup() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { options } = useCurrencyOptions();
  const currencyOptions = options.length ? options : fallbackCurrencyOptions;
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const planParam = searchParams.get("plan")?.trim().toUpperCase();
  const selectedPlan =
    PLAN_OPTIONS.find((plan) => plan.key === planParam)?.key ?? "STARTER";

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CompanySignupSchema),
    defaultValues: {
      name: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
      base_currency: "YER",
    },
  });

  const currency = watch("base_currency");

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMessage("يرجى اختيار ملف صورة صحيح");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (loading) return;

    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // Create the company + admin account in app database.
      const result = await createCompany({
        name: data.name,
        email: data.adminEmail,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        country: data.country || undefined,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
        base_currency: data.base_currency,
        plan: selectedPlan,
      });

      if (result.success) {
        // Upload logo if provided
        let logoUrl = null;
        // if (logoFile) {
        //   logoUrl = await uploadLogo(result.companyId);

        //   // Update company with logo URL if upload was successful
        //   if (logoUrl) {
        //     await fetch('/api/company/update-logo', {
        //       method: 'POST',
        //       headers: {
        //         'Content-Type': 'application/json',
        //       },
        //       body: JSON.stringify({
        //         companyId: result.companyId,
        //         logoUrl: logoUrl,
        //       }),
        //     });
        //   }
        // }

        setSuccessMessage("تم إنشاء الشركة بنجاح! جاري التحويل...");
        reset();
        setLogoFile(null);
        setLogoPreview(null);
        router.replace("/login");
      } else {
        setErrorMessage(result.message || "فشل في إنشاء الشركة");
      }
    } catch (error) {
      console.error("Error:", error);
      setErrorMessage("حدث خطأ. يرجى المحاولة مرة أخرى.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#0a0f1d] p-4 text-white md:p-8"
      dir="rtl"
    >
      {/* --- طبقة الخلفية التفاعلية (Icons Background) --- */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.03]">
        <Package className="absolute top-10 left-10 h-32 w-32 rotate-12" />
        <ShoppingCart className="absolute right-20 bottom-20 h-40 w-40 -rotate-12" />
        <BarChart3 className="absolute top-1/4 right-[5%] h-24 w-24 rotate-45" />
        <Wallet className="absolute bottom-1/4 left-[5%] h-28 w-28 -rotate-6" />
        <Banknote className="absolute top-1/2 right-10 h-20 w-20" />
        <FolderKanban className="absolute top-20 right-1/3 h-24 w-24" />
        <Settings className="absolute bottom-10 left-1/3 h-16 w-16 rotate-90" />
        <ShoppingBag className="absolute top-1/3 left-1/4 h-32 w-32 opacity-20" />
        <NotebookPen className="absolute right-1/4 bottom-[10%] h-20 w-20" />
        <Boxes className="absolute top-10 right-1/4 h-16 w-16" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/20">
            <Building2 size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white">
            إنشاء حساب شركة
          </h1>
          <p className="mt-2 text-gray-400">
            ابدأ بتنظيم مخزونك ومبيعاتك في دقائق
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4">
          <div className="mb-3 text-center text-sm text-blue-200">
            الخطة المختارة من التسعير
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {PLAN_OPTIONS.map((plan) => {
              const active = plan.key === selectedPlan;
              return (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => router.replace(`/signup?plan=${plan.key}`)}
                  className={`rounded-xl border px-4 py-3 text-right transition ${
                    active
                      ? "border-blue-400 bg-blue-500/30 text-white shadow-lg"
                      : "border-white/10 bg-white/5 text-gray-300 hover:border-blue-400/50 hover:bg-white/10"
                  }`}
                >
                  <div className="text-base font-bold">{plan.label}</div>
                  <div className="mt-1 text-xs opacity-80">{plan.description}</div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-center text-sm text-blue-100">
            سيتم تسجيل الاشتراك على خطة <span className="font-bold">{selectedPlan}</span> عند إنشاء الحساب.
          </div>
        </div>

        <div className="rounded-3xl border border-gray-800 bg-[#111827]/80 p-6 shadow-2xl backdrop-blur-xl md:p-10">
          {/* Notifications */}
          {errorMessage && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center text-red-400">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-center text-green-400">
              {successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Section 1: Company Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                <Boxes className="text-blue-500" size={20} />
                <h2 className="text-xl font-bold">بيانات المنشأة</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* اسم الشركة */}
                <div className="space-y-2">
                  <Label className="mr-1 text-gray-300">
                    اسم الشركة <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Building2
                      className="absolute top-3 right-3 text-gray-500"
                      size={18}
                    />
                    <Input
                      {...register("name")}
                      className="border-gray-700 bg-gray-900/50 pr-10 focus:border-blue-500"
                      placeholder="اسم شركتك أو متجرك"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs text-red-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                {/* العملة */}
                <div className="space-y-2">
                  <Label className="text-gray-300">عملة النظام الأساسية</Label>
                  <SelectField
                    options={currencyOptions}
                    action={(value) => setValue("base_currency", value)}
                    value={currency}
                    placeholder="اختر العملة"
                  />
                </div>

                {/* الهاتف */}
                <div className="space-y-2">
                  <Label className="mr-1 text-gray-300">رقم الهاتف</Label>
                  <div className="relative">
                    <Phone
                      className="absolute top-3 right-3 text-gray-500"
                      size={18}
                    />
                    <Input
                      {...register("phone")}
                      className="border-gray-700 bg-gray-900/50 pr-10"
                      placeholder="+967 ..."
                    />
                  </div>
                </div>

                {/* الدولة والمدينة */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">الدولة</Label>
                    <Input
                      {...register("country")}
                      className="border-gray-700 bg-gray-900/50"
                      placeholder="اليمن"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">المدينة</Label>
                    <Input
                      {...register("city")}
                      className="border-gray-700 bg-gray-900/50"
                      placeholder="صنعاء"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Admin Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                <User className="text-indigo-500" size={20} />
                <h2 className="text-xl font-bold">حساب المدير المسؤول</h2>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="mr-1 text-gray-300">
                    اسم المدير <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    {...register("adminName")}
                    className="border-gray-700 bg-gray-900/50"
                    placeholder="الاسم الكامل"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="mr-1 text-gray-300">
                    البريد الإلكتروني للمدير{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail
                      className="absolute top-3 right-3 text-gray-500"
                      size={18}
                    />
                    <Input
                      {...register("adminEmail")}
                      className="border-gray-700 bg-gray-900/50 pr-10"
                      placeholder="admin@example.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="mr-1 text-gray-300">
                    كلمة المرور <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute top-3 right-3 text-gray-500"
                      size={18}
                    />
                    <Input
                      type="password"
                      {...register("adminPassword")}
                      className="border-gray-700 bg-gray-900/50 pr-10"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="mr-1 text-gray-300">
                    تأكيد كلمة المرور <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Lock
                      className="absolute top-3 right-3 text-gray-500"
                      size={18}
                    />
                    <Input
                      type="password"
                      {...register("confirmPassword")}
                      className="border-gray-700 bg-gray-900/50 pr-10"
                      placeholder="••••••••"
                    />
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-500">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-xl shadow-blue-600/20 transition-all hover:scale-[1.01] hover:bg-blue-700"
              >
                {loading ? "جاري إنشاء الحساب..." : "إنشاء حساب الشركة والبدء"}
              </Button>

              <div className="mt-6 text-center text-gray-400">
                لديك حساب بالفعل؟{" "}
                <Link
                  href="/login"
                  className="font-bold text-blue-400 transition-colors hover:text-blue-300"
                >
                  سجل دخولك هنا
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
