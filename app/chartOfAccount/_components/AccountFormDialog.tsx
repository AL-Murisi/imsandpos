// "use client";

// import { zodResolver } from "@hookform/resolvers/zod";
// import { SubmitHandler, useForm, Resolver } from "react-hook-form";
// import { z } from "zod";
// import { useState, useEffect } from "react"; // ⬅️ Added useEffect
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Textarea } from "@/components/ui/textarea";
// import { Checkbox } from "@/components/ui/checkbox";
// import { toast } from "sonner";
// import Dailogreuse from "@/components/common/dailogreuse";
// import { Plus, Edit2 } from "lucide-react";
// import { createAccount, updateAccount } from "@/lib/actions/chartOfaccounts";

// // --------------------
// // Mock/Placeholder for getParentAccounts
// // ⚠️ You need to replace this with your actual implementation.
// // For example, if it's a server action, import it from the actions file.
// // --------------------
// // Assuming this is your actual action
// import { getParentAccounts } from "@/lib/actions/chartOfaccounts";
// import { SelectField } from "@/components/common/selectproduct";

// // --------------------
// // Schema
// // --------------------
// // FIX Zod schema to guarantee boolean (no change needed here, your boolean check is fine)

// const accountFormSchema = z.object({
//   account_code: z.string().min(1, "رمز الحساب مطلوب"),
//   account_name_en: z.string().min(1, "اسم الحساب بالإنجليزية مطلوب"),
//   account_name_ar: z.string().optional(),
//   account_type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
//   account_category: z.string().min(1, "فئة الحساب مطلوبة"),
//   parent_id: z.string().optional(),
//   description: z.string().optional(),
//   currency_code: z.enum(["YER", "USD", "SAR", "EUR", "KWD"]),

//   // Preprocess ensures this is always a number (You might want to ensure it's a valid number input)
//   opening_balance: z.number().int().nonnegative(),

//   // Ensure boolean is always returned
//   allow_manual_entry: z.boolean().default(true).optional(),
// });

// type FormValues = z.infer<typeof accountFormSchema>;

// // --------------------
// // Types
// // --------------------
// // Define the type for a parent account explicitly
// type ParentAccount = {
//   id: string;
//   account_code: string;
//   account_name_ar: string | null;
//   account_name_en: string;
// };

// interface AccountFormDialogProps {
//   mode: "create" | "edit";
//   account?: Partial<FormValues> & { id?: string };
// }

// // --------------------
// // Component
// // --------------------
// export default function AccountFormDialog({
//   mode,
//   account,
// }: AccountFormDialogProps) {
//   const [open, setOpen] = useState(false);
//   const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]); // ⬅️ State for parent accounts
//   const [isLoadingParents, setIsLoadingParents] = useState(true); // ⬅️ Loading state
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   // ----------- const [isSubmitting, setIsSubmitting] = useState(false);---------
//   // Data Fetching with useEffect
//   // --------------------
//   useEffect(() => {
//     if (!open) return;
//     async function fetchParentData() {
//       setIsLoadingParents(true);
//       try {
//         // ⚠️ Assuming getParentAccounts() returns an object with a 'data' array
//         const result = await getParentAccounts();
//         if (result && result.data) {
//           setParentAccounts(result.data);
//         } else {
//           setParentAccounts([]);
//           toast.error("فشل في تحميل الحسابات الرئيسية");
//         }
//       } catch (error) {
//         console.error("Error fetching parent accounts:", error);
//         toast.error("خطأ في الاتصال لتحميل الحسابات الرئيسية");
//       } finally {
//         setIsLoadingParents(false);
//       }
//     }

//     // Only fetch when the dialog is open for the first time or if the data needs refreshing
//     if (open && parentAccounts.length === 0) {
//       fetchParentData();
//     }
//     // Alternatively, fetch every time the dialog opens:
//     // if (open) { fetchParentData(); }
//   }, [open]); // ⬅️ Run when the dialog opens/closes

