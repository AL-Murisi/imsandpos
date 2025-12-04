"use client";
import { UpdateProduct } from "@/lib/actions/Product";
import { fetchAllFormData } from "@/lib/actions/roles";
import Dailogreuse from "@/components/common/dailogreuse";
import { SelectField } from "@/components/common/selectproduct";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/context/AuthContext";
import { CreateProductInput, CreateProductSchema } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface Option {
  id: string;
  name: string;
}

interface ProductEditFormProps {
  product: any;
  type: "full" | "cartonUnit" | "cartonOnly";
  onSuccess?: () => void;
}

export default function ProductEditForm({
  product,
  type,
  onSuccess,
}: ProductEditFormProps) {
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

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricingMode, setPricingMode] = useState<
    "full" | "cartonUnit" | "cartonOnly"
  >(product?.type ?? "full");

  const { user } = useAuth();
  const isUpdatingRef = useRef(false);

  if (!user) return null;

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
  const unitsPerPacket = watch("unitsPerPacket");
  const packetsPerCarton = watch("packetsPerCarton");
  const pricePerCarton = watch("pricePerCarton");
  const pricePerUnit = watch("pricePerUnit");
  const pricePerPacket = watch("pricePerPacket");
  const expiredAt = watch("expiredAt");
  const t = useTranslations("productForm");

  // ✅ Load form options once on mount
  useEffect(() => {
    if (!open) {
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchAllFormData(user.companyId);
        setFormData(data);
      } catch (error) {
        console.error("Error fetching form data:", error);
        toast.error("خطأ في تحميل البيانات");
      } finally {
        setLoading(false);
      }
    };
    if (user?.companyId) fetchData();
  }, [open]); // ✅ Run only once on mount

  // ✅ Populate form with product data when product changes
  useEffect(() => {
    if (!product) return;

    // ✅ Determine pricing mode based on existing product.type

    setPricingMode(product?.type);

    reset({
      name: product.name || "",
      sku: product.sku || "",
      categoryId: product.categoryId || "",
      supplierId: product.supplierId || "",
      warehouseId: product.warehouseId || "",
      description: product.description || "",
      unitsPerPacket: product.unitsPerPacket || 0,
      packetsPerCarton: product.packetsPerCarton || 0,
      costPrice: product.costPrice || undefined,
      pricePerUnit: product.pricePerUnit || undefined,
      pricePerPacket: product.pricePerPacket || undefined,
      pricePerCarton: product.pricePerCarton || undefined,
      wholesalePrice: product.wholesalePrice || undefined,
      minWholesaleQty: product.minWholesaleQty || undefined,
      dimensions: product.dimensions || "",
      type: product.type || "cartonOnly", // ✅ Keep original type
    });
  }, [product?.id, reset]);

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
    }
  }, [pricePerCarton, unitsPerPacket, pricingMode]);

  const onSubmit = async (data: CreateProductInput) => {
    try {
      setIsSubmitting(true);
      await UpdateProduct(data, user.companyId, user.userId);
      toast.success("✅ تم تحديث المنتج بنجاح!");
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("❌ حدث خطأ أثناء تحديث المنتج");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="تعديل"
      style="w-full max-w-[1400px] overflow-y-auto rounded-lg p-6 xl:max-w-[1600px]"
      titel="قم بتحديث تفاصيل المنتج"
      description={`تعديل المنتج: ${product?.name}`}
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
                    setValue("pricePerPacket", 0);
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
                  بيع بالوحدة والكرتونة فقط
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
                />
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
                  {...register("packetsPerCarton", { valueAsNumber: true })}
                  className="text-right"
                />
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

          {pricingMode === "cartonUnit" && (
            <div className="grid gap-2">
              <Label htmlFor="unitsPerPacket">عدد الوحدات في الكرتونة</Label>
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
          )}

          {/* Product Details */}
          <div className="grid gap-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="name">اسم المنتج</Label>
                <Input id="name" {...register("name")} className="text-right" />
                {errors.name && (
                  <p className="text-right text-xs text-red-500">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sku">الرمز (SKU)</Label>
                <Input
                  id="sku"
                  type="text"
                  {...register("sku")}
                  disabled
                  className="bg-gray-100 text-right"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="categoryId">الفئة</Label>
                <SelectField
                  options={formData.categories}
                  value={watchedCategoryId}
                  action={(val) => setValue("categoryId", val)}
                  placeholder="اختر الفئة"
                />
                {errors.categoryId && (
                  <p className="text-right text-xs text-red-500">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>
            </div>

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
                  />
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
                  </div>
                )}
                {pricingMode === "cartonOnly" && (
                  <p className="text-right text-sm text-gray-600">
                    بيع بالكرتونة فقط
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
              </div>
            </div>

            {/* Additional Fields */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="warehouseId">المستودع</Label>
                <SelectField
                  options={formData.warehouses}
                  value={watchedWarehouseId}
                  action={(val) => setValue("warehouseId", val)}
                  placeholder="اختر المستودع"
                />
                {errors.warehouseId && (
                  <p className="text-right text-xs text-red-500">
                    {errors.warehouseId.message}
                  </p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="supplierId">المورد</Label>
                <SelectField
                  options={formData.suppliers}
                  value={watchedSupplierId}
                  action={(val) => setValue("supplierId", val)}
                  placeholder="اختر المورد"
                />
                {errors.supplierId && (
                  <p className="text-right text-xs text-red-500">
                    {errors.supplierId.message}
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
              {/* <div className="grid gap-2">
              <Label htmlFor="dimensions">الأبعاد</Label>
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
            </div> */}

              <div className="grid gap-2">
                <Label htmlFor="description">الوصف</Label>
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
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || loading}
              className="min-w-[120px] bg-green-600 hover:bg-green-700"
            >
              {isSubmitting || loading ? "جاري الحفظ..." : "حفظ التعديلات"}
            </Button>
          </div>
        </form>
      </ScrollArea>
    </Dailogreuse>
  );
}
