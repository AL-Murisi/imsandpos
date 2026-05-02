import { z } from "zod";
import { SellingUnitSchema } from "./cashier";

// ✅ Base product schema
export const productSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "اسم المنتج مطلوب"),
  sku: z.string().min(1, "رمز المنتج مطلوب"),
  barcode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  categoryId: z.string().min(1, "معرّف الفئة مطلوب"),
  brandId: z.string().nullable().optional(),
  type: z.enum(["full", "cartonUnit", "cartonOnly"]).default("full").optional(),

  quantity: z.number().int().nonnegative(),

  wholesalePrice: z.number().positive("سعر الجملة يجب أن يكون موجبًا"),
  minWholesaleQty: z.number().int().min(1, "الحد الأدنى للكمية بالجملة مطلوب"),
  weight: z.number().nullable().optional(),
  expiredAt: z.union([z.string(), z.date()]),
  dimensions: z.string().nullable().optional(),

  status: z.enum(["active", "inactive", "discontinued"]).default("active"),
  isActive: z.boolean().default(true),
});
export type ProductFormValues = z.infer<typeof productSchema>;

export const CreateProductSchema = z.object({
  name: z.string().min(1, "اسم المنتج مطلوب"),
  sku: z.string().min(1, "رمز المنتج مطلوب"),
  description: z.string().nullable().optional(),
  categoryId: z.string().min(1, "معرّف الفئة مطلوب"),
  barcode: z.string().nullable().optional(),

  brandId: z.string().nullable().optional(),
  type: z.enum(["full", "cartonUnit", "cartonOnly"]).default("full").optional(),
  sellingUnits: z
    .array(SellingUnitSchema)
    .min(1, "يجب إضافة وحدة بيع واحدة على الأقل"),

  // ✅ Allow 0 for carton-only products

  wholesalePrice: z.number().positive("سعر الجملة يجب أن يكون موجبًا"),

  // ✅ Allow 0 for carton-only products
  minWholesaleQty: z
    .number()
    .int()
    .min(0, "الحد الأدنى للكمية بالجملة يجب أن يكون 0 أو أكثر"),

  dimensions: z.string().nullable().optional(),
});
export const CreateProductSchemas = z.object({
  name: z.string().min(1, "اسم المنتج مطلوب"),
  sku: z.string().min(1, "رمز المنتج مطلوب"),
  description: z.string().nullable().optional(),
  categoryId: z.string().min(1, "معرّف الفئة مطلوب"),
  barcode: z.string().nullable().optional(),

  brandId: z.string().nullable().optional(),
  sellingUnits: z
    .array(SellingUnitSchema)
    .min(1, "يجب إضافة وحدة بيع واحدة على الأقل"),

  // ✅ Allow 0 for carton-only products
  // unitsPerPacket: z
  //   .number()
  //   .int()
  //   .min(0, "عدد الوحدات في العبوة يجب أن يكون 0 أو أكثر"),
  // packetsPerCarton: z
  //   .number()
  //   .int()
  //   .min(0, "عدد العبوات في الكرتون يجب أن يكون 0 أو أكثر"),

  // ✅ Allow 0 for carton-only products
  // pricePerPacket: z.number().min(0, "سعر العبوة يجب أن يكون 0 أو أكثر"),

  // pricePerCarton: z.number().positive("سعر الكرتون يجب أن يكون موجبًا"),

  wholesalePrice: z.number().positive("سعر الجملة يجب أن يكون موجبًا"),

  // ✅ Allow 0 for carton-only products
  minWholesaleQty: z
    .number()
    .int()
    .min(0, "الحد الأدنى للكمية بالجملة يجب أن يكون 0 أو أكثر"),
  warehouseId: z.string().min(1, "معرّف المستودع مطلوب"),
  dimensions: z.string().nullable().optional(),
});
export const UpdateProducts = z.object({
  name: z.string().min(1, "اسم المنتج مطلوب"),
  sku: z.string().min(1, "رمز المنتج مطلوب"),
  description: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),

  categoryId: z.string().min(1, "معرّف الفئة مطلوب"),
  brandId: z.string().nullable().optional(),
  type: z.enum(["full", "cartonUnit", "cartonOnly"]).default("full").optional(),
  sellingUnits: z
    .array(SellingUnitSchema)
    .min(1, "يجب إضافة وحدة بيع واحدة على الأقل"),

  // ✅ Allow 0 for carton-only products
  // unitsPerPacket: z
  //   .number()
  //   .int()
  //   .min(0, "عدد الوحدات في العبوة يجب أن يكون 0 أو أكثر"),
  // packetsPerCarton: z
  //   .number()
  //   .int()
  //   .min(0, "عدد العبوات في الكرتون يجب أن يكون 0 أو أكثر"),

  // ✅ Allow 0 for carton-only products
  // pricePerPacket: z.number().min(0, "سعر العبوة يجب أن يكون 0 أو أكثر"),

  // pricePerCarton: z.number().positive("سعر الكرتون يجب أن يكون موجبًا"),

  wholesalePrice: z.number().positive("سعر الجملة يجب أن يكون موجبًا"),

  // ✅ Allow 0 for carton-only products
  minWholesaleQty: z
    .number()
    .int()
    .min(0, "الحد الأدنى للكمية بالجملة يجب أن يكون 0 أو أكثر"),

  dimensions: z.string().nullable().optional(),
});
// .refine((data) => data.pricePerCarton > data.costPrice, {
//   message: "سعر البيع يجب أن يكون أكبر من سعر التكلفة",
//   path: ["pricePerCarton"],
// })
// .refine((data) => data.wholesalePrice >= data.costPrice, {
//   message: "سعر الجملة يجب أن يكون أكبر أو يساوي سعر التكلفة",
//   path: ["wholesalePrice"],
// });
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type CreateProductInputs = z.infer<typeof CreateProductSchemas>;
export const UpdateProductSchema = productSchema.partial();
export type UpdateProductFormValues = z.infer<typeof UpdateProducts>;

export type SellingUnit = {
  id: string;
  name: string;
  price: number;
  isBase: boolean;
  unitsPerParent: number;
};
