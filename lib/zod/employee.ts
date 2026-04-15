import { z } from "zod";

export const CreateEmployeeSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب"),
  email: z
    .string()
    .trim()
    .email("البريد الإلكتروني غير صالح")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
  position: z.enum([
    "admin",
    "customer",
    "accountant",
    "manager_wh",
    "supplier",
    "cashier",
  ]),
  department: z.string().optional(),
  salary: z.number().optional(),
  hireDate: z.string().min(1, "تاريخ التوظيف مطلوب"),
  password: z
    .string()
    .min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل")
    .optional()
    .or(z.literal("")),
});

export const UpdateEmployeeSchema = CreateEmployeeSchema.partial();

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;

export const EmployeeSalaryPaymentSchema = z.object({
  amount: z.number().positive("مبلغ الراتب مطلوب"),
  paymentMethod: z.enum(["cash", "bank"]),
  paymentDate: z.string().min(1, "تاريخ الدفع مطلوب"),
  branchId: z.string().optional(),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  currencyCode: z.string().min(3).max(3).optional(),
});

export type EmployeeSalaryPaymentInput = z.infer<
  typeof EmployeeSalaryPaymentSchema
>;
