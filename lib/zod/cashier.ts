import { z } from "zod";
export const baseCashierItem = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),

  selectedQty: z.number().min(1),
  sellingUnit: z.enum(["unit", "packet", "carton"]),
  pricePerUnit: z.number().optional(),
  pricePerPacket: z.number().optional(),
  pricePerCarton: z.number().optional(),
  warehouseId: z.string(),
});

export type CashierItem = z.infer<typeof baseCashierItem>;
export const CashierSchema = z.object({
  cart: z
    .array(baseCashierItem)
    .nonempty("الرجاء إضافة منتجات إلى السلة أولاً"),

  discountValue: z.number().nonnegative("الخصم لا يمكن أن يكون سالبًا"),
  discountType: z.enum(["fixed", "percentage"]),
  totalBeforeDiscount: z.number().nonnegative(),
  totalDiscount: z.number().nonnegative(),
  totalAfterDiscount: z.number().nonnegative(),
  cashierId: z.string(),
  saleNumber: z.string().optional(),
  customerId: z.string().optional(),
  receivedAmount: z.number().nonnegative("المبلغ المستلم مطلوب"),
  change: z.number().nonnegative("المتبقي للعميل مطلوب"),

  paidAt: z.date(),
});
export type Cashier = z.infer<typeof CashierSchema>;

export const ProductForSaleSchema = z.object({
  id: z.string(),
  sku: z.string(),
  name: z.string(),

  pricePerUnit: z.number().nullable(),
  pricePerPacket: z.number().nullable(),
  pricePerCarton: z.number().nullable(),
  // warehousename: z.string(),
  unitsPerPacket: z.number().int().nonnegative(),
  packetsPerCarton: z.number().int().nonnegative(),

  availableCartons: z.number().int().nonnegative(),
  availablePackets: z.number().int().nonnegative(),
  availableUnits: z.number().int().nonnegative(),
  warehouseId: z.string(),
});

export const ProductListForSaleSchema = z.array(ProductForSaleSchema);

export type ProductForSale = z.infer<typeof ProductForSaleSchema>;
