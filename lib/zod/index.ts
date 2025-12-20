export * from "./product";
export * from "./cashier";
export * from "./user";
export * from "./role";
export * from "./warehouse";
export * from "./category";
export * from "./brand";
export * from "./supplier";
export * from "./inventory";
export * from "./customer";
export * from "./banks";
// import { Warehouse } from "lucide-react";
// import { file, z } from "zod";
// export const productSchema = z.object({
//   id: z.string().optional(),
//   name: z.string().min(1, "اسم المنتج مطلوب"),
//   sku: z.string().min(1, "رمز المنتج مطلوب"),
//   barcode: z.string().nullable().optional(),
//   description: z.string().nullable().optional(),
//   categoryId: z.string().min(1, "معرّف الفئة مطلوب"),
//   brandId: z.string().nullable().optional(),
//   type: z.enum(["single", "bundle", "variant"]).optional(),
//   unitsPerPacket: z.number().int().min(1, "عدد الوحدات في العبوة مطلوب"),
//   packetsPerCarton: z.number().int().min(1, "عدد العبوات في الكرتون مطلوب"),
//   costPrice: z.number().positive("سعر التكلفة يجب أن يكون موجبًا"),
//   pricePerUnit: z
//     .number()
//     .positive("سعر الوحدة يجب أن يكون موجبًا")
//     .nullable()
//     .optional(),
//   quantity: z.number().int().nonnegative(),
//   pricePerPacket: z.number().positive("سعر العبوة يجب أن يكون موجبًا"),
//   pricePerCarton: z.number().positive("سعر الكرتون يجب أن يكون موجبًا"),
//   wholesalePrice: z.number().positive("سعر الجملة يجب أن يكون موجبًا"),
//   minWholesaleQty: z.number().int().min(1, "الحد الأدنى للكمية بالجملة مطلوب"),
//   weight: z.number().nullable().optional(),
//   dimensions: z.string().nullable().optional(),
//   supplierId: z.string().min(1, "معرّف المورد مطلوب"),
//   warehouseId: z.string().min(1, "معرّف المستودع مطلوب"),
//   status: z.enum(["active", "inactive", "discontinued"]).default("active"),
//   isActive: z.boolean().default(true),
// });
// export type ProductFormValues = z.infer<typeof productSchema>;
// // lib/validations/index.ts
// // ✅ سكيم المنتج

// export const CreateProductSchema = z
//   .object({
//     name: z.string().min(1, "اسم المنتج مطلوب"),
//     sku: z.string().min(1, "رمز المنتج مطلوب"),
//     barcode: z.string().nullable().optional(),
//     description: z.string().nullable().optional(),
//     categoryId: z.string().min(1, "معرّف الفئة مطلوب"),
//     brandId: z.string().nullable().optional(),
//     type: z.enum(["single", "bundle", "variant"]),

//     unitsPerPacket: z.number().int().min(1, "عدد الوحدات في العبوة مطلوب"),
//     packetsPerCarton: z.number().int().min(1, "عدد العبوات في الكرتون مطلوب"),
//     costPrice: z.number().positive("سعر التكلفة يجب أن يكون موجبًا"),
//     pricePerUnit: z
//       .number()
//       .positive("سعر الوحدة يجب أن يكون موجبًا")
//       .optional(), // Optional if not all products are sold by unit
//     pricePerPacket: z.number().positive("سعر العبوة يجب أن يكون موجبًا"),
//     pricePerCarton: z.number().positive("سعر الكرتون يجب أن يكون موجبًا"),
//     wholesalePrice: z.number().positive("سعر الجملة يجب أن يكون موجبًا"),
//     minWholesaleQty: z
//       .number()
//       .int()
//       .min(1, "الحد الأدنى للكمية بالجملة مطلوب"),
//     weight: z.number().nullable().optional(),
//     dimensions: z.string().nullable().optional(),
//     supplierId: z.string().min(1, "معرّف المورد مطلوب").optional(),
//     warehouseId: z.string().min(1, "معرّف المستودع مطلوب"),
//     status: z.enum(["active", "inactive", "discontinued"]),
//     // image: z
//     //   .any()
//     //   .optional()
//     //   .refine((file) => file?.size <= 500000, "max imga is 5mb")
//     //   .refine((file) => file?.type, "acetpeyd files only jpg,jpeg,png"),
//   })
//   .refine((data) => data.pricePerCarton > data.costPrice, {
//     message: "سعر البيع يجب أن يكون أكبر من سعر التكلفة",
//     path: ["pricePerCarton"],
//   })
//   .refine((data) => data.wholesalePrice >= data.costPrice, {
//     message: "سعر الجملة يجب أن يكون أكبر أو يساوي سعر التكلفة",
//     path: ["wholesalePrice"],
//   });

