import { z } from "zod";

export const CreateCustomerSchema = z.object({
  name: z.string().min(1, "اسم العميل مطلوب"),
  email: z
    .string()
    .trim()
    .email("البريد الإلكتروني غير صالح")
    .optional()
    .or(z.literal("")),
  preferred_currency: z
    .array(z.string())
    .min(1, "يجب اختيار عملة واحدة على الأقل"),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  customerType: z.enum(["individual", "business"]),
  taxId: z.string().optional(),
  outstandingBalance: z.number().default(0).optional(),
  balance: z.number().default(0).optional(),
  creditLimit: z.number().positive("حد الدين يجب أن يكون أكبر من صفر").optional(),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .optional()
    .or(z.literal("")),
});

export type CreateCustomer = z.infer<typeof CreateCustomerSchema>;
