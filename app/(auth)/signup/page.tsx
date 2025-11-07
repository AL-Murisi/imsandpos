"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCompany } from "@/app/actions/createcompnayacc";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Upload,
  X,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
// import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client
// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );

const CompanySignupSchema = z
  .object({
    name: z.string().min(2, "اسم الشركة يجب أن يكون على الأقل حرفين"),
    email: z.string().email("البريد الإلكتروني غير صحيح"),
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
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof CompanySignupSchema>;

export default function CompanySignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CompanySignupSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      country: "",
      adminName: "",
      adminEmail: "",
      adminPassword: "",
      confirmPassword: "",
    },
  });

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setErrorMessage("يرجى اختيار ملف صورة صحيح");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("حجم الصورة يجب أن يكون أقل من 5 ميجابايت");
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrorMessage("");
    }
  };

  // Remove logo
  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      // First, create the company
      const result = await createCompany({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        address: data.address || undefined,
        city: data.city || undefined,
        country: data.country || undefined,
        adminName: data.adminName,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
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

        setTimeout(() => {
          router.push("/login");
        }, 2000);
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
      className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900"
      dir="rtl"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-xl dark:border-gray-700 dark:bg-slate-800">
          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <p className="text-right text-red-800 dark:text-red-200">
                {errorMessage}
              </p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
              <p className="text-right text-green-800 dark:text-green-200">
                {successMessage}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            {/* Company Information */}
            <div className="grid gap-6">
              {/* Logo Upload Section - MOVED TO TOP */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <div className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg">
                      <Building2 className="text-white" size={32} />
                    </div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                      إنشاء حساب شركة
                    </h1>
                    <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
                      قم بإعداد حسابك وبيانات المدير للبدء
                    </p>
                  </div>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900">
                      <Building2
                        className="text-blue-600 dark:text-blue-300"
                        size={20}
                      />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    معلومات الشركة
                  </h2>
                </div>

                {/* <div className="row-span-2 flex flex-col gap-4">
                  <Label className="text-right text-base font-semibold text-gray-700 dark:text-gray-300">
                    شعار الشركة (اختياري)
                  </Label>
                  {!logoPreview ? (
                    <label
                      htmlFor="logo-upload"
                      className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gradient-to-br from-gray-50 to-blue-50 p-8 transition hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 dark:border-gray-600 dark:from-slate-700/50 dark:to-blue-900/20 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30"
                    >
                      <div className="mb-3 rounded-full bg-blue-100 p-4 dark:bg-blue-900/50">
                        <Upload
                          className="text-blue-600 dark:text-blue-400"
                          size={32}
                        />
                      </div>
                      <span className="text-base font-semibold text-gray-700 dark:text-gray-300">
                        اضغط لرفع شعار الشركة
                      </span>
                      <span className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        PNG, JPG, GIF حتى 5 ميجابايت
                      </span>
                      <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                        الحجم الموصى به: 512x512 بكسل
                      </span>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                  ) : (
                    <div className="relative rounded-xl border-2 border-gray-300 bg-gradient-to-br from-gray-50 to-blue-50 p-6 dark:border-gray-600 dark:from-slate-700/50 dark:to-blue-900/20">
                      <div className="flex items-center gap-4">
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-white shadow-md ring-2 ring-blue-500/20 dark:bg-slate-800">
                          <img
                            src={logoPreview}
                            alt="معاينة الشعار"
                            className="h-full w-full object-contain p-2"
                          />
                        </div>
                        <div className="flex-1 text-right">
                          <p className="text-base font-semibold text-gray-900 dark:text-white">
                            {logoFile?.name}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            الحجم: {(logoFile!.size / 1024).toFixed(2)} كيلوبايت
                          </p>
                          <p className="mt-1 flex items-center justify-end gap-1 text-xs text-green-600 dark:text-green-400">
                            <span className="inline-block h-2 w-2 rounded-full bg-green-500"></span>
                            جاهز للرفع
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 transition hover:scale-110 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  )}
                </div> */}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Company Name and Email */}
                <div className="grid gap-2">
                  <Label
                    htmlFor="name"
                    className="text-right text-gray-700 dark:text-gray-300"
                  >
                    اسم الشركة <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Building2
                      className="absolute top-3 right-3 text-gray-400"
                      size={18}
                    />
                    <Input
                      id="name"
                      placeholder="شركة التجارة المحدودة"
                      className="pr-10 text-right"
                      {...register("name")}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-right text-xs text-red-500">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label
                    htmlFor="email"
                    className="text-right text-gray-700 dark:text-gray-300"
                  >
                    البريد الإلكتروني للشركة{" "}
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail
                      className="absolute top-3 right-3 text-gray-400"
                      size={18}
                    />
                    <Input
                      id="email"
                      type="email"
                      placeholder="info@company.com"
                      className="pr-10 text-right"
                      {...register("email")}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-right text-xs text-red-500">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label
                    htmlFor="phone"
                    className="text-right text-gray-700 dark:text-gray-300"
                  >
                    رقم الهاتف
                  </Label>
                  <div className="relative">
                    <Phone
                      className="absolute top-3 right-3 text-gray-400"
                      size={18}
                    />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+966 50 000 0000"
                      className="pr-10 text-right"
                      {...register("phone")}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-right text-xs text-red-500">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label
                    htmlFor="country"
                    className="text-right text-gray-700 dark:text-gray-300"
                  >
                    الدولة
                  </Label>
                  <div className="relative">
                    <MapPin
                      className="absolute top-3 right-3 text-gray-400"
                      size={18}
                    />
                    <Input
                      id="country"
                      placeholder="المملكة العربية السعودية"
                      className="pr-10 text-right"
                      {...register("country")}
                    />
                  </div>
                  {errors.country && (
                    <p className="text-right text-xs text-red-500">
                      {errors.country.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label
                    htmlFor="city"
                    className="text-right text-gray-700 dark:text-gray-300"
                  >
                    المدينة
                  </Label>
                  <div className="relative">
                    <MapPin
                      className="absolute top-3 right-3 text-gray-400"
                      size={18}
                    />
                    <Input
                      id="city"
                      placeholder="الرياض"
                      className="pr-10 text-right"
                      {...register("city")}
                    />
                  </div>
                  {errors.city && (
                    <p className="text-right text-xs text-red-500">
                      {errors.city.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label
                    htmlFor="address"
                    className="text-right text-gray-700 dark:text-gray-300"
                  >
                    العنوان
                  </Label>
                  <div className="relative">
                    <MapPin
                      className="absolute top-3 right-3 text-gray-400"
                      size={18}
                    />
                    <Input
                      id="address"
                      placeholder="شارع الملك فهد، حي العليا"
                      className="pr-10 text-right"
                      {...register("address")}
                    />
                  </div>
                  {errors.address && (
                    <p className="text-right text-xs text-red-500">
                      {errors.address.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm text-gray-500 dark:bg-slate-800 dark:text-gray-400">
                  معلومات المدير
                </span>
              </div>
            </div>

            {/* Admin Information */}
            <div>
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900">
                  <User
                    className="text-indigo-600 dark:text-indigo-300"
                    size={20}
                  />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  حساب المدير
                </h2>
              </div>

              <div className="grid gap-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="adminName"
                      className="text-right text-gray-700 dark:text-gray-300"
                    >
                      اسم المدير <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <User
                        className="absolute top-3 right-3 text-gray-400"
                        size={18}
                      />
                      <Input
                        id="adminName"
                        placeholder="أحمد محمد"
                        className="pr-10 text-right"
                        {...register("adminName")}
                      />
                    </div>
                    {errors.adminName && (
                      <p className="text-right text-xs text-red-500">
                        {errors.adminName.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label
                      htmlFor="adminEmail"
                      className="text-right text-gray-700 dark:text-gray-300"
                    >
                      البريد الإلكتروني للمدير{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Mail
                        className="absolute top-3 right-3 text-gray-400"
                        size={18}
                      />
                      <Input
                        id="adminEmail"
                        type="email"
                        placeholder="admin@company.com"
                        className="pr-10 text-right"
                        {...register("adminEmail")}
                      />
                    </div>
                    {errors.adminEmail && (
                      <p className="text-right text-xs text-red-500">
                        {errors.adminEmail.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label
                      htmlFor="adminPassword"
                      className="text-right text-gray-700 dark:text-gray-300"
                    >
                      كلمة المرور <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock
                        className="absolute top-3 right-3 text-gray-400"
                        size={18}
                      />
                      <Input
                        id="adminPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pr-10 text-right"
                        {...register("adminPassword")}
                      />
                    </div>
                    {errors.adminPassword && (
                      <p className="text-right text-xs text-red-500">
                        {errors.adminPassword.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-right text-gray-700 dark:text-gray-300"
                    >
                      تأكيد كلمة المرور <span className="text-red-500">*</span>
                    </Label>
                    <div className="relative">
                      <Lock
                        className="absolute top-3 right-3 text-gray-400"
                        size={18}
                      />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        className="pr-10 text-right"
                        {...register("confirmPassword")}
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-right text-xs text-red-500">
                        {errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex flex-col gap-4">
              {uploadingLogo && (
                <div className="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-900/20">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    جاري رفع الشعار... يرجى الانتظار
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading || uploadingLogo}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-6 text-lg font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
              >
                {loading
                  ? "جاري الإنشاء..."
                  : uploadingLogo
                    ? "جاري رفع الشعار..."
                    : "إنشاء الشركة"}
              </Button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                هل لديك حساب بالفعل؟{" "}
                <Link
                  href="/login"
                  className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  تسجيل الدخول من هنا
                </Link>
              </p>
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                بإنشاء حساب، أنت توافق على{" "}
                <a
                  href="#"
                  className="text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  شروط الخدمة
                </a>{" "}
                و{" "}
                <a
                  href="#"
                  className="text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  سياسة الخصوصية
                </a>
              </p>
            </div>
          </form>
        </div>

        {/* Footer Note */}
      </div>
    </div>
  );
}
