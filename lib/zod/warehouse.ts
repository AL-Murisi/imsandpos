import { z } from "zod";

export const WarehouseSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  location: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  postalCode: z.string().nullable(),
  phoneNumber: z.string().nullable(),
  email: z.string().email().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateWarehouseSchema = z.object({
  name: z.string().min(1, "اسم المستودع مطلوب"),
  location: z.string().min(1, "الموقع مطلوب"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional(),
});

export type WarehouseInput = z.infer<typeof CreateWarehouseSchema>;
