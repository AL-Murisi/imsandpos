import { z } from "zod";
export const CreateCustomerSchema = z.object({
  name: z.string().min(1, "اسم العميل مطلوب"),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  customerType: z.enum(["individual", "business"]),
  taxId: z.string().optional(),
  outstandingBalance: z.string(),
  // creditLimit: z.number().positive().optional(),
});
export type createCusomer = z.infer<typeof CreateCustomerSchema>;
