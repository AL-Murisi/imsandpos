import { z } from "zod";

// ✅ سكيم العلامة التجارية
export const CreateBrandSchema = z.object({
  name: z.string().min(1, "اسم العلامة التجارية مطلوب"),
  description: z.string().optional(),
  website: z.string().url("رابط غير صالح").optional(),
  contactInfo: z.string().optional(),
});
export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;
