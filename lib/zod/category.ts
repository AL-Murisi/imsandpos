import { z } from "zod";
export const CreateCategorySchema = z.object({
  name: z.string().min(1, "اسم الفئة مطلوب"),
  description: z.string().optional(),
  parentId: z.string().optional(),
});
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "اسم الفئة مطلوب"),
  description: z.string().optional(),
  parentId: z.string().cuid(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