//   // Resolver typed explicitly
//   const resolver: Resolver<FormValues> = zodResolver(accountFormSchema);

//   const {
//     register,
//     handleSubmit,
//     reset,
//     setValue,
//     watch,
//     formState: { errors },
//   } = useForm<FormValues>({
//     resolver,
//     defaultValues:
//       mode === "edit" && account
//         ? {
//             account_code: account.account_code ?? "",
//             account_name_en: account.account_name_en ?? "",
//             account_name_ar: account.account_name_ar ?? "",
//             account_type: account.account_type ?? "ASSET",
//             account_category: account.account_category ?? "CASH_AND_BANK",
//             parent_id: account.parent_id ?? "",
//             // Use Number() conversion for the input field to be pre-filled correctly
//             opening_balance: Number(account.opening_balance ?? 0),
//             description: account.description ?? "",
//             allow_manual_entry: account.allow_manual_entry ?? true,
//           }
//         : {
//             account_code: account?.account_code ?? "",
//             account_name_en: account?.account_name_en ?? "",
//             account_name_ar: account?.account_name_ar ?? "",
//             account_type: account?.account_type ?? "ASSET",
//             account_category: account?.account_category ?? "CASH_AND_BANK",
//             parent_id: account?.parent_id ?? "",
//             opening_balance: account?.opening_balance ?? 0,
//             description: account?.description ?? "",
//             allow_manual_entry: account?.allow_manual_entry ?? true,
//           },
//   });

//   const selectedType = watch("account_type");

//   const accountTypes = [
//     { id: "ASSET", name: "أصول" },
//     { id: "LIABILITY", name: "خصوم" },
//     { id: "EQUITY", name: "حقوق ملكية" },
//     { id: "REVENUE", name: "إيرادات" },
//     { id: "EXPENSE", name: "مصروفات" },
//     // { value: "COST_OF_GOODS", label: "تكلفة البضاعة" },
//   ];

//   // ... (accountCategories array is unchanged)
//   const accountCategories = [
//     { id: "CASH", name: "نقد", type: "ASSET" },
//     { id: "BANK", name: "بنوك", type: "ASSET" },
//     { id: "ACCOUNTS_RECEIVABLE", name: "ذمم مدينة", type: "ASSET" },
//     { id: "INVENTORY", name: "مخزون", type: "ASSET" },
//     { id: "FIXED_ASSETS", name: "أصول ثابتة", type: "ASSET" },
//     { id: "ACCUMULATED_DEPRECIATION", name: "مجمع استهلاك", type: "ASSET" },
//     {
//       id: "OTHER_CURRENT_ASSETS",
//       name: "أصول متداولة أخرى",
//       type: "ASSET",
//     },
//     { id: "OTHER_ASSETS", name: "أصول أخرى", type: "ASSET" },
//     { id: "ACCOUNTS_PAYABLE", name: "ذمم دائنة", type: "LIABILITY" },
//     { id: "CREDIT_CARD", name: "بطاقة ائتمان", type: "LIABILITY" },
//     { id: "SHORT_TERM_LOANS", name: "قروض قصيرة الأجل", type: "LIABILITY" },
//     {
//       id: "SALES_TAX_PAYABLE",
//       name: "ضريبة مبيعات مستحقة",
//       type: "LIABILITY",
//     },
//     { id: "ACCRUED_EXPENSES", name: "مصاريف مستحقة", type: "LIABILITY" },
//     {
//       id: "OTHER_CURRENT_LIABILITIES",
//       name: "خصوم متداولة أخرى",
//       type: "LIABILITY",
//     },
//     {
//       id: "LONG_TERM_LIABILITIES",
//       name: "خصوم طويلة الأجل",
//       type: "LIABILITY",
//     },
//     { id: "OWNER_EQUITY", name: "رأس المال", type: "EQUITY" },
//     { id: "RETAINED_EARNINGS", name: "أرباح محتجزة", type: "EQUITY" },
//     { id: "DRAWINGS", name: "مسحوبات", type: "EQUITY" },
//     { id: "SALES_REVENUE", name: "إيرادات مبيعات", type: "REVENUE" },
//     { id: "SERVICE_REVENUE", name: "إيرادات خدمات", type: "REVENUE" },
//     { id: "OTHER_INCOME", name: "إيرادات أخرى", type: "REVENUE" },

