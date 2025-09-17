import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { logActivity } from "@/app/actions/activitylogs";
import {
  CreateProduct,
  fetchAllFormData,
  fetchProductBySku,
} from "@/app/actions/roles";
import { SelectField } from "@/components/common/selection";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateProductSchema } from "@/lib/zodType";

type FormValues = z.infer<typeof CreateProductSchema>;

interface Option {
  id: string;
  name: string;
}

export default function ProductEditFormm({ sku }: { sku: string }) {
  // State for options data
  const [formData, setFormData] = useState<{
    warehouses: Option[];
    categories: Option[];
    brands: Option[];
    suppliers: Option[];
  }>({
    warehouses: [],
    categories: [],
    brands: [],
    suppliers: [],
  });
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateProductSchema),
  });

  // Watch form values for controlled components
  const watchedWarehouseId = watch("warehouseId");
  const watchedCategoryId = watch("categoryId");
  const watchedBrandId = watch("brandId");
  const watchedSupplierId = watch("supplierId");
  const watchedType = watch("type");
  const watchedStatus = watch("status");

  // Fetch all form data with a single server action
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const data = await fetchAllFormData();
        setFormData(data);
        if (sku) {
          const product = await fetchProductBySku(sku);
          if (product) {
            // reset(product); // 👈 Pre-fill the form with product values
          }
        }
      } catch (error) {
        console.error("Error fetching form data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sku]);
  const { user } = useAuth();

  const onSubmit = async (data: FormValues) => {
    console.log("Submitted:", data);
    if (user)
      try {
        await CreateProduct(data);
        await logActivity(
          user.userId,
          "edit Product",
          "worker created a product"
        );

        reset();
        // Optional: Show success message
      } catch (error) {
        console.error("Error creating product:", error);
        // Optional: Show error message
      }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">Loading...</div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
      <div className="grid gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">اسم المنتج</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-red-500 text-xs text-right">
                {errors.name.message}
              </p>
            )}
          </div>
          {/* SKU */}
          <div className="grid gap-2">
            <Label htmlFor="sku">رمز التخزين التعريفي (SKU)</Label>
            <Input id="sku" type="text" {...register("sku")} />
            {errors.sku && (
              <p className="text-red-500 text-xs text-right">
                {errors.sku.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Barcode */}
          <div className="grid gap-2">
            <Label htmlFor="barcode">الباركود</Label>
            <Input id="barcode" type="text" {...register("barcode")} />
            {errors.barcode && (
              <p className="text-red-500 text-xs text-right">
                {errors.barcode.message}
              </p>
            )}
          </div>
          {/* Category ID */}
          <div className="grid gap-2">
            <Label htmlFor="categoryId">معرّف الفئة</Label>
            <SelectField
              options={formData.categories}
              value={watchedCategoryId || ""}
              onValueChange={(value) => setValue("categoryId", value)}
              placeholder="اختر فئة"
            />
            {errors.categoryId && (
              <p className="text-red-500 text-xs text-right">
                {errors.categoryId.message}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="grid gap-2">
          <Label htmlFor="description">الوصف</Label>
          <Input id="description" type="text" {...register("description")} />
          {errors.description && (
            <p className="text-red-500 text-xs text-right">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Brand ID */}
          <div className="grid gap-2">
            <Label htmlFor="brandId">معرّف العلامة التجارية</Label>
            <SelectField
              options={formData.brands}
              value={watchedBrandId || ""}
              onValueChange={(value) => setValue("brandId", value)}
              placeholder="اختر علامة تجارية"
            />
            {errors.brandId && (
              <p className="text-red-500 text-xs text-right">
                {errors.brandId.message}
              </p>
            )}
          </div>
          {/* Type */}
          <div className="grid gap-2">
            <Label htmlFor="type">النوع</Label>
            <SelectField
              options={[
                { id: "single", name: "منتج فردي" },
                { id: "bundle", name: "حزمة" },
                { id: "variant", name: "متغير" },
              ]}
              value={watchedType || ""}
              onValueChange={(value) =>
                setValue("type", value as "single" | "bundle" | "variant")
              }
              placeholder="اختر النوع"
            />
            {errors.type && (
              <p className="text-red-500 text-xs text-right">
                {errors.type.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Units Per Packet */}
          <div className="grid gap-2">
            <Label htmlFor="unitsPerPacket">عدد الوحدات في العبوة</Label>
            <Input
              id="unitsPerPacket"
              type="number"
              {...register("unitsPerPacket", { valueAsNumber: true })}
            />
            {errors.unitsPerPacket && (
              <p className="text-red-500 text-xs text-right">
                {errors.unitsPerPacket.message}
              </p>
            )}
          </div>
          {/* Packets Per Carton */}
          <div className="grid gap-2">
            <Label htmlFor="packetsPerCarton">عدد العبوات في الكرتون</Label>
            <Input
              id="packetsPerCarton"
              type="number"
              {...register("packetsPerCarton", { valueAsNumber: true })}
            />
            {errors.packetsPerCarton && (
              <p className="text-red-500 text-xs text-right">
                {errors.packetsPerCarton.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Cost Price */}
          <div className="grid gap-2">
            <Label htmlFor="costPrice">سعر التكلفة</Label>
            <Input
              id="costPrice"
              type="number"
              step="0.01"
              {...register("costPrice", { valueAsNumber: true })}
            />
            {errors.costPrice && (
              <p className="text-red-500 text-xs text-right">
                {errors.costPrice.message}
              </p>
            )}
          </div>
          {/* Price Per Unit */}
          <div className="grid gap-2">
            <Label htmlFor="pricePerUnit">سعر الوحدة</Label>
            <Input
              id="pricePerUnit"
              type="number"
              step="0.01"
              {...register("pricePerUnit", { valueAsNumber: true })}
            />
            {errors.pricePerUnit && (
              <p className="text-red-500 text-xs text-right">
                {errors.pricePerUnit.message}
              </p>
            )}
          </div>
        </div>

        {/* Price Per Packet */}
        <div className="grid gap-2">
          <Label htmlFor="pricePerPacket">سعر العبوة</Label>
          <Input
            id="pricePerPacket"
            type="number"
            step="0.01"
            {...register("pricePerPacket", { valueAsNumber: true })}
          />
          {errors.pricePerPacket && (
            <p className="text-red-500 text-xs text-right">
              {errors.pricePerPacket.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Price Per Carton */}
          <div className="grid gap-2">
            <Label htmlFor="pricePerCarton">سعر الكرتون</Label>
            <Input
              id="pricePerCarton"
              type="number"
              step="0.01"
              {...register("pricePerCarton", { valueAsNumber: true })}
            />
            {errors.pricePerCarton && (
              <p className="text-red-500 text-xs text-right">
                {errors.pricePerCarton.message}
              </p>
            )}
          </div>
          {/* Wholesale Price */}
          <div className="grid gap-2">
            <Label htmlFor="wholesalePrice">سعر الجملة</Label>
            <Input
              id="wholesalePrice"
              type="number"
              step="0.01"
              {...register("wholesalePrice", { valueAsNumber: true })}
            />
            {errors.wholesalePrice && (
              <p className="text-red-500 text-xs text-right">
                {errors.wholesalePrice.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Min Wholesale Quantity */}
          <div className="grid gap-2">
            <Label htmlFor="minWholesaleQty">الحد الأدنى لكمية الجملة</Label>
            <Input
              id="minWholesaleQty"
              type="number"
              {...register("minWholesaleQty", { valueAsNumber: true })}
            />
            {errors.minWholesaleQty && (
              <p className="text-red-500 text-xs text-right">
                {errors.minWholesaleQty.message}
              </p>
            )}
          </div>
          {/* Weight */}
          <div className="grid gap-2">
            <Label htmlFor="weight">الوزن</Label>
            <Input
              id="weight"
              type="number"
              step="0.01"
              {...register("weight", { valueAsNumber: true })}
            />
            {errors.weight && (
              <p className="text-red-500 text-xs text-right">
                {errors.weight.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dimensions */}
          <div className="grid gap-2">
            <Label htmlFor="dimensions">الأبعاد</Label>
            <Input id="dimensions" type="text" {...register("dimensions")} />
            {errors.dimensions && (
              <p className="text-red-500 text-xs text-right">
                {errors.dimensions.message}
              </p>
            )}
          </div>
          {/* Supplier ID */}
          <div className="grid gap-2">
            <Label htmlFor="supplierId">معرّف المورد</Label>
            <SelectField
              options={formData.suppliers}
              value={watchedSupplierId || ""}
              onValueChange={(value) => setValue("supplierId", value)}
              placeholder="اختر موردًا"
            />
            {errors.supplierId && (
              <p className="text-red-500 text-xs text-right">
                {errors.supplierId.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Warehouse ID */}
          <div className="grid gap-2">
            <Label htmlFor="warehouseId">معرّف المستودع</Label>
            <SelectField
              options={formData.warehouses}
              value={watchedWarehouseId || ""}
              onValueChange={(value) => setValue("warehouseId", value)}
              placeholder="اختر المستودع"
            />
            {errors.warehouseId && (
              <p className="text-red-500 text-xs text-right">
                {errors.warehouseId.message}
              </p>
            )}
          </div>
          {/* Status */}
          <div className="grid gap-2">
            <Label htmlFor="status">الحالة</Label>
            <SelectField
              options={[
                { id: "active", name: "نشط" },
                { id: "inactive", name: "غير نشط" },
                { id: "discontinued", name: "متوقف" },
              ]}
              value={watchedStatus || ""}
              onValueChange={(value) =>
                setValue(
                  "status",
                  value as "active" | "inactive" | "discontinued"
                )
              }
              placeholder="اختر الحالة"
            />
            {errors.status && (
              <p className="text-red-500 text-xs text-right">
                {errors.status.message}
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit">تأكيد</Button>
      </div>
    </form>
  );
}
