"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { logActivity } from "@/app/actions/activitylogs";
import {
  UpdateProduct,
  fetchAllFormData,
  fetchProductBySku,
} from "@/app/actions/roles";
import { SelectField } from "../_components/selectproduct";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateProductSchema } from "@/lib/zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StatFsOptions } from "fs";

type FormValues = z.infer<typeof CreateProductSchema>;

interface Option {
  id: string;
  name: string;
}
const productTypeOptions = [
  { id: "single", name: "Single Product" }, // Assuming a key like 'type_single' for product type
  { id: "bundle", name: "Bundle" },
  { id: "variant", name: "Variant" },
];

export default function ProductEditFormm({ sku }: { sku: string }) {
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
  const t = useTranslations("productForm");
  const statusOptions = [
    { id: "active", name: "Active" }, // Assuming keys like 'status_active'
    { id: "inactive", name: "Inactive" },
  ];
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

  const { user } = useAuth();
  if (!user) return;
  const watchedValues = watch();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchAllFormData(user.companyId);
        setFormData(data);

        if (sku) {
          const productData = await fetchProductBySku(sku);
          if (productData) {
            const safeStatus = statusOptions.includes(productData.status as any)
              ? (productData.status as "active" | "inactive" | "discontinued")
              : "active";
            // ✅ Fill form fields individually — no reset()
            setValue("name", productData.name ?? "");
            setValue("sku", productData.sku ?? "");
            setValue("categoryId", productData.categoryId ?? "");
            // setValue("brandId", productData.brandId ?? "");
            setValue("supplierId", productData.supplierId ?? "");
            setValue("warehouseId", productData.warehouseId ?? "");
            setValue("costPrice", productData.costPrice ?? 0);
            setValue("pricePerUnit", productData.pricePerUnit ?? 0);
            setValue("pricePerPacket", productData.pricePerPacket ?? 0);
            setValue("pricePerCarton", productData.pricePerCarton ?? 0);
            setValue("minWholesaleQty", productData.minWholesaleQty ?? 0);
            setValue("description", productData.description ?? "");
            setValue("unitsPerPacket", productData.unitsPerPacket ?? "");
            setValue("packetsPerCarton", productData.packetsPerCarton ?? "");
            setValue("dimensions", productData.dimensions ?? "");
            setValue("costPrice", productData.costPrice ?? 0);
            setValue("wholesalePrice", productData.wholesalePrice ?? 0);
          }
        }
      } catch (error) {
        console.error("Error fetching form data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [sku, setValue]);

  const onSubmit = async (data: FormValues) => {
    console.log("Submitted:", data);
    if (!user) return;

    try {
      await UpdateProduct(data, user.companyId);
      setIsSubmitting(true);
      await logActivity(user.userId, "Edit Product", "Worker edited a product");
      setIsSubmitting(false);
      reset(); // optional: clears after save
    } catch (error) {
      console.error("Error creating product:", error);
    }
  };

  if (loading)
    return (
      <div className="flex h-64 items-center justify-center">Loading...</div>
    );
  return (
    <ScrollArea>
      <Card className="shadow-xl">
        <CardHeader className="bg-primary/5 border-b p-4 text-right">
          <CardTitle className="text-primary text-2xl font-bold">
            {t("new")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* ScrollArea for better UI on smaller screens/large forms */}
            <ScrollArea dir="rtl" className="p-4">
              <div className="grid gap-6">
                {/* Product Identifiers: Name, SKU, Barcode */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Name */}
                  <div className="grid gap-2">
                    <Label htmlFor="name">{t("name")}</Label>
                    <Input
                      id="name"
                      {...register("name")}
                      className="text-right"
                    />
                    {errors.name && (
                      <p className="text-right text-xs text-red-500">
                        {errors.name.message}
                      </p>
                    )}
                  </div>
                  {/* SKU */}
                  {/* <div className="grid gap-2">
                  <Label htmlFor="sku">{t("sku")}</Label>
                  {/* <Input
                    id="sku"
                    type="text"
                    {...register("sku")}
                    className="text-right"
                  /> 
                  {errors.sku && (
                    <p className="text-right text-xs text-red-500">
                      {errors.sku.message}
                    </p>
                  )}
                </div> 
                {/* Barcode 
                <div className="grid gap-2">
                  <Label htmlFor="barcode">{t("barcode")}</Label>
                  <Input
                    id="barcode"
                    type="text"
                    {...register("barcode")}
                    className="text-right"
                  />
                  {errors.barcode && (
                    <p className="text-right text-xs text-red-500">
                      {errors.barcode.message}
                    </p>
                  )}
                </div>*/}
                </div>

                {/* Categorization: Category, Description, Brand */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Category ID */}
                  <div className="grid gap-2">
                    <Label htmlFor="categoryId">{t("categoryId")}</Label>
                    <SelectField
                      options={formData.categories}
                      value={watchedValues.categoryId}
                      action={(val) => setValue("categoryId", val)}
                      placeholder={t("categoryId") || "Select Category"}
                    />
                    {errors.categoryId && (
                      <p className="text-right text-xs text-red-500">
                        {errors.categoryId.message}
                      </p>
                    )}
                  </div>
                  {/* Description */}
                  <div className="grid gap-2">
                    <Label htmlFor="description">{t("description")}</Label>
                    <Input
                      id="description"
                      type="text"
                      {...register("description")}
                      className="text-right"
                    />
                    {errors.description && (
                      <p className="text-right text-xs text-red-500">
                        {errors.description.message}
                      </p>
                    )}
                  </div>
                  {/* Brand ID */}
                  <div className="grid gap-2">
                    <Label htmlFor="brandId">{t("brandId")}</Label>
                    <SelectField
                      options={formData.brands}
                      value={watchedValues.brandId}
                      action={(val) => setValue("brandId", val)}
                      placeholder={t("brandId") || "Select Brand"}
                    />
                    {errors.brandId && (
                      <p className="text-right text-xs text-red-500">
                        {errors.brandId.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Packaging: Type, Units per Packet, Packets per Carton */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Type */}
                  <div className="grid gap-2">
                    <Label htmlFor="type">{t("type")}</Label>
                    <SelectField
                      options={productTypeOptions}
                      value={watchedValues.type}
                      action={(val) =>
                        setValue("type", val as FormValues["type"])
                      }
                      placeholder={t("type") || "Select Type"}
                    />
                    {errors.type && (
                      <p className="text-right text-xs text-red-500">
                        {errors.type.message}
                      </p>
                    )}
                  </div>
                  {/* Units Per Packet */}
                  <div className="grid gap-2">
                    <Label htmlFor="unitsPerPacket">
                      {t("unitsPerPacket")}
                    </Label>
                    <Input
                      id="unitsPerPacket"
                      type="number"
                      {...register("unitsPerPacket", { valueAsNumber: true })}
                      className="text-right"
                    />
                    {errors.unitsPerPacket && (
                      <p className="text-right text-xs text-red-500">
                        {errors.unitsPerPacket.message}
                      </p>
                    )}
                  </div>
                  {/* Packets Per Carton */}
                  <div className="grid gap-2">
                    <Label htmlFor="packetsPerCarton">
                      {t("packetsPerCarton")}
                    </Label>
                    <Input
                      id="packetsPerCarton"
                      type="number"
                      {...register("packetsPerCarton", { valueAsNumber: true })}
                      className="text-right"
                    />
                    {errors.packetsPerCarton && (
                      <p className="text-right text-xs text-red-500">
                        {errors.packetsPerCarton.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Pricing: Cost, Unit Price, Packet Price */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Cost Price */}
                  <div className="grid gap-2">
                    <Label htmlFor="costPrice">{t("costPrice")}</Label>
                    <Input
                      id="costPrice"
                      type="number"
                      step="0.01"
                      {...register("costPrice", { valueAsNumber: true })}
                      className="text-right"
                    />
                    {errors.costPrice && (
                      <p className="text-right text-xs text-red-500">
                        {errors.costPrice.message}
                      </p>
                    )}
                  </div>
                  {/* Price Per Unit */}
                  <div className="grid gap-2">
                    <Label htmlFor="pricePerUnit">{t("pricePerUnit")}</Label>
                    <Input
                      id="pricePerUnit"
                      type="number"
                      step="0.01"
                      {...register("pricePerUnit", { valueAsNumber: true })}
                      className="text-right"
                    />
                    {errors.pricePerUnit && (
                      <p className="text-right text-xs text-red-500">
                        {errors.pricePerUnit.message}
                      </p>
                    )}
                  </div>
                  {/* Price Per Packet */}
                  <div className="grid gap-2">
                    <Label htmlFor="pricePerPacket">
                      {t("pricePerPacket")}
                    </Label>
                    <Input
                      id="pricePerPacket"
                      type="number"
                      step="0.01"
                      {...register("pricePerPacket", { valueAsNumber: true })}
                      className="text-right"
                    />
                    {errors.pricePerPacket && (
                      <p className="text-right text-xs text-red-500">
                        {errors.pricePerPacket.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Wholesale Pricing and Weight/Dimensions */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Price Per Carton */}
                  <div className="grid gap-2">
                    <Label htmlFor="pricePerCarton">
                      {t("pricePerCarton")}
                    </Label>
                    <Input
                      id="pricePerCarton"
                      type="number"
                      step="0.01"
                      {...register("pricePerCarton", { valueAsNumber: true })}
                      className="text-right"
                    />
                    {errors.pricePerCarton && (
                      <p className="text-right text-xs text-red-500">
                        {errors.pricePerCarton.message}
                      </p>
                    )}
                  </div>
                  {/* Wholesale Price */}
                  <div className="grid gap-2">
                    <Label htmlFor="wholesalePrice">
                      {t("wholesalePrice")}
                    </Label>
                    <Input
                      id="wholesalePrice"
                      type="number"
                      step="0.01"
                      {...register("wholesalePrice", { valueAsNumber: true })}
                      className="text-right"
                    />
                    {errors.wholesalePrice && (
                      <p className="text-right text-xs text-red-500">
                        {errors.wholesalePrice.message}
                      </p>
                    )}
                  </div>
                  {/* Min Wholesale Quantity */}
                  <div className="grid gap-2">
                    <Label htmlFor="minWholesaleQty">
                      {t("minWholesaleQty")}
                    </Label>
                    <Input
                      id="minWholesaleQty"
                      type="number"
                      {...register("minWholesaleQty", { valueAsNumber: true })}
                      className="text-right"
                    />
                    {errors.minWholesaleQty && (
                      <p className="text-right text-xs text-red-500">
                        {errors.minWholesaleQty.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Shipping Details and Logistics */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  {/* Weight */}

                  {/* Dimensions */}
                  <div className="grid gap-2">
                    <Label htmlFor="dimensions">{t("dimensions")} di</Label>
                    <Input
                      id="dimensions"
                      type="text"
                      {...register("dimensions")}
                      className="text-right"
                    />
                    {errors.dimensions && (
                      <p className="text-right text-xs text-red-500">
                        {errors.dimensions.message}
                      </p>
                    )}
                  </div>
                  {/* Supplier ID */}
                  <div className="grid gap-2">
                    <Label htmlFor="supplierId">{t("supplierId")}</Label>
                    <SelectField
                      options={formData.suppliers}
                      value={watchedValues.supplierId}
                      action={(val) => setValue("supplierId", val)}
                      placeholder={t("supplierId") || "Select Supplier"}
                    />
                    {errors.supplierId && (
                      <p className="text-right text-xs text-red-500">
                        {errors.supplierId.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Warehouse and Status */}
                <div className="grid grid-cols-1 gap-6 md:w-2/3 md:grid-cols-2">
                  {/* Warehouse ID */}
                  <div className="grid gap-2">
                    <Label htmlFor="warehouseId">{t("warehouseId")}</Label>
                    <SelectField
                      options={formData.warehouses}
                      value={watchedValues.warehouseId}
                      action={(val) => setValue("warehouseId", val)}
                      placeholder={t("warehouseId") || "Select Warehouse"}
                    />
                    {errors.warehouseId && (
                      <p className="text-right text-xs text-red-500">
                        {errors.warehouseId.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="min-w-[100px]"
                >
                  {isSubmitting || loading ? t("loading") : t("save")}
                </Button>
              </div>
            </ScrollArea>
          </form>
        </CardContent>
      </Card>
    </ScrollArea>
  );
}
