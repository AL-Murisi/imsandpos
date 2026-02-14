// lib/zod/pos.ts
import { z } from "zod";

export const CreatePosSchema = z.object({
  name: z.string().min(1, "POS name is required"),
  location: z.string().optional(),
  managerId: z.string().min(1, "POS manager is required"),
  cashierIds: z.array(z.string()),
});

export type CreatePosInputType = z.input<typeof CreatePosSchema>;
export type CreatePosType = z.output<typeof CreatePosSchema>;
