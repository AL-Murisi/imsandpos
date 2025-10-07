import { z } from "zod";
export const CreateRoleSchema = z.object({
  name: z.string().min(1, "اسم الدور مطلوب"),
  description: z.string().optional(),
  permissions: z.record(z.string(), z.boolean()),
});
export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;

export const RoleSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  description: z.string().nullable(),
  permissions: z.record(z.string(), z.boolean()),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type rolescham = z.infer<typeof RoleSchema>;
