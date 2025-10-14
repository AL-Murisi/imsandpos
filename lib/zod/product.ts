import { z } from "zod";

// ✅ Base product schema
export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "اسم المنتج مطلوب"),
  sku: z.string().min(1, "رمز المنتج مطلوب"),
  barcode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  categoryId: z.string().min(1, "معرّف الفئة مطلوب"),
  brandId: z.string().nullable().optional(),
  type: z.enum(["single", "bundle", "variant"]).optional(),
  unitsPerPacket: z.number().int().min(1, "عدد الوحدات في العبوة مطلوب"),
  packetsPerCarton: z.number().int().min(1, "عدد العبوات في الكرتون مطلوب"),
  costPrice: z.number().positive("سعر التكلفة يجب أن يكون موجبًا"),
  pricePerUnit: z
    .number()
    .positive("سعر الوحدة يجب أن يكون موجبًا")
    .nullable()
    .optional(),
  quantity: z.number().int().nonnegative(),
  pricePerPacket: z.number().positive("سعر العبوة يجب أن يكون موجبًا"),
  pricePerCarton: z.number().positive("سعر الكرتون يجب أن يكون موجبًا"),
  wholesalePrice: z.number().positive("سعر الجملة يجب أن يكون موجبًا"),
  minWholesaleQty: z.number().int().min(1, "الحد الأدنى للكمية بالجملة مطلوب"),
  weight: z.number().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  supplierId: z.string().min(1, "معرّف المورد مطلوب"),
  warehouseId: z.string().min(1, "معرّف المستودع مطلوب"),
  status: z.enum(["active", "inactive", "discontinued"]).default("active"),
  isActive: z.boolean().default(true),
});
export type ProductFormValues = z.infer<typeof productSchema>;

export const CreateProductSchema = z
  .object({
    name: z.string().min(1, "اسم المنتج مطلوب"),
    sku: z.string().min(1, "رمز المنتج مطلوب"),
    barcode: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    categoryId: z.string().min(1, "معرّف الفئة مطلوب"),
    brandId: z.string().nullable().optional(),
    type: z.enum(["single", "bundle", "variant"]).nullable().optional(),

    unitsPerPacket: z.number().int().min(1, "عدد الوحدات في العبوة مطلوب"),
    packetsPerCarton: z.number().int().min(1, "عدد العبوات في الكرتون مطلوب"),
    costPrice: z.number().positive("سعر التكلفة يجب أن يكون موجبًا"),
    pricePerUnit: z
      .number()
      .positive("سعر الوحدة يجب أن يكون موجبًا")
      .optional(), // Optional if not all products are sold by unit
    pricePerPacket: z.number().positive("سعر العبوة يجب أن يكون موجبًا"),
    pricePerCarton: z.number().positive("سعر الكرتون يجب أن يكون موجبًا"),
    wholesalePrice: z.number().positive("سعر الجملة يجب أن يكون موجبًا"),
    minWholesaleQty: z
      .number()
      .int()
      .min(1, "الحد الأدنى للكمية بالجملة مطلوب"),
    weight: z.number().nullable().optional(),
    dimensions: z.string().nullable().optional(),
    supplierId: z.string().min(1, "معرّف المورد مطلوب").optional(),
    warehouseId: z.string().min(1, "معرّف المستودع مطلوب"),
    status: z.enum(["active", "inactive", "discontinued"]),
  })
  .refine((data) => data.pricePerCarton > data.costPrice, {
    message: "سعر البيع يجب أن يكون أكبر من سعر التكلفة",
    path: ["pricePerCarton"],
  })
  .refine((data) => data.wholesalePrice >= data.costPrice, {
    message: "سعر الجملة يجب أن يكون أكبر أو يساوي سعر التكلفة",
    path: ["wholesalePrice"],
  });

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export const UpdateProductSchema = productSchema.partial();
export type UpdateProductFormValues = z.infer<typeof UpdateProductSchema>;
