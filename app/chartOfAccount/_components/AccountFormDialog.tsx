"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm, Resolver } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react"; // ⬅️ Added useEffect
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Dailogreuse from "@/components/common/dailogreuse";
import { Plus, Edit2 } from "lucide-react";
import { createAccount, updateAccount } from "@/app/actions/chartOfaccounts";

// --------------------
// Mock/Placeholder for getParentAccounts
// ⚠️ You need to replace this with your actual implementation.
// For example, if it's a server action, import it from the actions file.
// --------------------
// Assuming this is your actual action
import { getParentAccounts } from "@/app/actions/chartOfaccounts";

// --------------------
// Schema
// --------------------
// FIX Zod schema to guarantee boolean (no change needed here, your boolean check is fine)

const accountFormSchema = z.object({
  account_code: z.string().min(1, "رمز الحساب مطلوب"),
  account_name_en: z.string().min(1, "اسم الحساب بالإنجليزية مطلوب"),
  account_name_ar: z.string().optional(),
  account_type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  account_category: z.string().min(1, "فئة الحساب مطلوبة"),
  parent_id: z.string().optional(),
  description: z.string().optional(),

  // Preprocess ensures this is always a number (You might want to ensure it's a valid number input)
  opening_balance: z.number().int().nonnegative(),

  // Ensure boolean is always returned
  allow_manual_entry: z.boolean().default(true).optional(),
});

type FormValues = z.infer<typeof accountFormSchema>;

// --------------------
// Types
// --------------------
// Define the type for a parent account explicitly
type ParentAccount = {
  id: string;
  account_code: string;
  account_name_ar: string | null;
  account_name_en: string;
};

interface AccountFormDialogProps {
  mode: "create" | "edit";
  account?: Partial<FormValues> & { id?: string };
}

