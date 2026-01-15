// lib/zod/pos.ts
import { z } from "zod";

export const CreatePosSchema = z.object({
  name: z.string().min(1, "اسم نقطة البيع مطلوب"),
  location: z.string().optional(),
  managerId: z.string().min(1, "مدير نقطة البيع مطلوب"),
});

export type CreatePosType = z.infer<typeof CreatePosSchema>;
