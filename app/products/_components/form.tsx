"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { CreateProduct } from "@/app/actions/Product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import CategoryForm from "@/components/forms/catigresShortcut";
import SupplierForm from "@/components/forms/suppliershortcut";
import WarehouseForm from "@/components/forms/warehouseShortcut";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateProductInput, CreateProductSchema } from "@/lib/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface Option {
  id: string;
  name: string;
}

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

const transliterateArabic = (text: string): string => {
  return text
    .split("")
    .map((char) => arabicToEnglish[char] || char)
    .join("")
    .replace(/[^A-Z]/g, "")
    .toUpperCase();
};

const generateSKU = (productName: string, categoryName: string): string => {
  const namePart = transliterateArabic(productName)
    .substring(0, 3)
    .padEnd(3, "X");
  const categoryPart = transliterateArabic(categoryName)
    .substring(0, 2)
    .padEnd(2, "X");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `${namePart}-${categoryPart}-${randomPart}`;
};
interface ExpenseFormProps {
  formData: {
    warehouses: Option[];
    categories: Option[];
    brands: Option[];
    suppliers: Option[];
  };
}
export default function ProductForm({ formData }: ExpenseFormProps) {
  const [open, setOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricingMode, setPricingMode] = useState<
    "full" | "cartonUnit" | "cartonOnly"
  >("full");

  const { user } = useAuth();
  const isUpdatingRef = useRef(false);

  if (!user) return;

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

  const watchedWarehouseId = watch("warehouseId");
  const watchedCategoryId = watch("categoryId");
  const watchedSupplierId = watch("supplierId");
  const watchedName = watch("name");
  const unitsPerPacket = watch("unitsPerPacket");
  const packetsPerCarton = watch("packetsPerCarton");
  const pricePerCarton = watch("pricePerCarton");
  const pricePerUnit = watch("pricePerUnit");
  const pricePerPacket = watch("pricePerPacket");

  const t = useTranslations("productForm");

  // ✅ Load form options once on mount

  // ✅ Auto-generate SKU when name or category changes
  useEffect(() => {
    if (watchedName && watchedCategoryId) {
      const category = formData.categories.find(
        (cat) => cat.id === watchedCategoryId,
      );
      if (category) {
        const generatedSKU = generateSKU(watchedName, category.name);
        setValue("sku", generatedSKU);
      }
    }
  }, [watchedName, watchedCategoryId, formData.categories]);

  // ✅ Auto-calculate prices for full mode - FIXED
  useEffect(() => {
    if (isUpdatingRef.current) return;

    if (
      pricingMode === "full" &&
      pricePerCarton &&
      unitsPerPacket &&
      packetsPerCarton &&
      pricePerCarton > 0
    ) {
      isUpdatingRef.current = true;
      const calculatedPricePerPacket = pricePerCarton / packetsPerCarton;
      setValue(
        "pricePerPacket",
        Math.round(calculatedPricePerPacket * 100) / 100,
      );
      setValue("type", "full");
      const calculatedPricePerUnit = calculatedPricePerPacket / unitsPerPacket;
      setValue("pricePerUnit", Math.round(calculatedPricePerUnit * 100) / 100);
      isUpdatingRef.current = false;
    }
  }, [pricePerCarton, unitsPerPacket, packetsPerCarton, pricingMode]);

  // ✅ Auto-calculate prices for cartonUnit mode - FIXED
  useEffect(() => {
    if (isUpdatingRef.current) return;

    if (
      pricingMode === "cartonUnit" &&
      pricePerCarton &&
      unitsPerPacket &&
      pricePerCarton > 0
    ) {
      isUpdatingRef.current = true;
      const calculatedPricePerUnit = pricePerCarton / unitsPerPacket;
      setValue("pricePerUnit", Math.round(calculatedPricePerUnit * 100) / 100);
      isUpdatingRef.current = false;
      setValue("type", "cartonUnit");
    } else {
      setValue("type", "cartonOnly");
    }
  }, [pricePerCarton, unitsPerPacket, pricingMode]);

  const onSubmit = async (data: CreateProductInput) => {
    try {
      setIsSubmitting(true);

      if (user) {
        await CreateProduct(data, user.userId, user.companyId);
        toast.success("✅ تم إضافة المنتج بنجاح!");
        reset({
          name: "",
          sku: "",
          categoryId: "",
          description: "",
          supplierId: "",
          unitsPerPacket: undefined,
          packetsPerCarton: undefined,
          costPrice: undefined,
          pricePerUnit: undefined,
          pricePerPacket: undefined,
          pricePerCarton: undefined,
          wholesalePrice: undefined,
          minWholesaleQty: undefined,
          warehouseId: "",
        });
        setOpen(false);
        setPricingMode("full");
      }
    } catch (error) {
      toast.error("❌ حدث خطأ أثناء إضافة المنتج");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إضافة  منتج"
      style="w-full max-w-[1200px] overflow-y-auto rounded-lg p-6 xl:max-w-[1300px]"
      description="أدخل تفاصيل المنتج واحفظه"
    >
      <ScrollArea className="max-h-[85vh]" dir="rtl">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
          {/* Pricing Mode Selection */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-right font-semibold">نموذج البيع</h3>

            <div className="mb-4 flex flex-col gap-3 md:flex-row">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={pricingMode === "full"}
                  onChange={() => {
                    setPricingMode("full");
                    setValue("packetsPerCarton", 0);
                  }}
                  className="cursor-pointer"
                />
                <span className="text-sm font-medium">
                  بيع متعدد المستويات (وحدة + عبوة + كرتونة)
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={pricingMode === "cartonUnit"}
                  onChange={() => {
                    setPricingMode("cartonUnit");
                    setValue("packetsPerCarton", 0);
                    setValue("pricePerPacket", 0);
                  }}
                  className="cursor-pointer"
                />
                <span className="text-sm font-medium">
                  بيع بالوحدة والكرتونة فقط (بدون عبوات وسيطة)
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={pricingMode === "cartonOnly"}
                  onChange={() => {
                    setPricingMode("cartonOnly");
                    setValue("unitsPerPacket", 0);
                    setValue("packetsPerCarton", 0);
                    setValue("pricePerUnit", 0);
                    setValue("pricePerPacket", 0);
                  }}
                  className="cursor-pointer"
                />
                <span className="text-sm font-medium">بيع بالكرتونة فقط</span>
              </label>
            </div>
          </div>

          {/* Packaging Fields */}

          {/* Product Details */}
          <div className="grid gap-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
              <div className="grid gap-2">
                <Label htmlFor="name">اسم المنتج</Label>
                <Input
                  id="name"
                  {...register("name")}
                  className="text-right"
                  placeholder="مثال: أرز أبيض"
                />
                {errors.name && (
                  <p className="text-right text-xs text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sku" className="flex items-center gap-2">
                  الرمز (SKU)
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

              <div className="grid gap-2">
                <Label htmlFor="categoryId">الفئة</Label>
                <SelectField
                  options={formData.categories}
                  value={watchedCategoryId}
                  action={(val) => setValue("categoryId", val)}
                  placeholder="اختر الفئة"
                  add={<CategoryForm />}
                />
                {errors.categoryId && (
                  <p className="text-right text-xs text-red-500">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>
              {pricingMode === "cartonUnit" && (
                <>
                  <div className="grid gap-2">
                    <Label htmlFor="unitsPerPacket">
                      عدد الوحدات في الكرتونة
                    </Label>
                    <Input
                      id="unitsPerPacket"
                      type="number"
                      {...register("unitsPerPacket", { valueAsNumber: true })}
                      className="text-right"
                      placeholder="مثال: 120 وحدة"
                    />

                    {errors.unitsPerPacket && (
                      <p className="text-right text-xs text-red-500">
                        {errors.unitsPerPacket.message}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
            {pricingMode === "full" && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label htmlFor="unitsPerPacket">
                    عدد الوحدات في العبوة الواحدة
                  </Label>
                  <Input
                    id="unitsPerPacket"
                    type="number"
                    {...register("unitsPerPacket", { valueAsNumber: true })}
                    className="text-right"
                    placeholder="مثال: 10 وحدات"
                  />
                  <p className="text-right text-xs text-gray-600">
                    (الوحدة = أصغر قطعة تباع)
                  </p>
                  {errors.unitsPerPacket && (
                    <p className="text-right text-xs text-red-500">
                      {errors.unitsPerPacket.message}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="packetsPerCarton">
                    عدد العبوات في الكرتونة
                  </Label>
                  <Input
                    id="packetsPerCarton"
                    type="number"
                    {...register("packetsPerCarton", {
                      valueAsNumber: true,
                    })}
                    className="text-right"
                    placeholder="مثال: 12 عبوة"
                  />
                  <p className="text-right text-xs text-gray-600">
                    (الكرتونة = أكبر وحدة تغليف)
                  </p>
                  {errors.packetsPerCarton && (
                    <p className="text-right text-xs text-red-500">
                      {errors.packetsPerCarton.message}
                    </p>
                  )}
                </div>

                {unitsPerPacket && packetsPerCarton && (
                  <div className="grid gap-2 rounded-lg p-3">
                    <p className="text-right text-sm font-medium text-gray-700">
                      الإجمالي لكل كرتونة:
                    </p>
                    <p className="text-right text-lg font-bold text-blue-600">
                      {unitsPerPacket * packetsPerCarton} وحدة
                    </p>
                  </div>
                )}
              </div>
            )}

            {pricingMode === "cartonOnly" && (
              <div className="rounded-lg p-3">
                <p className="text-right text-sm text-gray-600">
                  ✓ سيتم بيع المنتج بالكرتونة فقط - لا توجد خيارات بيع أخرى
                </p>
              </div>
            )}

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Cost Price */}
              <div className="rounded-lg border border-green-100 p-4">
                <h3 className="mb-4 text-right font-semibold text-green-900">
                  سعر الشراء من المورد
                </h3>
                <div className="grid gap-2">
                  <Label htmlFor="costPrice">سعر الشراء للوحدة</Label>
                  <Input
                    id="costPrice"
                    type="number"
                    step="0.01"
                    {...register("costPrice", { valueAsNumber: true })}
                    className="text-right"
                    placeholder="0.00"
                  />
                  <p className="text-right text-xs text-gray-600">
                    (ما تدفعه للمورد للوحدة الواحدة)
                  </p>
                  {errors.costPrice && (
                    <p className="text-right text-xs text-red-500">
                      {errors.costPrice.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Retail Pricing */}
              <div className="rounded-lg border border-amber-100 p-4">
                <h3 className="mb-4 text-right font-semibold text-amber-900">
                  أسعار البيع بالتجزئة
                </h3>
                {pricingMode === "full" && (
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <Label htmlFor="pricePerUnit">سعر الوحدة</Label>
                      <Input
                        id="pricePerUnit"
                        type="number"
                        step="0.01"
                        disabled
                        value={pricePerUnit || ""}
                        className="bg-gray-100 text-right"
                      />
                      <p className="text-right text-xs text-gray-600">
                        (تلقائي)
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pricePerPacket">سعر العبوة</Label>
                      <Input
                        id="pricePerPacket"
                        type="number"
                        step="0.01"
                        disabled
                        value={pricePerPacket || ""}
                        className="bg-gray-100 text-right"
                      />
                      <p className="text-right text-xs text-gray-600">
                        (تلقائي)
                      </p>
                    </div>
                  </div>
                )}
                {pricingMode === "cartonUnit" && (
                  <div className="grid gap-2">
                    <Label htmlFor="pricePerUnit">سعر الوحدة</Label>
                    <Input
                      id="pricePerUnit"
                      type="number"
                      step="0.01"
                      disabled
                      value={pricePerUnit || ""}
                      className="bg-gray-100 text-right"
                    />
                    <p className="text-right text-xs text-gray-600">
                      (تلقائي من سعر الكرتونة)
                    </p>
                  </div>
                )}
                {pricingMode === "cartonOnly" && (
                  <p className="text-right text-sm text-gray-600">
                    لا توجد أسعار للوحدة - بيع بالكرتونة فقط
                  </p>
                )}
              </div>

              {/* Bulk Pricing */}
              <div className="rounded-lg border border-purple-100 p-4">
                <h3 className="mb-4 text-right font-semibold text-purple-900">
                  أسعار البيع بالجملة
                </h3>
                <div className="space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="pricePerCarton">سعر الكرتونة</Label>
                    <Input
                      id="pricePerCarton"
                      type="number"
                      step="0.01"
                      {...register("pricePerCarton", { valueAsNumber: true })}
                      className="text-right"
                      placeholder="0.00"
                    />
                    {errors.pricePerCarton && (
                      <p className="text-right text-xs text-red-500">
                        {errors.pricePerCarton.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="wholesalePrice">السعر الجملي</Label>
                    <Input
                      id="wholesalePrice"
                      type="number"
                      step="0.01"
                      {...register("wholesalePrice", { valueAsNumber: true })}
                      className="text-right"
                      placeholder="0.00"
                    />
                    {errors.wholesalePrice && (
                      <p className="text-right text-xs text-red-500">
                        {errors.wholesalePrice.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="minWholesaleQty">الحد الأدنى</Label>
                    <Input
                      id="minWholesaleQty"
                      type="number"
                      {...register("minWholesaleQty", {
                        valueAsNumber: true,
                      })}
                      className="text-right"
                      placeholder="0"
                    />
                    {errors.minWholesaleQty && (
                      <p className="text-right text-xs text-red-500">
                        {errors.minWholesaleQty.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Warehouse and Dimensions */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="warehouseId">المستودع</Label>
                <SelectField
                  options={formData.warehouses}
                  value={watchedWarehouseId}
                  action={(val) => setValue("warehouseId", val)}
                  placeholder="اختر المستودع"
                  add={<WarehouseForm />}
                />
                {errors.warehouseId && (
                  <p className="text-right text-xs text-red-500">
                    {errors.warehouseId.message}
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>تاريخ الانتهاء</Label>
                <Input
                  type="datetime-local"
                  className="text-end"
                  {...register("expiredAt")}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="supplierId">المورد</Label>
                <SelectField
                  options={formData.suppliers}
                  value={watchedSupplierId}
                  action={(val) => setValue("supplierId", val)}
                  placeholder="اختر المورد"
                  add={<SupplierForm />}
                />
                {errors.supplierId && (
                  <p className="text-right text-xs text-red-500">
                    {errors.supplierId.message}
                  </p>
                )}
              </div>
              {/* <div className="hidden gap-2">
                <Label htmlFor="dimensions">الأبعاد</Label>
                <Input
                  id="dimensions"
                  type="text"
                  {...register("dimensions")}
                  className="text-right"
                  placeholder="مثال: 20x15x10 سم"
                />
                {errors.dimensions && (
                  <p className="text-right text-xs text-red-500">
                    {errors.dimensions.message}
                  </p>
                )}
              </div> */}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="min-w-[120px] bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? "جاري الحفظ..." : "حفظ المنتج"}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </Dailogreuse>
  );
}
