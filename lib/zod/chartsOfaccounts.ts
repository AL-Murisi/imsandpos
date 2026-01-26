import { z } from "zod";
export const singleAccountSchema = z.object({
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
  level: z.number().nonnegative(),
});
export type SingleAccount = z.infer<typeof singleAccountSchema>;
export const bulkAccountsSchema = z.object({
  accounts: z
    .array(singleAccountSchema)
    .min(1, "يجب إضافة حساب واحد على الأقل"),
});
export type BulkFormValues = z.infer<typeof bulkAccountsSchema>;
