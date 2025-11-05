import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.string().email("صيغة البريد الإلكتروني غير صحيحة"),
  name: z.string().min(2, "يجب ألا يقل الاسم عن حرفين"),
  phoneNumber: z.string().optional(),
  password: z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف"),
  roleId: z.string().min(1, "يجب اختيار دور واحد على الأقل"),
  warehouseIds: z.string().optional(),
});
export const UpdateUserSchema = CreateUserSchema.partial().omit({
  password: true,
});
export type UserInput = z.infer<typeof CreateUserSchema>;

export const userSchema = z.object({
  id: z.string().cuid(),
  email: z.string().email(),
  name: z.string(),
  phoneNumber: z.string().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  roles: z.array(
    z.object({
      role: z.object({ name: z.string() }),
    }),
  ),
});
export type userSchemaa = z.infer<typeof userSchema>;
export const UpdateCompanySchema = z.object({
  name: z.string().min(2, "اسم الشركة يجب أن يكون على الأقل حرفين"),
  email: z.string().email("البريد الإلكتروني غير صحيح"),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
});

export type FormValues = z.infer<typeof UpdateCompanySchema>;