//     {
//       id: "COST_OF_GOODS_SOLD",
//       name: "تكلفة البضاعة المباعة",
//       type: "EXPENSE",
//     },
//     { id: "OPERATING_EXPENSES", name: "مصاريف تشغيلية", type: "EXPENSE" },
//     { id: "PAYROLL_EXPENSES", name: "مصاريف رواتب", type: "EXPENSE" },
//     {
//       id: "ADMINISTRATIVE_EXPENSES",
//       name: "مصاريف إدارية",
//       type: "EXPENSE",
//     },
//     { id: "OTHER_EXPENSES", name: "مصاريف أخرى", type: "EXPENSE" },
//     { id: "HOUSE_EXPENSES", name: "مصاريف منزلية", type: "EXPENSE" },
//   ];
//   // ...

//   const filteredCategories = accountCategories.filter(
//     (cat) => cat.type === selectedType,
//   );

//   const onSubmit: SubmitHandler<FormValues> = async (data) => {
//     try {
//       setIsSubmitting(true);
//       let result;

//       if (mode === "create") {
//         result = await createAccount(data);
//       } else if (mode === "edit" && account?.id) {
//         result = await updateAccount(account.id, data);
//       } else {
//         toast.error("معرّف الحساب مفقود");
//         setIsSubmitting(false);
//         return;
//       }

//       if (!result?.success) {
//         setIsSubmitting(false);
//         toast.error(result?.error || "حدث خطأ أثناء حفظ الحساب");
//         return;
//       }

//       toast.success(result.message);
//       setOpen(false);
//       reset();
//     } catch (error) {
//       setIsSubmitting(false);
//       console.error("❌ Error:", error);
//       toast.error("حدث خطأ أثناء حفظ الحساب");
//     }
//   };
//   const currencyOptions = [
//     { name: "الريال اليمني (YER)", id: "YER" },
//     { name: "الدولار الأمريكي (USD)", id: "USD" },
//     { name: "الريال السعودي (SAR)", id: "SAR" },
//     { name: "اليورو (EUR)", id: "EUR" },
//     { name: "الدينار الكويتي (KWD)", id: "KWD" },
//   ];

//   return (
//     <Dailogreuse
//       open={open}
//       setOpen={setOpen}
//       btnLabl={
//         mode === "create" ? (
//           <div className="flex items-center gap-2">
//             <Plus className="h-4 w-4" />
//             إضافة حساب جديد
//           </div>
//         ) : (
//           <Button
//             variant="ghost"
//             size="sm"
//             className="h-8 w-8 p-0 text-blue-600 hover:"
//           >
//             <Edit2 className="h-4 w-4" />
//           </Button>
//         )
//       }
//       style="sm:max-w-3xl"
//       titel={mode === "create" ? "إضافة حساب جديد" : "تعديل الحساب"}
//     >
//       <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
//         <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//           {/* ... (Your other form fields - Account Code, Type, Names, Category - are here) ... */}
//           {/* Account Code */}
//           <div className="grid gap-2">
//             <Label htmlFor="account_code">رمز الحساب *</Label>
//             <Input
//               id="account_code"
//               type="text"
//               placeholder="مثال: 1011"
//               {...register("account_code")}
//             />
//             {errors.account_code && (
//               <p className="text-xs text-red-500">
//                 {errors.account_code.message}
//               </p>
//             )}
//           </div>
//           {/* Account Type */}
//           <div className="grid gap-2">
//             <Label htmlFor="account_type">نوع الحساب *</Label>