// export type CreateProductInput = z.infer<typeof CreateProductSchema>;

// export const UpdateProductSchema = productSchema.partial();
// export type UpdateProductFormValues = z.infer<typeof UpdateProductSchema>;
// export const baseCashierItem = z.object({
//   id: z.string(),
//   sku: z.string(),
//   name: z.string(),
//   selectedQty: z.number().min(1),
//   sellingUnit: z.enum(["unit", "packet", "carton"]),
//   pricePerUnit: z.number().optional(),
//   pricePerPacket: z.number().optional(),
//   pricePerCarton: z.number().optional(),
//   warehouseId: z.string(),
// });

// export const ProductForSaleSchema = z.object({
//   id: z.string(),
//   sku: z.string(),
//   name: z.string(),

//   pricePerUnit: z.number().nullable(),
//   pricePerPacket: z.number().nullable(),
//   pricePerCarton: z.number().nullable(),
//   // warehousename: z.string(),
//   unitsPerPacket: z.number().int().nonnegative(),
//   packetsPerCarton: z.number().int().nonnegative(),

//   availableCartons: z.number().int().nonnegative(),
//   availablePackets: z.number().int().nonnegative(),
//   availableUnits: z.number().int().nonnegative(),
//   warehouseId: z.string(),
// });

// export const ProductListForSaleSchema = z.array(ProductForSaleSchema);

// export type ProductForSale = z.infer<typeof ProductForSaleSchema>;

// export type CashierItem = z.infer<typeof baseCashierItem>;
// export const CashierSchema = z.object({
//   cart: z
//     .array(baseCashierItem)
//     .nonempty("الرجاء إضافة منتجات إلى السلة أولاً"),

//   discountValue: z.number().nonnegative("الخصم لا يمكن أن يكون سالبًا"),
//   discountType: z.enum(["fixed", "percentage"]),
//   totalBeforeDiscount: z.number().nonnegative(),
//   totalDiscount: z.number().nonnegative(),
//   totalAfterDiscount: z.number().nonnegative(),
//   cashierId: z.string(),
//   saleNumber: z.string().optional(),
//   customerId: z.string().optional(),
//   receivedAmount: z.number().nonnegative("المبلغ المستلم مطلوب"),
//   change: z.number().nonnegative("المتبقي للعميل مطلوب"),

//   paidAt: z.date(),
// });
// // .refine((data) => data.receivedAmount >= data.totalAfterDiscount, {
// //   message: "المبلغ المستلم أقل من المبلغ المطلوب",
// //   path: ["receivedAmount"],
// // });

// // // ✅ التحقق من صحة الإجمالي بعد الخصم
// // .refine(
// //   (data) =>
// //     Math.abs(
// //       data.totalAfterDiscount -
// //         (data.totalBeforeDiscount - data.totalDiscount)
// //     ) < 0.01,
// //   {
// //     message: "الإجمالي بعد الخصم غير صحيح",
// //     path: ["totalAfterDiscount"],
// //   }
// // )

