"use client";
import Image from "next/image";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Building2, Upload, X } from "lucide-react";
import { updateCompany } from "@/lib/actions/createcompnayacc";
import { useAuth } from "@/lib/context/AuthContext";
import { FormValues, UpdateCompanySchema } from "@/lib/zod/user";
// ✅ Validation schema

async function getSupabaseClient() {
  const mod = await import("@/lib/supabaseClient");
  return mod.supabase;
}

export default function UpdateCompanyForm({
  company,
}: {
  company:
    | {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;

        country: string | null;
        logoUrl: string | null;
        base_currency: string | null; // ✅ مهم
      }
    | undefined;
}) {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(
    company?.logoUrl || null,
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // ✅ Initialize Supabase SSR browser client (safe in client)

  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(UpdateCompanySchema),
    defaultValues: {
      name: company?.name,
      email: company?.email || "",
      phone: company?.phone || "",
      address: company?.address || "",
      city: company?.city || "",
      country: company?.country || "",
      base_currency: company?.base_currency || "",
    },
  });
  if (!user || !company) {
    return (
      <div
        className="mx-auto max-w-3xl animate-pulse rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800"
        dir="rtl"
      >
        {/* Title */}
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded bg-slate-300 dark:bg-slate-600"></div>
          <div className="h-8 w-64 rounded bg-slate-300 dark:bg-slate-600"></div>
        </div>

        {/* Alerts */}
        <div className="mb-4 h-4 w-48 rounded bg-slate-300 dark:bg-slate-600"></div>

        <div className="space-y-4 p-2">
          {/* Row 1 */}
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 w-28 rounded bg-slate-300 dark:bg-slate-600"></div>
                <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
              </div>
            ))}
          </div>

          {/* Row 2 */}
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 w-24 rounded bg-slate-300 dark:bg-slate-600"></div>
                <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
              </div>
            ))}
          </div>

          {/* Row 3 */}
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 w-20 rounded bg-slate-300 dark:bg-slate-600"></div>
                <div className="h-10 w-full rounded bg-slate-200 dark:bg-slate-700"></div>
              </div>
            ))}
          </div>

          {/* Logo Upload */}
          <div className="space-y-3">
            <div className="h-4 w-40 rounded bg-slate-300 dark:bg-slate-600"></div>

            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-slate-300 p-6 dark:border-slate-600">
              <div className="h-10 w-32 rounded bg-slate-200 dark:bg-slate-700"></div>
            </div>

            <div className="h-3 w-32 rounded bg-slate-300 dark:bg-slate-600"></div>
          </div>

          {/* Submit Button */}
          <div className="h-12 w-full rounded-xl bg-slate-300 dark:bg-slate-700"></div>
        </div>
      </div>
    );
  }
  // ✅ Handle logo selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("حجم الملف يجب أن يكون أقل من 5 ميجابايت");
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = async () => {
    try {
      const supabase = await getSupabaseClient();
      if (company?.logoUrl) {
        // Extract path after /public/
        const oldFileName = company.logoUrl.split("/public/").pop();
        if (oldFileName) {
          const oldFilePath = `public/${oldFileName}`;
          const { error: deleteError } = await supabase.storage
            .from("companylogos")
            .remove([oldFilePath]);

          if (deleteError) {
            console.error(
              "❌ Failed to delete logo from Supabase:",
              deleteError,
            );
          }
        }

        // Update DB to remove logo reference
        await updateCompany(user.companyId, { logoUrl: "" });
      }

      // Update UI
      setLogoFile(null);
      setLogoPreview(null);
      setSuccessMessage("تم حذف الشعار بنجاح ✅");
    } catch (err) {
      console.error("Error removing logo:", err);
      setErrorMessage("فشل حذف الشعار");
    }
  };

  // ✅ Upload logo to Supabase Storage using @supabase/ssr
  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile || !user) return null;

    try {
      const supabase = await getSupabaseClient();
      setUploadingLogo(true);

      const fileExt = logoFile.name.split(".").pop();
      const fileName = `${user.companyId}-${Date.now()}.${fileExt}`;
      const filePath = `public/${fileName}`; // ✅ consistent prefix

      // 🧹 Delete old logo if it exists
      if (company?.logoUrl) {
        const oldFileName = company.logoUrl.split("/public/").pop();
        if (oldFileName) {
          const oldFilePath = `public/${oldFileName}`; // ✅ fixed path
          const { error: deleteError } = await supabase.storage
            .from("companylogos")
            .remove([oldFilePath]);

          if (deleteError) {
            console.warn("Failed to delete old logo:", deleteError);
          }
        }
      }

      // 🆕 Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("companylogos")
        .upload(filePath, logoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw uploadError;
      }

      // 🌍 Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("companylogos").getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading logo:", error);
      setErrorMessage("فشل رفع الشعار");
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  // ✅ Handle form submission
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let logoUrl = company?.logoUrl || null;

      // Upload logo if a new one was selected
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) logoUrl = uploadedUrl;
        else {
          setLoading(false);
          return;
        }
      }

      // ✍️ Update in Prisma
      const result = await updateCompany(user.companyId, {
        ...data,
        logoUrl: logoUrl || undefined,
      });

      if (result.success) {
        setSuccessMessage("تم تحديث بيانات الشركة بنجاح ✅");
        setLogoFile(null);
      } else {
        setErrorMessage(result.message || "فشل تحديث الشركة");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("حدث خطأ أثناء التحديث");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-lg dark:bg-slate-800"
      dir="rtl"
    >
      <h1 className="mb-6 flex items-center gap-2 text-3xl font-bold text-gray-900 dark:text-white">
        <Building2 className="text-blue-600" /> تحديث بيانات الشركة
      </h1>

      {errorMessage && <p className="mb-4 text-red-600">{errorMessage}</p>}
      {successMessage && (
        <p className="mb-4 text-green-600">{successMessage}</p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-2">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="grid gap-3">
            <Label htmlFor="name">اسم الشركة</Label>
            <Input id="name" {...register("name")} className="text-right" />
            {errors.name && (
              <p className="text-xs text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" {...register("email")} className="text-right" />
            {errors.email && (
              <p className="text-xs text-red-500">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <Label htmlFor="phone">رقم الهاتف</Label>
            <Input id="phone" {...register("phone")} className="text-right" />
          </div>

          <div className="grid gap-3">
            <Label htmlFor="country">الدولة</Label>
            <Input
              id="country"
              {...register("country")}
              className="text-right"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-3">
            <Label htmlFor="city">المدينة</Label>
            <Input id="city" {...register("city")} className="text-right" />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="base_currency"> العمله الرئيسية</Label>
            <Input
              id="base_currency"
              {...register("base_currency")}
              className="text-right"
            />
          </div>

          <div className="grid gap-3">
            <Label htmlFor="address">العنوان</Label>
            <Input
              id="address"
              {...register("address")}
              className="text-right"
            />
          </div>
        </div>

        {/* 🖼️ Logo Section */}
        <div className="grid gap-3">
          <Label>شعار الشركة (اختياري)</Label>
          {!logoPreview ? (
            <label
              htmlFor="logo-upload"
              className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-blue-500"
            >
              <Upload className="text-gray-400" size={24} />
              <span className="mr-2 text-gray-500">اضغط لرفع الشعار</span>
              <input
                id="logo-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </label>
          ) : (
            <div className="relative inline-block">
              <Image
                src={logoPreview}
                alt="Logo Preview"
                width={128}
                height={128}
                className="h-32 w-32 rounded-lg border object-contain"
                unoptimized={logoPreview.startsWith("data:")}
              />
              <button
                type="button"
                onClick={removeLogo}
                className="absolute -top-2 -left-2 rounded-full bg-red-500 p-1 text-white hover:bg-red-600"
              >
                <X size={14} />
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500">الحد الأقصى: 5 ميجابايت</p>
        </div>

        <Button
          type="submit"
          disabled={loading || uploadingLogo}
          className="w-full rounded-xl bg-blue-600 py-3 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {uploadingLogo
            ? "جارٍ رفع الشعار..."
            : loading
              ? "جارٍ التحديث..."
              : "تحديث الشركة"}
        </Button>
      </form>
    </div>
  );
}