//             <SelectField
//               value={watch("account_type")}
//               action={(value: string) =>
//                 setValue(
//                   "account_type",
//                   value as
//                     | "ASSET"
//                     | "LIABILITY"
//                     | "EQUITY"
//                     | "REVENUE"
//                     | "EXPENSE",
//                 )
//               }
//               placeholder="اختر نوع الحساب"
//               options={accountTypes}
//             />
//             {errors.account_type && (
//               <p className="text-xs text-red-500">
//                 {errors.account_type.message}
//               </p>
//             )}
//           </div>
//           {/* Account Name (English) */}
//           <div className="grid gap-2">
//             <Label htmlFor="account_name_en">اسم الحساب (عربي)</Label>
//             <Input
//               id="account_name_en"
//               type="text"
//               placeholder="Cash on Hand"
//               {...register("account_name_en")}
//             />
//             {errors.account_name_en && (
//               <p className="text-xs text-red-500">
//                 {errors.account_name_en.message}
//               </p>
//             )}
//           </div>
//           {/* Account Name (Arabic) */}
//           {/* <div className="grid gap-2">
//             <Label htmlFor="account_name_ar">اسم الحساب (عربي)</Label>
//            <Input
//               id="account_name_ar"
//               type="text"
//               placeholder="النقد في الصندوق"
//               {...register("account_name_ar")}
//             />
//           </div> */}
//           {/* Category */}
//           <div className="grid gap-2">
//             <Label htmlFor="account_category">الفئة *</Label>
//             <SelectField
//               options={filteredCategories}
//               value={watch("account_category")}
//               action={(value: string) => setValue("account_category", value)}
//               placeholder="اختر الفئة"
//             />

//             {errors.account_category && (
//               <p className="text-xs text-red-500">
//                 {errors.account_category.message}
//               </p>
//             )}
//           </div>
//           {/* Parent Account */}
//           <div className="grid gap-2">
//             <Label htmlFor="parent_id">الحساب الرئيسي</Label>
//             <Select
//               value={watch("parent_id")}
//               onValueChange={(value: string) => setValue("parent_id", value)}
//               disabled={isLoadingParents} // ⬅️ Disable while loading
//             >
//               <SelectTrigger>
//                 <SelectValue
//                   placeholder={
//                     isLoadingParents
//                       ? "جاري التحميل..."
//                       : "لا يوجد (حساب رئيسي)"
//                   }
//                 />
//               </SelectTrigger>
//               <SelectContent>
//                 {/* ⬅️ Fallback/Loading message for SelectContent */}
//                 {isLoadingParents ? (
//                   <SelectItem value="s" disabled>
//                     جاري تحميل الحسابات...
//                   </SelectItem>
//                 ) : (
//                   parentAccounts.map((acc) => (
//                     <SelectItem key={acc.id} value={acc.id}>
//                       {acc.account_code} -{" "}
//                       {acc.account_name_ar || acc.account_name_en}
//                     </SelectItem>
//                   ))
//                 )}
//               </SelectContent>
//             </Select>
//           </div>{" "}
//           <div className="grid gap-2">
//             <Label htmlFor="currency_code">العملة </Label>
//             <SelectField
//               options={currencyOptions}
//               value={watch("currency_code")}
//               action={(value: string) =>
//                 setValue(
//                   "currency_code",
//                   value as "YER" | "USD" | "SAR" | "EUR" | "KWD",
//                 )
//               }
//               placeholder="اختر العملة"
//             />
//           </div>
//           {/* Opening Balance (create only) */}
//           {mode === "create" && (
//             <div className="grid gap-2">
//               <Label htmlFor="opening_balance">الرصيد الافتتاحي</Label>
//               <Input
//                 id="opening_balance"
//                 type="number"
//                 step="0.01"
//                 placeholder="0.00"
//                 // The 'valueAsNumber: true' correctly registers the input as a number
//                 {...register("opening_balance", { valueAsNumber: true })}
//               />
//               {errors.opening_balance && (
//                 <p className="text-xs text-red-500">
//                   {errors.opening_balance.message}
//                 </p>
//               )}
//             </div>
//           )}
//           {/* Description */}
//           <div className="col-span-1 grid gap-2 md:col-span-2">
//             <Label htmlFor="description">الوصف</Label>
//             <Textarea
//               id="description"
//               placeholder="وصف تفصيلي للحساب..."
//               rows={3}
//               {...register("description")}
//             />
//           </div>
//           {/* Allow Manual Entry */}
//           <div className="col-span-1 md:col-span-2">
//             <div className="flex items-center gap-2">
//               <Checkbox
//                 id="allow_manual_entry"
//                 checked={watch("allow_manual_entry")}
//                 onCheckedChange={(checked) =>
//                   setValue("allow_manual_entry", !!checked)
//                 }
//               />
//               <Label htmlFor="allow_manual_entry" className="cursor-pointer">
//                 السماح بإدخال قيود يدوية لهذا الحساب
//               </Label>
//             </div>
//             <p className="mt-1 mr-6 text-xs text-gray-500">
//               إذا كان غير مفعل، سيقبل الحساب فقط القيود التلقائية من المعاملات
//             </p>
//           </div>
//         </div>

