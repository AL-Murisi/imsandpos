import { z } from "zod";

export const BankSchema = z.object({
  name: z.string().min(2),
  branchId: z.string().min(1, "الفرع مطلوب"),
  accountNumber: z.string().optional(),
  iban: z.string().optional(),
  swiftCode: z.string().optional(),
  type: z.enum(["CASH", "BANK"]),
  preferred_currency: z
    .array(z.string())
    .min(1, "يجب إضافة وحدة بيع واحدة على الأقل"),
  accountId: z.string().uuid(), // الحساب المحاسبي
});
export type BankForm = z.infer<typeof BankSchema>;