// // // ✅ التحقق من صحة الباقي للعميل
// // .refine(
// //   (data) =>
// //     Math.abs(data.change - (data.receivedAmount - data.totalAfterDiscount)) <
// //     0.01,
// //   {
// //     message: "المبلغ المتبقي غير صحيح",
// //     path: ["change"],
// //   }
// // );
// // ✅ سكيم المستخدم

// export const UserSchema = z.object({
//   id: z.string().cuid(),
//   email: z.string().email(),
//   name: z.string().min(1, "الاسم مطلوب"),
//   phoneNumber: z.string().nullable().optional(),
//   isActive: z.boolean(),
//   createdAt: z.date(),
//   updatedAt: z.date(),

//   roles: z.array(
//     z.object({
//       role: z.object({
//         name: z.string(),
//       }),
//     }),
//   ),
// });
// export const Reservation = z.object({
//   productId: z.string(),

//   warehouseId: z.string(),
//   quantity: z.number().int().nonnegative(),

//   userId: z.string(),
//   reason: z.string("reservation"),
// });
// export const CreateUserSchema = z.object({
//   email: z.string().email("صيغة البريد الإلكتروني غير صحيحة"),
//   name: z.string().min(2, "يجب ألا يقل الاسم عن حرفين"),
//   phoneNumber: z.string().optional(),
//   password: z.string().min(8, "كلمة المرور يجب ألا تقل عن 8 أحرف"),
//   roleId: z.string().min(1, "يجب اختيار دور واحد على الأقل"),
//   warehouseIds: z.string().optional(),
// });

// export const UpdateUserSchema = CreateUserSchema.partial().omit({
//   password: true,
// });
// export type userSchema = z.infer<typeof CreateUserSchema>;
// // ✅ سكيم الدور
// export const RoleSchema = z.object({
//   id: z.string().cuid(),
//   name: z.string(),
//   description: z.string().nullable(),
//   permissions: z.record(z.string(), z.boolean()),
//   createdAt: z.date(),
//   updatedAt: z.date(),
// });
// export type rolescham = z.infer<typeof RoleSchema>;

// export const CreateRoleSchema = z.object({
//   name: z.string().min(1, "اسم الدور مطلوب"),
//   description: z.string().optional(),
//   permissions: z.record(z.string(), z.boolean()),
// });
// export type CreateRoleInput = z.infer<typeof CreateRoleSchema>;

// // ✅ سكيم المستودع
// export const WarehouseSchema = z.object({
//   id: z.string().cuid(),
//   name: z.string(),
//   location: z.string(),
//   address: z.string().nullable(),
//   city: z.string().nullable(),
//   state: z.string().nullable(),
//   country: z.string().nullable(),
//   postalCode: z.string().nullable(),
//   phoneNumber: z.string().nullable(),
//   email: z.string().email().nullable(),
//   isActive: z.boolean(),
//   createdAt: z.date(),
//   updatedAt: z.date(),
// });

// export const CreateWarehouseSchema = z.object({
//   name: z.string().min(1, "اسم المستودع مطلوب"),
//   location: z.string().min(1, "الموقع مطلوب"),
//   address: z.string().optional(),
//   city: z.string().optional(),
//   state: z.string().optional(),
//   country: z.string().optional(),
//   postalCode: z.string().optional(),
//   phoneNumber: z.string().optional(),
//   email: z.string().email().optional(),
// });
// export type WarehouseInput = z.infer<typeof CreateWarehouseSchema>;

// // ✅ سكيم الفئة
// export const CreateCategorySchema = z.object({
//   name: z.string().min(1, "اسم الفئة مطلوب"),
//   description: z.string().optional(),
//   parentId: z.string().optional(),
// });
// export const CategorySchema = z.object({
//   id: z.string(),
//   name: z.string().min(1, "اسم الفئة مطلوب"),
//   description: z.string().optional(),
//   parentId: z.string().cuid(),
//   isActive: z.boolean(),
//   createdAt: z.date(),
//   updatedAt: z.date(),
// });
// export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;