// --------------------
// Component
// --------------------
export default function AccountFormDialog({
  mode,
  account,
}: AccountFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]); // ⬅️ State for parent accounts
  const [isLoadingParents, setIsLoadingParents] = useState(true); // ⬅️ Loading state

  // --------------------
  // Data Fetching with useEffect
  // --------------------
  useEffect(() => {
    async function fetchParentData() {
      setIsLoadingParents(true);
      try {
        // ⚠️ Assuming getParentAccounts() returns an object with a 'data' array
        const result = await getParentAccounts();
        if (result && result.data) {
          setParentAccounts(result.data);
        } else {
          setParentAccounts([]);
          toast.error("فشل في تحميل الحسابات الرئيسية");
        }
      } catch (error) {
        console.error("Error fetching parent accounts:", error);
        toast.error("خطأ في الاتصال لتحميل الحسابات الرئيسية");
      } finally {
        setIsLoadingParents(false);
      }
    }

    // Only fetch when the dialog is open for the first time or if the data needs refreshing
    if (open && parentAccounts.length === 0) {
      fetchParentData();
    }
    // Alternatively, fetch every time the dialog opens:
    // if (open) { fetchParentData(); }
  }, [open]); // ⬅️ Run when the dialog opens/closes

  // Resolver typed explicitly
  const resolver: Resolver<FormValues> = zodResolver(accountFormSchema);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver,
    defaultValues:
      mode === "edit" && account
        ? {
            account_code: account.account_code ?? "",
            account_name_en: account.account_name_en ?? "",
            account_name_ar: account.account_name_ar ?? "",
            account_type: account.account_type ?? "ASSET",
            account_category: account.account_category ?? "CASH_AND_BANK",
            parent_id: account.parent_id ?? "",
            // Use Number() conversion for the input field to be pre-filled correctly
            opening_balance: Number(account.opening_balance ?? 0),
            description: account.description ?? "",
            allow_manual_entry: account.allow_manual_entry ?? true,
          }
        : {
            account_code: account?.account_code ?? "",
            account_name_en: account?.account_name_en ?? "",
            account_name_ar: account?.account_name_ar ?? "",
            account_type: account?.account_type ?? "ASSET",
            account_category: account?.account_category ?? "CASH_AND_BANK",
            parent_id: account?.parent_id ?? "",
            opening_balance: account?.opening_balance ?? 0,
            description: account?.description ?? "",
            allow_manual_entry: account?.allow_manual_entry ?? true,
          },
  });

  const selectedType = watch("account_type");

  const accountTypes = [
    { value: "ASSET", label: "أصول" },
    { value: "LIABILITY", label: "خصوم" },
    { value: "EQUITY", label: "حقوق ملكية" },
    { value: "REVENUE", label: "إيرادات" },
    { value: "EXPENSE", label: "مصروفات" },
    // { value: "COST_OF_GOODS", label: "تكلفة البضاعة" },
  ];

  // ... (accountCategories array is unchanged)
  const accountCategories = [
    { value: "CASH_AND_BANK", label: "نقد وبنوك", type: "ASSET" },
    { value: "ACCOUNTS_RECEIVABLE", label: "ذمم مدينة", type: "ASSET" },
    { value: "INVENTORY", label: "مخزون", type: "ASSET" },
    { value: "FIXED_ASSETS", label: "أصول ثابتة", type: "ASSET" },
    { value: "ACCUMULATED_DEPRECIATION", label: "مجمع استهلاك", type: "ASSET" },
    {
      value: "OTHER_CURRENT_ASSETS",
      label: "أصول متداولة أخرى",
      type: "ASSET",
    },
    { value: "OTHER_ASSETS", label: "أصول أخرى", type: "ASSET" },
    { value: "ACCOUNTS_PAYABLE", label: "ذمم دائنة", type: "LIABILITY" },
    { value: "CREDIT_CARD", label: "بطاقة ائتمان", type: "LIABILITY" },
    { value: "SHORT_TERM_LOANS", label: "قروض قصيرة الأجل", type: "LIABILITY" },
    {
      value: "SALES_TAX_PAYABLE",
      label: "ضريبة مبيعات مستحقة",
      type: "LIABILITY",
    },
    { value: "ACCRUED_EXPENSES", label: "مصاريف مستحقة", type: "LIABILITY" },
    {
      value: "OTHER_CURRENT_LIABILITIES",
      label: "خصوم متداولة أخرى",
      type: "LIABILITY",
    },
    {
      value: "LONG_TERM_LIABILITIES",
      label: "خصوم طويلة الأجل",
      type: "LIABILITY",
    },
    { value: "OWNER_EQUITY", label: "رأس المال", type: "EQUITY" },
    { value: "RETAINED_EARNINGS", label: "أرباح محتجزة", type: "EQUITY" },
    { value: "DRAWINGS", label: "مسحوبات", type: "EQUITY" },
    { value: "SALES_REVENUE", label: "إيرادات مبيعات", type: "REVENUE" },
    { value: "SERVICE_REVENUE", label: "إيرادات خدمات", type: "REVENUE" },
    { value: "OTHER_INCOME", label: "إيرادات أخرى", type: "REVENUE" },
    {
      value: "COST_OF_GOODS_SOLD",
      label: "تكلفة البضاعة المباعة",
      type: "EXPENSE",
    },
    { value: "OPERATING_EXPENSES", label: "مصاريف تشغيلية", type: "EXPENSE" },
    { value: "PAYROLL_EXPENSES", label: "مصاريف رواتب", type: "EXPENSE" },
    {
      value: "ADMINISTRATIVE_EXPENSES",
      label: "مصاريف إدارية",
      type: "EXPENSE",
    },
    { value: "OTHER_EXPENSES", label: "مصاريف أخرى", type: "EXPENSE" },
  ];
  // ...

  const filteredCategories = accountCategories.filter(
    (cat) => cat.type === selectedType,
  );

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      console.log("✅ Form data:", data);

      let result;

      if (mode === "create") {
        result = await createAccount(data);
      } else if (mode === "edit" && account?.id) {
        result = await updateAccount(account.id, data);
      } else {
        toast.error("معرّف الحساب مفقود");
        return;
      }

      if (!result?.success) {
        toast.error(result?.error || "حدث خطأ أثناء حفظ الحساب");
        return;
      }

      toast.success(result.message);
      setOpen(false);
      reset();
    } catch (error) {
      console.error("❌ Error:", error);
      toast.error("حدث خطأ أثناء حفظ الحساب");
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={
        mode === "create" ? (
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            إضافة حساب جديد
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-100"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )
      }
      style="sm:max-w-3xl"
      titel={mode === "create" ? "إضافة حساب جديد" : "تعديل الحساب"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* ... (Your other form fields - Account Code, Type, Names, Category - are here) ... */}

          {/* Account Code */}
          <div className="grid gap-2">
            <Label htmlFor="account_code">رمز الحساب *</Label>
            <Input
              id="account_code"
              type="text"
              placeholder="مثال: 1011"
              {...register("account_code")}
            />
            {errors.account_code && (
              <p className="text-xs text-red-500">
                {errors.account_code.message}
              </p>
            )}
          </div>

          {/* Account Type */}
          <div className="grid gap-2">
            <Label htmlFor="account_type">نوع الحساب *</Label>
            <Select
              value={watch("account_type")}
              onValueChange={(value: FormValues["account_type"]) =>
                setValue("account_type", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع الحساب" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_type && (
              <p className="text-xs text-red-500">
                {errors.account_type.message}
              </p>
            )}
          </div>

          {/* Account Name (English) */}
          <div className="grid gap-2">
            <Label htmlFor="account_name_en">اسم الحساب (English) *</Label>
            <Input
              id="account_name_en"
              type="text"
              placeholder="Cash on Hand"
              {...register("account_name_en")}
            />
            {errors.account_name_en && (
              <p className="text-xs text-red-500">
                {errors.account_name_en.message}
              </p>
            )}
          </div>

          {/* Account Name (Arabic) */}
          <div className="grid gap-2">
            <Label htmlFor="account_name_ar">اسم الحساب (عربي)</Label>
            <Input
              id="account_name_ar"
              type="text"
              placeholder="النقد في الصندوق"
              {...register("account_name_ar")}
            />
          </div>

          {/* Category */}
          <div className="grid gap-2">
            <Label htmlFor="account_category">الفئة *</Label>
            <Select
              value={watch("account_category")}
              onValueChange={(value: string) =>
                setValue("account_category", value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="اختر الفئة" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_category && (
              <p className="text-xs text-red-500">
                {errors.account_category.message}
              </p>
            )}
          </div>

          {/* Parent Account */}
          <div className="grid gap-2">
            <Label htmlFor="parent_id">الحساب الرئيسي</Label>
            <Select
              value={watch("parent_id")}
              onValueChange={(value: string) => setValue("parent_id", value)}
              disabled={isLoadingParents} // ⬅️ Disable while loading
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingParents
                      ? "جاري التحميل..."
                      : "لا يوجد (حساب رئيسي)"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {/* ⬅️ Fallback/Loading message for SelectContent */}
                {isLoadingParents ? (
                  <SelectItem value="s" disabled>
                    جاري تحميل الحسابات...
                  </SelectItem>
                ) : (
                  parentAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.account_code} -{" "}
                      {acc.account_name_ar || acc.account_name_en}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Opening Balance (create only) */}
          {mode === "create" && (
            <div className="grid gap-2">
              <Label htmlFor="opening_balance">الرصيد الافتتاحي</Label>
              <Input
                id="opening_balance"
                type="number"
                step="0.01"
                placeholder="0.00"
                // The 'valueAsNumber: true' correctly registers the input as a number
                {...register("opening_balance", { valueAsNumber: true })}
              />
              {errors.opening_balance && (
                <p className="text-xs text-red-500">
                  {errors.opening_balance.message}
                </p>
              )}
            </div>
          )}

          {/* Description */}
          <div className="col-span-1 grid gap-2 md:col-span-2">
            <Label htmlFor="description">الوصف</Label>
            <Textarea
              id="description"
              placeholder="وصف تفصيلي للحساب..."
              rows={3}
              {...register("description")}
            />
          </div>

          {/* Allow Manual Entry */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2">
              <Checkbox
                id="allow_manual_entry"
                checked={watch("allow_manual_entry")}
                onCheckedChange={(checked) =>
                  setValue("allow_manual_entry", !!checked)
                }
              />
              <Label htmlFor="allow_manual_entry" className="cursor-pointer">
                السماح بإدخال قيود يدوية لهذا الحساب
              </Label>
            </div>
            <p className="mt-1 mr-6 text-xs text-gray-500">
              إذا كان غير مفعل، سيقبل الحساب فقط القيود التلقائية من المعاملات
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setOpen(false);
              reset();
            }}
          >
            إلغاء
          </Button>
          <Button type="submit">
            {mode === "create" ? "إنشاء الحساب" : "حفظ التغييرات"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
