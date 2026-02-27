"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { useState, useEffect } from "react";
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
import { Plus, Edit2, Sparkles, AlertCircle, Trash2 } from "lucide-react";
import {
  createAccount,
  updateAccounts,
  getParentAccounts,
} from "@/lib/actions/chartOfaccounts";
import { SelectField } from "@/components/common/selectproduct";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  SingleAccount,
  BulkFormValues,
  bulkAccountsSchema,
  singleAccountSchema,
} from "@/lib/zod/chartsOfaccounts";
import { useCompany } from "@/hooks/useCompany";

const DEFAULT_ACCOUNTS_TEMPLATE = [
  // ASSETS (1000-1999)
  {
    code: "1000",
    name: "الأصول",
    type: "ASSET",
    category: "OTHER_ASSETS",
    parent: null,
    level: 1,
  },
  {
    code: "1100",
    name: "الأصول المتداولة",
    type: "ASSET",
    category: "OTHER_CURRENT_ASSETS",
    parent: "1000",
    level: 2,
  },
  {
    code: "1110",
    name: "النقد",
    type: "ASSET",
    category: "CASH",
    parent: "1100",
    level: 3,
    allowManual: true,
  },
  {
    code: "1120",
    name: "البنوك",
    type: "ASSET",
    category: "BANK",
    parent: "1100",
    level: 3,
    allowManual: true,
  },
  {
    code: "1130",
    name: "الذمم المدينة",
    type: "ASSET",
    category: "ACCOUNTS_RECEIVABLE",
    parent: "1100",
    level: 3,
    allowManual: false,
  },
  {
    code: "1140",
    name: "المخزون",
    type: "ASSET",
    category: "INVENTORY",
    parent: "1100",
    level: 3,
    allowManual: false,
  },
  {
    code: "1200",
    name: "الأصول الثابتة",
    type: "ASSET",
    category: "FIXED_ASSETS",
    parent: "1000",
    level: 2,
  },
  {
    code: "1210",
    name: "المباني",
    type: "ASSET",
    category: "FIXED_ASSETS",
    parent: "1200",
    level: 3,
  },
  {
    code: "1220",
    name: "المعدات",
    type: "ASSET",
    category: "FIXED_ASSETS",
    parent: "1200",
    level: 3,
  },
  {
    code: "1230",
    name: "الأثاث",
    type: "ASSET",
    category: "FIXED_ASSETS",
    parent: "1200",
    level: 3,
  },

  // LIABILITIES (2000-2999)
  {
    code: "2000",
    name: "الخصوم",
    type: "LIABILITY",
    category: "OTHER_CURRENT_LIABILITIES",
    parent: null,
    level: 1,
  },
  {
    code: "2100",
    name: "الخصوم المتداولة",
    type: "LIABILITY",
    category: "OTHER_CURRENT_LIABILITIES",
    parent: "2000",
    level: 2,
  },
  {
    code: "2110",
    name: "الذمم الدائنة",
    type: "LIABILITY",
    category: "ACCOUNTS_PAYABLE",
    parent: "2100",
    level: 3,
    allowManual: false,
  },
  {
    code: "2130",
    name: "قروض قصيرة الأجل",
    type: "LIABILITY",
    category: "SHORT_TERM_LOANS",
    parent: "2100",
    level: 3,
  },
  {
    code: "2140",
    name: "ضريبة مبيعات مستحقة",
    type: "LIABILITY",
    category: "SALES_TAX_PAYABLE",
    parent: "2100",
    level: 3,
    allowManual: false,
  },
  {
    code: "2150",
    name: "رواتب مستحقة",
    type: "LIABILITY",
    category: "ACCRUED_EXPENSES",
    parent: "2100",
    level: 3,
    allowManual: false,
  },
  {
    code: "2200",
    name: "الخصوم طويلة الأجل",
    type: "LIABILITY",
    category: "LONG_TERM_LIABILITIES",
    parent: "2000",
    level: 2,
  },

  // EQUITY (3000-3999)
  {
    code: "3000",
    name: "حقوق الملكية",
    type: "EQUITY",
    category: "OWNER_EQUITY",
    parent: null,
    level: 1,
  },
  {
    code: "3100",
    name: "رأس المال",
    type: "EQUITY",
    category: "OWNER_EQUITY",
    parent: "3000",
    level: 2,
  },
  {
    code: "3200",
    name: "الأرباح المحتجزة",
    type: "EQUITY",
    category: "RETAINED_EARNINGS",
    parent: "3000",
    level: 2,
    allowManual: false,
  },
  {
    code: "3300",
    name: "المسحوبات",
    type: "EQUITY",
    category: "DRAWINGS",
    parent: "3000",
    level: 2,
  },

  // REVENUE (4000-4999)
  {
    code: "4000",
    name: "الإيرادات",
    type: "REVENUE",
    category: "SALES_REVENUE",
    parent: null,
    level: 1,
  },
  {
    code: "4100",
    name: "إيرادات المبيعات",
    type: "REVENUE",
    category: "SALES_REVENUE",
    parent: "4000",
    level: 2,
    allowManual: false,
  },
  {
    code: "4200",
    name: "إيرادات الخدمات",
    type: "REVENUE",
    category: "SERVICE_REVENUE",
    parent: "4000",
    level: 2,
    allowManual: false,
  },
  {
    code: "4300",
    name: "إيرادات أخرى",
    type: "REVENUE",
    category: "OTHER_INCOME",
    parent: "4000",
    level: 2,
  },

  // EXPENSES (5000-5999)
  {
    code: "5000",
    name: "المصروفات",
    type: "EXPENSE",
    category: "OPERATING_EXPENSES",
    parent: null,
    level: 1,
  },
  {
    code: "5100",
    name: "تكلفة البضاعة المباعة",
    type: "EXPENSE",
    category: "COST_OF_GOODS_SOLD",
    parent: "5000",
    level: 2,
    allowManual: false,
  },
  {
    code: "5200",
    name: "مصاريف التشغيل",
    type: "EXPENSE",
    category: "OPERATING_EXPENSES",
    parent: "5000",
    level: 2,
  },
  {
    code: "5210",
    name: "الإيجار",
    type: "EXPENSE",
    category: "OPERATING_EXPENSES",
    parent: "5200",
    level: 3,
  },
  {
    code: "5220",
    name: "الكهرباء والماء",
    type: "EXPENSE",
    category: "OPERATING_EXPENSES",
    parent: "5200",
    level: 3,
  },
  {
    code: "5230",
    name: "الاتصالات",
    type: "EXPENSE",
    category: "OPERATING_EXPENSES",
    parent: "5200",
    level: 3,
  },
  {
    code: "5300",
    name: "مصاريف الرواتب",
    type: "EXPENSE",
    category: "PAYROLL_EXPENSES",
    parent: "5000",
    level: 2,
    allowManual: false,
  },
  {
    code: "5400",
    name: "مصاريف إدارية",
    type: "EXPENSE",
    category: "ADMINISTRATIVE_EXPENSES",
    parent: "5000",
    level: 2,
  },
  {
    code: "5500",
    name: "مصاريف أخرى",
    type: "EXPENSE",
    category: "OTHER_EXPENSES",
    parent: "5000",
    level: 2,
  },
];