//         {/* Action Buttons */}
//         <div className="flex justify-end gap-3 border-t pt-4">
//           <Button
//             type="button"
//             variant="outline"
//             onClick={() => {
//               setOpen(false);
//               reset();
//             }}
//           >
//             إلغاء
//           </Button>
//           <Button type="submit" disabled={isSubmitting}>
//             {mode === "create" ? "إنشاء الحساب" : "حفظ التغييرات"}
//           </Button>
//         </div>
//       </form>
//     </Dailogreuse>
//   );
// }
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { SubmitHandler, useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
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
import { Plus, Edit2, X, AlertCircle } from "lucide-react";
import {
  createAccount,
  updateAccounts,
  getParentAccounts,
} from "@/lib/actions/chartOfaccounts";
import { SelectField } from "@/components/common/selectproduct";
import { Alert, AlertDescription } from "@/components/ui/alert";

// -----------------------------
// Zod Schemas
// -----------------------------
const singleAccountSchema = z.object({
  account_code: z.string().min(1, "رمز الحساب مطلوب"),
  account_name_en: z.string().min(1, "اسم الحساب بالإنجليزية مطلوب"),
  account_name_ar: z.string().optional(),
  account_type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
  account_category: z.string().min(1, "فئة الحساب مطلوبة"),
  parent_id: z.string().optional(),
  description: z.string().optional(),
  currency_code: z.string().optional().nullable(),
  opening_balance: z.number().nonnegative(),
  allow_manual_entry: z.boolean().default(true).optional(),
});

const accountFormSchema = z.object({
  accounts: z
    .array(singleAccountSchema)
    .min(1, "يجب إضافة حساب واحد على الأقل"),
});

type SingleAccount = z.infer<typeof singleAccountSchema>;
type FormValues = z.infer<typeof accountFormSchema>;

type ParentAccount = {
  id: string;
  account_code: string;
  account_name_en: string;
  account_name_ar: string | null;
  currency_code: string | null;
  level: number | null;
};

interface AccountFormDialogProps {
  mode: "create" | "edit";
  account?: Partial<SingleAccount> & { id?: string };
  companyBaseCurrency?: string; // e.g., "YER"
}

// -----------------------------
// Component
// -----------------------------
export default function AccountFormDialog({
  mode,
  account,
  companyBaseCurrency = "YER",
}: AccountFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [parentAccounts, setParentAccounts] = useState<ParentAccount[]>([]);
  const [isLoadingParents, setIsLoadingParents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    { id: "ACCOUNTS_PAYABLE", name: "ذمم دائنة", type: "LIABILITY" },
    { id: "OWNER_EQUITY", name: "رأس المال", type: "EQUITY" },
    { id: "SALES_REVENUE", name: "إيرادات مبيعات", type: "REVENUE" },
    { id: "OPERATING_EXPENSES", name: "مصاريف تشغيلية", type: "EXPENSE" },
  ];

  // -----------------------------
  // Form
  // -----------------------------
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      accounts: [
        {
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
      ],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "accounts",
  });

  const accounts = watch("accounts");

  // -----------------------------
  // Fetch parent accounts
  // -----------------------------
  useEffect(() => {
    if (!open) return;

    async function fetchParentData() {
      setIsLoadingParents(true);
      try {
        const result = await getParentAccounts();
        setParentAccounts(result?.data || []);
      } catch (err) {
        toast.error("فشل في تحميل الحسابات الرئيسية");
      } finally {
        setIsLoadingParents(false);
      }
    }

    fetchParentData();
  }, [open]);

  // -----------------------------
  // Initialize edit mode
  // -----------------------------
  useEffect(() => {
    if (mode === "edit" && account) {
      const acc = [
        {
          account_code: account.account_code ?? "",
          account_name_en: account.account_name_en ?? "",
          account_name_ar: account.account_name_ar ?? "",
          account_type: account.account_type ?? "ASSET",
          account_category: account.account_category ?? "CASH",
          parent_id: account.parent_id ?? "",
          opening_balance: Number(account.opening_balance ?? 0),
          description: account.description ?? "",
          currency_code: account.currency_code ?? null,
          allow_manual_entry: account.allow_manual_entry ?? true,
        },
      ];
      setValue("accounts", acc);
    }
  }, [mode, account, setValue]);

  // -----------------------------
  // Helpers
  // -----------------------------
  const isMainAccount = (acc: SingleAccount) =>
    !acc.parent_id || acc.parent_id === "";

  const getAllowedCurrencies = (acc: SingleAccount) => {
    if (isMainAccount(acc)) return [];
    const parent = parentAccounts.find((p) => p.id === acc.parent_id);
    if (parent?.currency_code) return [parent.currency_code];
    return currencyOptions.map((c) => c.id);
  };

  const addAccount = () => {
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
    });
  };

  // -----------------------------
  // Submit
  // -----------------------------
  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      for (let i = 0; i < data.accounts.length; i++) {
        const acc = data.accounts[i];
        if (isMainAccount(acc)) {
          if (acc.currency_code && acc.currency_code !== companyBaseCurrency) {
            toast.error(
              `الحساب ${acc.account_code}: الحسابات الرئيسية يجب أن تستخدم العملة الأساسية (${companyBaseCurrency}) أو لا عملة`,
            );
            setIsSubmitting(false);
            return;
          }
        } else {
          const parent = parentAccounts.find((p) => p.id === acc.parent_id);
          if (
            parent?.currency_code &&
            acc.currency_code !== parent.currency_code
          ) {
            toast.error(
              `الحساب ${acc.account_code}: يجب أن تتطابق العملة مع الحساب الأب (${parent.currency_code})`,
            );
            setIsSubmitting(false);
            return;
          }
        }
      }

      if (mode === "create") {
        const results = await Promise.all(data.accounts.map(createAccount));
        const failed = results.filter((r) => !r?.success);
        if (failed.length > 0) {
          toast.error(
            `فشل إنشاء ${failed.length} من ${data.accounts.length} حساب`,
          );
          setIsSubmitting(false);
          return;
        }
        toast.success(`تم إنشاء ${data.accounts.length} حساب بنجاح`);
      } else if (mode === "edit" && account?.id) {
        const result = await updateAccounts(account.id, data.accounts[0]);
        if (!result.success) {
          toast.error(result?.error || "حدث خطأ أثناء حفظ الحساب");
          setIsSubmitting(false);
          return;
        }
        toast.success(result.message);
      }

      setOpen(false);
      setValue("accounts", [
        {
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
      ]);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء حفظ الحسابات");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------
  // Render
  // -----------------------------
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
            className="hover: h-8 w-8 p-0 text-blue-600"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        )
      }
      style="sm:max-w-5xl max-h-[90vh] overflow-y-auto"
      titel={mode === "create" ? "إضافة حسابات جديدة" : "تعديل الحساب"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
        {fields.map((field, index) => {
          const acc = accounts[index];
          const filteredCategories = accountCategories.filter(
            (cat) => cat.type === acc.account_type,
          );
          const allowedCurrencies = getAllowedCurrencies(acc);
          const isMain = isMainAccount(acc);

          return (
            <div
              key={field.id}
              className="space-y-4 rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  حساب {index + 1}{" "}
                  {isMain ? (
                    <span className="mr-2 rounded px-2 py-1 text-xs text-blue-700">
                      حساب رئيسي
                    </span>
                  ) : (
                    <span className="mr-2 rounded px-2 py-1 text-xs text-green-700">
                      حساب فرعي
                    </span>
                  )}
                </h3>
                {mode === "create" && fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                    onClick={() => remove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {/* Account Code */}
                <div className="grid gap-2">
                  <Label>رمز الحساب *</Label>
                  <Input
                    value={acc.account_code}
                    onChange={(e) => {
                      update(index, { ...acc, account_code: e.target.value });
                    }}
                  />
                </div>

                {/* Account Type */}
                <div className="grid gap-2">
                  <Label>نوع الحساب *</Label>
                  <SelectField
                    value={acc.account_type}
                    action={(value) =>
                      update(index, {
                        ...acc,
                        account_type: value as
                          | "ASSET"
                          | "LIABILITY"
                          | "EQUITY"
                          | "REVENUE"
                          | "EXPENSE",
                      })
                    }
                    placeholder="اختر نوع الحساب"
                    options={accountTypes}
                  />
                </div>

                {/* Account Name */}
                <div className="grid gap-2">
                  <Label>اسم الحساب (عربي) *</Label>
                  <Input
                    value={acc.account_name_en}
                    onChange={(e) =>
                      update(index, { ...acc, account_name_en: e.target.value })
                    }
                  />
                </div>

                {/* Category */}
                <div className="grid gap-2">
                  <Label>الفئة *</Label>
                  <SelectField
                    options={filteredCategories}
                    value={acc.account_category}
                    action={(value) =>
                      update(index, { ...acc, account_category: value })
                    }
                    placeholder="اختر الفئة"
                  />
                </div>

                {/* Parent Account */}
                <Select
                  value={acc.parent_id || "none"}
                  onValueChange={(value) =>
                    update(index, {
                      ...acc,
                      parent_id: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب الأب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">لا يوجد (حساب رئيسي)</SelectItem>
                    {parentAccounts.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.account_code} -{" "}
                        {parent.account_name_ar || parent.account_name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Currency */}
                <Select
                  value={acc.currency_code || "none"}
                  onValueChange={(value) =>
                    update(index, {
                      ...acc,
                      currency_code: value === "none" ? null : value,
                    })
                  }
                  // disabled={isMain || allowedCurrencies.length === 1}
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
            </div>
          );
        })}

        {/* Add more */}
        {mode === "create" && (
          <Button
            type="button"
            variant="outline"
            onClick={addAccount}
            className="w-full border-dashed"
          >
            <Plus className="ml-2 h-4 w-4" /> إضافة حساب آخر
          </Button>
        )}

        {/* Submit */}
        <div className="flex justify-end gap-3 border-t pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? "جاري الحفظ..."
              : mode === "create"
                ? `إنشاء ${fields.length} حساب`
                : "حفظ التغييرات"}
          </Button>
        </div>
      </form>
    </Dailogreuse>
  );
}
