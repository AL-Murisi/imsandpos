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
import { CreateProductInput, CreateProductSchema } from "@/lib/zod";

interface Option {
  id: string;
  name: string;
}

// Arabic to English transliteration map
const arabicToEnglish: { [key: string]: string } = {
  ا: "A",
  أ: "A",
  إ: "A",
  آ: "A",
  ب: "B",
  ت: "T",
  ث: "TH",
  ج: "J",
  ح: "H",
  خ: "KH",
  د: "D",
  ذ: "DH",
  ر: "R",
  ز: "Z",
  س: "S",
  ش: "SH",
  ص: "S",
  ض: "D",
  ط: "T",
  ظ: "Z",
  ع: "A",
  غ: "GH",
  ف: "F",
  ق: "Q",
  ك: "K",
  ل: "L",
  م: "M",
  ن: "N",
  ه: "H",
  و: "W",
  ي: "Y",
  ى: "Y",
  ة: "H",
  ئ: "Y",
  ؤ: "W",
};

// Function to transliterate Arabic to English
const transliterateArabic = (text: string): string => {
  return text
    .split("")
    .map((char) => arabicToEnglish[char] || char)
    .join("")
    .replace(/[^A-Z]/g, "") // Keep only English letters
    .toUpperCase();
};

// Function to generate SKU from product name, category, and random number
const generateSKU = (productName: string, categoryName: string): string => {
  // Transliterate Arabic to English and get first 3 letters
  const namePart = transliterateArabic(productName)
    .substring(0, 3)
    .padEnd(3, "X"); // Pad with X if less than 3 letters

  // Transliterate category and get first 2 letters
  const categoryPart = transliterateArabic(categoryName)
    .substring(0, 2)
    .padEnd(2, "X");

  // Generate random 4-digit number
  const randomPart = Math.floor(1000 + Math.random() * 9000);

  return `${namePart}-${categoryPart}-${randomPart}`;
};

export default function ProductForm() {
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

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<CreateProductInput>({
    resolver: zodResolver(CreateProductSchema),
  });

  // Watch form values
  const watchedWarehouseId = watch("warehouseId");
  const watchedCategoryId = watch("categoryId");
  const watchedBrandId = watch("brandId");
  const watchedSupplierId = watch("supplierId");
  const watchedType = watch("type");

  const watchedName = watch("name");
  const watchedSku = watch("sku");

  const t = useTranslations("productForm");
  const { user } = useAuth();

  // Fetch all form data
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

  // Auto-generate SKU when name or category changes
  useEffect(() => {
    if (watchedName && watchedCategoryId) {
      // Find the category name from the ID
      const category = formData.categories.find(
        (cat) => cat.id === watchedCategoryId,
      );

      if (category) {
        const generatedSKU = generateSKU(watchedName, category.name);
        setValue("sku", generatedSKU);
      }
    }
  }, [watchedName, watchedCategoryId, formData.categories, setValue]);

  const onSubmit = async (data: CreateProductInput) => {
    console.log("Submitted:", data);

    try {
      setIsSubmitting(true);
      if (user) {
        await CreateProduct(data, user.userId);
        toast.success("✅ تم إضافة المنتج بنجاح!");
        reset();
      }
    } catch (error) {
      toast.error("❌ حدث خطأ أثناء إضافة المنتج");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const productTypeOptions = [
    { id: "single", name: "Single Product" },
    { id: "bundle", name: "Bundle" },
    { id: "variant", name: "Variant" },
  ];

  const statusOptions = [
    { id: "active", name: "Active" },
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
                {/* SKU - Auto-generated but editable */}
                <div className="grid gap-2">
                  <Label htmlFor="sku" className="flex items-center gap-2">
                    {t("sku")}
                    <span className="text-muted-foreground text-xs">
                      (تلقائي)
                    </span>
                  </Label>
                  <Input
                    id="sku"
                    type="text"
                    {...register("sku")}
                    className="bg-muted/50 text-right"
                    placeholder="سيتم التوليد تلقائياً"
                  />
                  {errors.sku && (
                    <p className="text-right text-xs text-red-500">
                      {errors.sku.message}
                    </p>
                  )}
                </div>
                {/* Barcode */}
                {/* <div className="grid gap-2">
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
                </div> */}{" "}
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
              </div>

              {/* Categorization: Category, Description, Brand */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* Category ID */}

                {/* Description */}

                {/* Brand ID */}
                {/* <div className="grid gap-2">
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
                </div> */}
              </div>

              {/* Packaging: Type, Units per Packet, Packets per Carton */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {/* <div className="grid gap-2">
                  <Label htmlFor="type">{t("type")}</Label>
                  <SelectField
                    options={productTypeOptions}
                    value={watchedType}
                    action={(val) =>
                      setValue("type", val as CreateProductInput["type"])
                    }
                    placeholder={t("type") || "Select Type"}
                  />
                  {errors.type && (
                    <p className="text-right text-xs text-red-500">
                      {errors.type.message}
                    </p>
                  )}
                </div> */}
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

                {/* Warehouse and Status */}
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