type ParentAccount = {
  id: string;
  account_code: string;
  account_name_en: string;
  account_name_ar: string | null;
  currency_code: string | null;
  level: number | null;
  account_type: string | null;
};

interface AccountFormDialogProps {
  mode: "create" | "edit";
  account?: Partial<SingleAccount> & { id?: string };
  companyBaseCurrency?: string;
  onSuccess?: () => void;
}

export default function AccountFormDialog({
  mode,
  account,
  companyBaseCurrency = "YER",
  onSuccess,
}: AccountFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
  const [isLoadingParents, setIsLoadingParents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const { company } = useCompany();

  const currencyOptions = [
    { name: "الريال اليمني (YER)", id: "YER" },
    { name: "الدولار الأمريكي (USD)", id: "USD" },
    { name: "الريال السعودي (SAR)", id: "SAR" },
    { name: "اليورو (EUR)", id: "EUR" },
    { name: "الدينار الكويتي (KWD)", id: "KWD" },
  ];

  const accountTypes = [
    { id: "ASSET", name: "أصول" },
    { id: "LIABILITY", name: "خصوم" },
    { id: "EQUITY", name: "حقوق ملكية" },
    { id: "REVENUE", name: "إيرادات" },
    { id: "EXPENSE", name: "مصروفات" },
  ];

  const accountCategories = [
    { id: "CASH", name: "نقد", type: "ASSET" },
    { id: "BANK", name: "بنوك", type: "ASSET" },
    { id: "ACCOUNTS_RECEIVABLE", name: "ذمم مدينة", type: "ASSET" },
    { id: "INVENTORY", name: "مخزون", type: "ASSET" },
    { id: "FIXED_ASSETS", name: "أصول ثابتة", type: "ASSET" },
    { id: "OTHER_CURRENT_ASSETS", name: "أصول متداولة أخرى", type: "ASSET" },
    { id: "OTHER_ASSETS", name: "أصول أخرى", type: "ASSET" },
    { id: "ACCOUNTS_PAYABLE", name: "ذمم دائنة", type: "LIABILITY" },
    { id: "CREDIT_CARD", name: "بطاقة ائتمان", type: "LIABILITY" },
    { id: "SHORT_TERM_LOANS", name: "قروض قصيرة الأجل", type: "LIABILITY" },
    { id: "SALES_TAX_PAYABLE", name: "ضريبة مبيعات مستحقة", type: "LIABILITY" },
    { id: "ACCRUED_EXPENSES", name: "مصاريف مستحقة", type: "LIABILITY" },
    {
      id: "OTHER_CURRENT_LIABILITIES",
      name: "خصوم متداولة أخرى",
      type: "LIABILITY",
    },
    {
      id: "LONG_TERM_LIABILITIES",
      name: "خصوم طويلة الأجل",
      type: "LIABILITY",
    },
    { id: "OWNER_EQUITY", name: "رأس المال", type: "EQUITY" },
    { id: "RETAINED_EARNINGS", name: "أرباح محتجزة", type: "EQUITY" },
    { id: "DRAWINGS", name: "مسحوبات", type: "EQUITY" },
    { id: "SALES_REVENUE", name: "إيرادات مبيعات", type: "REVENUE" },
    { id: "SERVICE_REVENUE", name: "إيرادات خدمات", type: "REVENUE" },
    { id: "OTHER_INCOME", name: "إيرادات أخرى", type: "REVENUE" },
    {
      id: "COST_OF_GOODS_SOLD",
      name: "تكلفة البضاعة المباعة",
      type: "EXPENSE",
    },
    { id: "OPERATING_EXPENSES", name: "مصاريف تشغيلية", type: "EXPENSE" },
    { id: "PAYROLL_EXPENSES", name: "مصاريف رواتب", type: "EXPENSE" },
    { id: "ADMINISTRATIVE_EXPENSES", name: "مصاريف إدارية", type: "EXPENSE" },
    { id: "OTHER_EXPENSES", name: "مصاريف أخرى", type: "EXPENSE" },
  ];

  // Form for bulk mode - FIX: Use Controller for better performance
  const {
    control,
    handleSubmit,
    reset: resetBulk,
  } = useForm<BulkFormValues>({
    resolver: zodResolver(bulkAccountsSchema),
    defaultValues: {
      accounts: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "accounts",
  });

  // Form for single mode
  const {
    register,
    handleSubmit: handleSingleSubmit,
    reset: resetSingle,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SingleAccount>({
    resolver: zodResolver(singleAccountSchema),
    defaultValues: {
      account_code: "",
      account_name_en: "",
      account_name_ar: "",
      account_type: "ASSET",
      account_category: "CASH",
      parent_id: "",
      description: "",
      currency_code: null,
      opening_balance: 0,
      allow_manual_entry: true,
    },
  });

  // Fetch parent accounts
  useEffect(() => {
    if (!open) return;

    async function fetchParents() {
      setIsLoadingParents(true);
      try {
        const result = await getParentAccounts();
        setParentAccounts(result?.data || []);
      } catch (error) {
        console.error("Error fetching parents:", error);
        toast.error("فشل في تحميل الحسابات الرئيسية");
      } finally {
        setIsLoadingParents(false);
      }
    }

    fetchParents();
  }, [open]);

  // Load account data for edit mode
  useEffect(() => {
    if (mode === "edit" && account && open) {
      setIsBulkMode(false);
      resetSingle({
        account_code: account.account_code ?? "",
        account_name_en: account.account_name_en ?? "",
        account_name_ar: account.account_name_ar ?? "",
        account_type: account.account_type ?? "ASSET",
        account_category: account.account_category ?? "CASH",
        parent_id: account.parent_id ?? "",
        description: account.description ?? "",
        currency_code: account.currency_code ?? null,
        opening_balance: Number(account.opening_balance ?? 0),
        allow_manual_entry: account.allow_manual_entry ?? true,
      });
    }
  }, [mode, account, open, resetSingle]);

  // Load default accounts template
  const loadDefaultTemplate = () => {
    const formattedAccounts = DEFAULT_ACCOUNTS_TEMPLATE.map((acc: any) => ({
      account_code: acc.code,
      account_name_en: acc.name,
      account_name_ar: acc.name,
      account_type: acc.type,
      account_category: acc.category,
      parent_id: acc.parent ?? "",
      description: "",
      currency_code: null,
      opening_balance: 0,
      allow_manual_entry: acc.allowManual ?? true,
      level: acc.level,
    }));

    resetBulk({ accounts: formattedAccounts });
    setIsBulkMode(true);
    toast.success(
      `تم تحميل ${formattedAccounts.length} حساب افتراضي. يمكنك تعديلهم الآن`,
    );
  };

  // Currency validation
  const getValidationMessage = (acc: SingleAccount) => {
    if (!acc.parent_id) {
      if (acc.currency_code && acc.currency_code !== companyBaseCurrency) {
        return {
          type: "error",
          message: `الحسابات الرئيسية يجب أن تستخدم العملة الأساسية (${companyBaseCurrency})`,
        };
      }
    } else {
      const parent = parentAccounts.find((p) => p.id === acc.parent_id);
      if (parent?.currency_code && acc.currency_code !== parent.currency_code) {
        return {
          type: "error",
          message: `يجب مطابقة عملة الحساب الأب (${parent.currency_code})`,
        };
      }
    }
    return null;
  };

  // Single account submit
  const onSingleSubmit = async (data: SingleAccount) => {
    const validationMsg = getValidationMessage(data);
    if (validationMsg?.type === "error") {
      toast.error(validationMsg.message);
      return;
    }

    try {
      setIsSubmitting(true);
      let result;

      if (mode === "create") {
        result = await createAccount({
          ...data,
          parent_id: data.parent_id || undefined,
        });
      } else if (mode === "edit" && account?.id) {
        result = await updateAccounts(account.id, {
          ...data,
          parent_id: data.parent_id || undefined,
        });
      }

      if (!result?.success) {
        toast.error(result?.error || "حدث خطأ أثناء حفظ الحساب");
        return;
      }

      toast.success(result.message);
      setOpen(false);
      resetSingle();
      onSuccess?.();
    } catch (error) {
      console.error("Submit error:", error);
      toast.error("حدث خطأ أثناء حفظ الحساب");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Bulk accounts submit
  const onBulkSubmit = async (data: BulkFormValues) => {
    try {
      setIsSubmitting(true);

      // Validate all accounts
      for (const acc of data.accounts) {
        const validationMsg = getValidationMessage(acc);
        if (validationMsg?.type === "error") {
          toast.error(`${acc.account_code}: ${validationMsg.message}`);
          setIsSubmitting(false);
          return;
        }
      }

      // Create accounts sequentially
      const results = [];
      for (const acc of data.accounts) {
        const result = await createAccount({
          ...acc,
          parent_id: acc.parent_id || undefined,
          branchId: company?.branches[0]?.id ?? "",
          currency: company?.base_currency ?? "",
        });
        results.push(result);
        if (!result?.success) {
          toast.error(`فشل في إنشاء ${acc.account_code}: ${result?.error}`);
        }
      }

      const successCount = results.filter((r) => r?.success).length;
      const failCount = results.length - successCount;

      if (successCount > 0) {
        toast.success(
          `تم إنشاء ${successCount} حساب بنجاح${failCount > 0 ? ` (فشل ${failCount})` : ""}`,
        );
        setOpen(false);
        resetBulk({ accounts: [] });
        setIsBulkMode(false);
        onSuccess?.();
      }
    } catch (error) {
      console.error("Bulk submit error:", error);
      toast.error("حدث خطأ أثناء حفظ الحسابات");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEmptyAccount = () => {
    append({
      account_code: "",
      account_name_en: "",
      account_name_ar: "",
      account_type: "ASSET",
      account_category: "CASH",
      parent_id: "",
      description: "",
      currency_code: null,
      opening_balance: 0,
      allow_manual_entry: true,
      level: 1,
    });
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          setIsBulkMode(false);
          resetSingle();
          resetBulk({ accounts: [] });
        }
      }}
      btnLabl={
        mode === "create" ? (
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            إضافة حساب جديد
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Edit2 className="h-4 w-4" />
          </Button>
        )
      }
      style="sm:max-w-6xl max-h-[90vh]"
      titel={
        isBulkMode
          ? "إضافة حسابات متعددة"
          : mode === "create"
            ? "إضافة حساب جديد"
            : "تعديل الحساب"
      }
    >
      <div className="space-y-4" dir="rtl">
        {/* Mode Toggle & Default Template Button */}
        {mode === "create" && (
          <div className="flex items-center justify-between gap-4 border-b pb-4">
            <Alert className="flex-1 border-blue-200">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <AlertDescription className="flex items-center justify-between">
                <span className="text-sm text-blue-900">
                  هل تحتاج إلى مساعدة؟ قم بتحميل القالب الافتراضي وعدّله حسب
                  حاجتك
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={loadDefaultTemplate}
                  disabled={isSubmitting}
                  className="border-blue-300 text-blue-700"
                >
                  <Sparkles className="ml-2 h-4 w-4" />
                  تحميل القالب الافتراضي
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Bulk Mode */}
        {isBulkMode ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">
                  {fields.length} حساب جاهز للمراجعة
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEmptyAccount}
                >
                  <Plus className="ml-2 h-4 w-4" />
                  إضافة حساب
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsBulkMode(false);
                  resetBulk({ accounts: [] });
                }}
              >
                الرجوع للوضع الفردي
              </Button>
            </div>

            <ScrollArea className="h-[500px] rounded-md border p-4">
              <div className="space-y-4">
                {fields.map((field, index) => {
                  const filteredCategories = accountCategories.filter(
                    (cat) => cat.type === field.account_type,
                  );

                  return (
                    <div
                      key={field.id}
                      className="space-y-3 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-blue-600">
                            {field.account_code}
                          </span>
                          <span className="text-sm text-gray-500">
                            {field.account_name_en}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => remove(index)}
                          className="hover: text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {/* Account Code - Using Controller */}
                        <div>
                          <Label className="text-xs">رمز الحساب</Label>
                          <Controller
                            name={`accounts.${index}.account_code`}
                            control={control}
                            render={({ field }) => (
                              <Input {...field} className="h-8 text-sm" />
                            )}
                          />
                        </div>

                        {/* Account Name - Using Controller */}
                        <div>
                          <Label className="text-xs">اسم الحساب</Label>
                          <Controller
                            name={`accounts.${index}.account_name_en`}
                            control={control}
                            render={({ field }) => (
                              <Input {...field} className="h-8 text-sm" />
                            )}
                          />
                        </div>

                        {/* Account Type */}
                        <div>
                          <Label className="text-xs">النوع</Label>
                          <Controller
                            name={`accounts.${index}.account_type`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {accountTypes.map((t) => (
                                    <SelectItem key={t.id} value={t.id}>
                                      {t.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* Category */}
                        <div>
                          <Label className="text-xs">الفئة</Label>
                          <Controller
                            name={`accounts.${index}.account_category`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {filteredCategories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* Currency */}
                        <div>
                          <Label className="text-xs">العملة</Label>
                          <Controller
                            name={`accounts.${index}.currency_code`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value || "none"}
                                onValueChange={(v) =>
                                  field.onChange(v === "none" ? null : v)
                                }
                              >
                                <SelectTrigger className="h-8 text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">لا عملة</SelectItem>
                                  {currencyOptions.map((curr) => (
                                    <SelectItem key={curr.id} value={curr.id}>
                                      {curr.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </div>

                        {/* Opening Balance */}
                        <div>
                          <Label className="text-xs">الرصيد الافتتاحي</Label>
                          <Controller
                            name={`accounts.${index}.opening_balance`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="h-8 text-sm"
                              />
                            )}
                          />
                        </div>

                        {/* Level */}
                        <div>
                          <Label className="text-xs">مستوى الحساب</Label>
                          <Controller
                            name={`accounts.${index}.level`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 1)
                                }
                                className="h-8 text-sm"
                              />
                            )}
                          />
                        </div>

                        {/* Parent ID */}
                        <div>
                          <Label className="text-xs">كود الحساب الأب</Label>
                          <Controller
                            name={`accounts.${index}.parent_id`}
                            control={control}
                            render={({ field }) => (
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseInt(e.target.value) || 1)
                                }
                                className="h-8 text-sm"
                              />
                            )}
                          />
                        </div>
                        {/* Allow Manual Entry */}
                        <div className="flex items-center gap-2">
                          <Controller
                            name={`accounts.${index}.allow_manual_entry`}
                            control={control}
                            render={({ field }) => (
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            )}
                          />
                          <Label className="cursor-pointer text-xs">
                            السماح بإدخال قيود يدوية
                          </Label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setIsBulkMode(false);
                  resetBulk({ accounts: [] });
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSubmit(onBulkSubmit)}
                disabled={isSubmitting || fields.length === 0}
              >
                {isSubmitting ? "جاري الحفظ..." : `إنشاء ${fields.length} حساب`}
              </Button>
            </div>
          </div>
        ) : (
          /* Single Mode Form */
          <div className="space-y-6">
            {getValidationMessage(watch()) && (
              <Alert className="border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900">
                  {getValidationMessage(watch())?.message}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="account_code">رمز الحساب *</Label>
                <Input
                  id="account_code"
                  placeholder="مثال: 1011"
                  {...register("account_code")}
                />
                {errors.account_code && (
                  <p className="text-xs text-red-500">
                    {errors.account_code.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>نوع الحساب *</Label>
                <SelectField
                  value={watch("account_type")}
                  action={(value: string) =>
                    setValue("account_type", value as any)
                  }
                  placeholder="اختر نوع الحساب"
                  options={accountTypes}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="account_name_en">اسم الحساب *</Label>
                <Input
                  id="account_name_en"
                  placeholder="مثال: النقد في الصندوق"
                  {...register("account_name_en")}
                />
                {errors.account_name_en && (
                  <p className="text-xs text-red-500">
                    {errors.account_name_en.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label>الفئة *</Label>
                <SelectField
                  options={accountCategories.filter(
                    (cat) => cat.type === watch("account_type"),
                  )}
                  value={watch("account_category")}
                  action={(value: string) =>
                    setValue("account_category", value)
                  }
                  placeholder="اختر الفئة"
                />
              </div>

              <div className="grid gap-2">
                <Label>الحساب الأب</Label>
                <Select
                  value={watch("parent_id") || "none"}
                  onValueChange={(value) =>
                    setValue("parent_id", value === "none" ? "" : value)
                  }
                  disabled={isLoadingParents}
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
                    <SelectItem value="none">لا يوجد (حساب رئيسي)</SelectItem>
                    {parentAccounts
                      .filter((p) => p.account_type === watch("account_type"))
                      .map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.account_code} -{" "}
                          {acc.account_name_ar || acc.account_name_en}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>العملة</Label>
                <Select
                  value={watch("currency_code") || "none"}
                  onValueChange={(value) =>
                    setValue("currency_code", value === "none" ? null : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="لا عملة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">لا عملة</SelectItem>
                    {currencyOptions.map((curr) => (
                      <SelectItem key={curr.id} value={curr.id}>
                        {curr.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {mode === "create" && (
                <div className="grid gap-2">
                  <Label htmlFor="opening_balance">الرصيد الافتتاحي</Label>
                  <Input
                    id="opening_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register("opening_balance", { valueAsNumber: true })}
                  />
                  <p className="text-xs text-gray-500">
                    سيتم إنشاء قيد افتتاحي تلقائياً إذا كان الرصيد غير صفر
                  </p>
                </div>
              )}

              <div className="col-span-1 grid gap-2 md:col-span-2">
                <Label htmlFor="description">الوصف</Label>
                <Textarea
                  id="description"
                  placeholder="وصف تفصيلي للحساب..."
                  rows={3}
                  {...register("description")}
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="allow_manual_entry"
                    checked={watch("allow_manual_entry")}
                    onCheckedChange={(checked) =>
                      setValue("allow_manual_entry", !!checked)
                    }
                  />
                  <Label
                    htmlFor="allow_manual_entry"
                    className="cursor-pointer"
                  >
                    السماح بإدخال قيود يدوية لهذا الحساب
                  </Label>
                </div>
                <p className="mt-1 mr-6 text-xs text-gray-500">
                  إذا كان غير مفعل، سيقبل الحساب فقط القيود التلقائية من
                  المعاملات
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetSingle();
                }}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleSingleSubmit(onSingleSubmit)}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "جاري الحفظ..."
                  : mode === "create"
                    ? "إنشاء الحساب"
                    : "حفظ التغييرات"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dailogreuse>
  );
}
