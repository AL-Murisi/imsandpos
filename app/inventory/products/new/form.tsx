"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreateProduct } from "@/app/actions/createProduct";
import { fetchAllFormData } from "@/app/actions/roles";
import { SelectField } from "../_components/selectproduct";
import { useAuth } from "@/lib/context/AuthContext";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CreateProductSchema } from "@/lib/zod/product";

// Define the shape of the form values
type FormValues = z.infer<typeof CreateProductSchema>;

// Define the shape of the option objects for select fields
interface Option {
  id: string;
  name: string;
}

export default function ProductForm() {
  // State for options data fetched from the server
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Initialize useForm hook
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateProductSchema),
    // You can set default values here if needed
    // defaultValues: { ... }
  });

  // Watch form values for controlled components and SelectField updates
  const watchedWarehouseId = watch("warehouseId");
  const watchedCategoryId = watch("categoryId");
  const watchedBrandId = watch("brandId");
  const watchedSupplierId = watch("supplierId");
  const watchedType = watch("type");
  const watchedStatus = watch("status");

  // Get translations
  const t = useTranslations("productForm");
  const { user } = useAuth();

  // Fetch all form data (warehouses, categories, brands, suppliers)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchAllFormData();
        setFormData(data);
      } catch (error) {
        console.error("Error fetching form data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    console.log("Submitted:", data);

    try {
      if (user) {
        await CreateProduct(data, user.userId);
        setIsSubmitting(true);
        // TODO: Add toast/notification for success using t("created")
      }
      toast("✅ adding product sucessed");
      setIsSubmitting(false);
      reset();
    } catch (error) {
      toast("✅ adding product sucessed", error ?? "");

      // TODO: Add toast/notification for error using t("createError")
    }
  };

  // Options for Type and Status SelectFields (hardcoded, using translation keys)
  const productTypeOptions = [
    { id: "single", name: "Single Product" }, // Assuming a key like 'type_single' for product type
    { id: "bundle", name: "Bundle" },
    { id: "variant", name: "Variant" },
  ];

  const statusOptions = [
    { id: "active", name: "Active" }, // Assuming keys like 'status_active'
    { id: "inactive", name: "Inactive" },
  ];

  return (
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
                <div className="grid gap-2">
                  <Label htmlFor="sku">{t("sku")}</Label>
                  <Input
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
                {/* Barcode */}
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
                </div>
              </div>

              {/* Categorization: Category, Description, Brand */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Category ID */}
                <div className="grid gap-2">
                  <Label htmlFor="categoryId">{t("categoryId")}</Label>
                  <SelectField
                    options={formData.categories}
                    value={watchedCategoryId}
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
                    value={watchedBrandId}
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
                    value={watchedType}
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
                  <Label htmlFor="unitsPerPacket">{t("unitsPerPacket")}</Label>
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
                  <Label htmlFor="pricePerPacket">{t("pricePerPacket")}</Label>
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
                  <Label htmlFor="pricePerCarton">{t("pricePerCarton")}</Label>
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
                  <Label htmlFor="wholesalePrice">{t("wholesalePrice")}</Label>
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
                <div className="grid gap-2">
                  <Label htmlFor="weight">{t("weight")}</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.01"
                    {...register("weight", { valueAsNumber: true })}
                    className="text-right"
                  />
                  {errors.weight && (
                    <p className="text-right text-xs text-red-500">
                      {errors.weight.message}
                    </p>
                  )}
                </div>
                {/* Dimensions */}
                <div className="grid gap-2">
                  <Label htmlFor="dimensions">{t("dimensions")}</Label>
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
                    value={watchedSupplierId}
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
                    value={watchedWarehouseId}
                    action={(val) => setValue("warehouseId", val)}
                    placeholder={t("warehouseId") || "Select Warehouse"}
                  />
                  {errors.warehouseId && (
                    <p className="text-right text-xs text-red-500">
                      {errors.warehouseId.message}
                    </p>
                  )}
                </div>
                {/* Status */}
                <div className="grid gap-2">
                  <Label htmlFor="status">{t("status")}</Label>
                  <SelectField
                    options={statusOptions}
                    value={watchedStatus}
                    action={(val) =>
                      setValue("status", val as FormValues["status"])
                    }
                    placeholder={t("status") || "Select Status"}
                  />
                  {errors.status && (
                    <p className="text-right text-xs text-red-500">
                      {errors.status.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSubmitting || loading}
                className="min-w-[100px]"
              >
                {isSubmitting || loading ? t("loading") : t("save")}
              </Button>
            </div>
          </ScrollArea>
        </form>
      </CardContent>
    </Card>
  );
}

// NOTE: You will need to update your translation file (e.g., in `messages/ar.json` or equivalent)
// to include the Arabic translations for the new hardcoded options for 'type' and 'status'
// (e.g., "type_single": "منتج فردي", "status_active": "نشط", etc.)
