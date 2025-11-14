import { z } from "zod";

// ✅ سكيم المورد
export const CreateSupplierSchema = z.object({
  name: z.string().min(1, "اسم المورد مطلوب"),
  contactPerson: z.string().optional(),
  email: z
    .string()
    .trim()
    .email("البريد الإلكتروني غير صالح")
    .optional()
    .or(z.literal("")),

  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  taxId: z.string().optional(),
  paymentTerms: z.string().optional(),
  totalPurchased: z.number().positive().optional(),
  totalPaid: z.number().positive().optional(),
  outstandingBalance: z.number().positive().optional(),
});
export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
export const SupplierSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "اسم المورد مطلوب"),
  contactPerson: z.string(),
  email: z.string().email(),
  phoneNumber: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  postalCode: z.string(),
  taxId: z.string(),
  paymentTerms: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