// // ✅ سكيم العلامة التجارية
// export const CreateBrandSchema = z.object({
//   name: z.string().min(1, "اسم العلامة التجارية مطلوب"),
//   description: z.string().optional(),
//   website: z.string().url("رابط غير صالح").optional(),
//   contactInfo: z.string().optional(),
// });
// export type CreateBrandInput = z.infer<typeof CreateBrandSchema>;

// // ✅ سكيم المورد
// export const CreateSupplierSchema = z.object({
//   name: z.string().min(1, "اسم المورد مطلوب"),
//   contactPerson: z.string().optional(),
//   email: z.string().email().optional(),
//   phoneNumber: z.string().optional(),
//   address: z.string().optional(),
//   city: z.string().optional(),
//   state: z.string().optional(),
//   country: z.string().optional(),
//   postalCode: z.string().optional(),
//   taxId: z.string().optional(),
//   paymentTerms: z.string().optional(),
// });
// export type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;
// export const SupplierSchema = z.object({
//   id: z.string(),
//   name: z.string().min(1, "اسم المورد مطلوب"),
//   contactPerson: z.string(),
//   email: z.string().email(),
//   phoneNumber: z.string(),
//   address: z.string(),
//   city: z.string(),
//   state: z.string(),
//   country: z.string(),
//   postalCode: z.string(),
//   taxId: z.string(),
//   paymentTerms: z.string(),
//   isActive: z.boolean(),
//   createdAt: z.date(),
//   updatedAt: z.date(),
// });
// // ✅ سكيم المخزون
// export const UpdateInventorySchema = z.object({
//   stockQuantity: z.number().int().nonnegative().optional(),
//   reorderLevel: z.number().int().nonnegative().optional(),
//   maxStockLevel: z.number().int().positive().optional(),
//   status: z.enum(["available", "low", "out_of_stock"]),
//   availableQuantity: z.number().int().nonnegative().optional(),
//   reservedQuantity: z.number().int().nonnegative().optional(),
//   location: z.string().optional(),
//   lastStockTake: z.union([z.string(), z.date()]),
// });

// // ✅ سكيم حركة المخزون
// export const CreateStockMovementSchema = z.object({
//   userId: z.string().optional(),
//   productId: z.string().cuid(),
//   warehouseId: z.string().cuid(),
//   movementType: z.enum(["in", "out", "transfer", "adjustment"]),
//   quantity: z.number().int().positive("الكمية يجب أن تكون موجبة"),
//   reason: z.string().optional(),
//   referenceType: z.string().optional(),
//   referenceId: z.string().optional(),
//   notes: z.string().optional(),
// });
// export const InventoryUpdateWithTrackingSchema = UpdateInventorySchema.extend({
//   id: z.string(),
//   userId: z.string().optional(),
//   reason: z.string().optional(),
//   notes: z.string().optional(),
// });

// // ✅ سكيم العميل
// export const CreateCustomerSchema = z.object({
//   name: z.string().min(1, "اسم العميل مطلوب"),
//   email: z.string().email().optional(),
//   phoneNumber: z.string().optional(),
//   address: z.string().optional(),
//   city: z.string().optional(),
//   state: z.string().optional(),
//   country: z.string().optional(),
//   postalCode: z.string().optional(),
//   customerType: z.enum(["individual", "business"]),
//   taxId: z.string().optional(),
//   // creditLimit: z.number().positive().optional(),
// });
// export type createCusomer = z.infer<typeof CreateCustomerSchema>;
// // ✅ سكيم الطلب
// export const CreateOrderSchema = z.object({
//   customerId: z.string().cuid().optional(),
//   orderType: z.enum(["sale", "return", "exchange"]).default("sale"),
//   items: z.array(
//     z.object({
//       productId: z.string().cuid(),
//       quantity: z.number().int().positive("الكمية مطلوبة ويجب أن تكون موجبة"),
//     }),
//   ),
// });
