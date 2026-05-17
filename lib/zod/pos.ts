// lib/zod/pos.ts
import { z } from "zod";

export const CreatePosSchema = z.object({
  name: z.string().min(1, "POS name is required"),
  location: z.string().optional(),
  managerId: z.string().min(1, "POS manager is required"),
  cashierIds: z.array(z.string()),
});

export type CreatePosInputType = z.input<typeof CreatePosSchema>;
export type CreatePosType = z.output<typeof CreatePosSchema>;
export const CompanySignupSchema = z
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
    fiscalYearStart: z.number().min(1).max(12),
  })
  .refine((data) => data.adminPassword === data.confirmPassword, {
    message: "كلمات المرور غير متطابقة",
    path: ["confirmPassword"],
  });

export type FormValues = z.infer<typeof CompanySignupSchema>;
