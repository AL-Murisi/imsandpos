import { z } from "zod";

export const UpdateInventorySchema = z.object({
  stockQuantity: z.number().int().nonnegative().optional(),
  reorderLevel: z.number().int().nonnegative().optional(),
  maxStockLevel: z.number().int().positive().optional(),
  status: z.enum(["available", "low", "out_of_stock"]),
  availableQuantity: z.number().int().nonnegative().optional(),
  reservedQuantity: z.number().int().nonnegative().optional(),
  location: z.string().optional(),
  lastStockTake: z.union([z.string(), z.date()]),
});

export const CreateStockMovementSchema = z.object({
  userId: z.string().optional(),
  productId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  movementType: z.enum(["in", "out", "transfer", "adjustment"]),
  quantity: z.number().int().positive("الكمية يجب أن تكون موجبة"),
  reason: z.string().optional(),
  referenceType: z.string().optional(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

export const InventoryUpdateWithTrackingSchema = UpdateInventorySchema.extend({
  id: z.string(),
  userId: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});
