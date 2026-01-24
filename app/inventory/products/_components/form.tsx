"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateProductInputs, CreateProductSchemas } from "@/lib/zod";
import Dailogreuse from "@/components/common/dailogreuse";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SelectField } from "@/components/common/selectproduct";
import WarehouseForm from "@/components/forms/warehouseShortcut";
import SupplierForm from "@/components/forms/suppliershortcut";
import CategoryForm from "@/app/inventory/categories/_components/form";
import { CreateProduct } from "@/lib/actions/Product";
import { useAuth } from "@/lib/context/AuthContext";
import { toast } from "sonner";
interface Option {
  id: string;
  name: string;
}
interface ExpenseFormProps {
  formData: {
    warehouses: Option[];
    categories: Option[];
    brands: Option[];
    suppliers: Option[];
  };
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
export default function ProductForm({ formData }: ExpenseFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProductInputs>({
    resolver: zodResolver(CreateProductSchemas),
    defaultValues: {
      sellingUnits: [
        {
          id: "unit-1",
          name: "حبة",
          nameEn: "Unit",
          unitsPerParent: 1,
          price: 0,
          isBase: true,
        },
      ],
    },
  });
  const { user } = useAuth();
  const isUpdatingRef = useRef(false);

  if (!user) return;
  const watchedWarehouseId = watch("warehouseId");
  const watchedCategoryId = watch("categoryId");
  const watchedSupplierId = watch("supplierId");
  const watchedName = watch("name");
  // const unitsPerPacket = watch("unitsPerPacket");
  // const packetsPerCarton = watch("packetsPerCarton");
  // const pricePerCarton = watch("pricePerCarton");
  // const pricePerUnit = watch("pricePerUnit");
  // const pricePerPacket = watch("pricePerPacket");
  const { fields, append, remove } = useFieldArray({
    control,
    name: "sellingUnits",
  });
  const [open, setOpen] = useState(false);
  const sellingUnits = watch("sellingUnits");
  useEffect(() => {
    // سجل للتصحيح: تأكد أن القيم تصل فعلاً عند التغيير
    console.log("Watching:", { watchedName, watchedCategoryId });

    if (watchedName && watchedCategoryId) {
      // استخدم == بدلاً من === لتجنب مشاكل النوع (string vs number)
      const category = formData.categories.find(
        (cat) => String(cat.id) === String(watchedCategoryId),
      );

      if (category) {
        const generatedSKU = generateSKU(watchedName, category.name);
        console.log("Generated SKU:", generatedSKU); // للتأكد من نجاح التوليد
        setValue("sku", generatedSKU, { shouldValidate: true });
      } else {
        console.warn("Category not found for ID:", watchedCategoryId);
      }
    }
  }, [watchedName, watchedCategoryId, formData.categories, setValue]);
  // 🔹 إضافة وحدة جديدة
  const addSellingUnit = () => {
    append({
      id: `unit-${Date.now()}`,
      name: "",
      nameEn: "",
      unitsPerParent: 1,
      price: 0,
      isBase: false,
    });
  };

  // 🔹 حساب السعر التلقائي بناءً على الوحدة الأساسية
  // 🔹 حساب السعر التلقائي بناءً على تسلسل الوحدات
  const calculatePrice = (index: number) => {
    const currentUnits = watch("sellingUnits");
    if (!currentUnits || index === 0) return;

    // 1. جلب سعر الوحدة الأساسية (الحبة)
    const basePrice = currentUnits[0]?.price || 0;

    // 2. حساب إجمالي عدد الحبات في هذه الوحدة
    // المعادلة: (عدد الحبات في الوحدة السابقة) × (معامل تحويل الوحدة الحالية)
    let totalUnitsInThisLevel = 1;
    for (let i = 1; i <= index; i++) {
      const multiplier = currentUnits[i]?.unitsPerParent || 1;
      totalUnitsInThisLevel *= multiplier;
    }

    // 3. السعر النهائي = سعر الحبة × إجمالي الحبات في هذه الوحدة
    const calculatedPrice = basePrice * totalUnitsInThisLevel;

    setValue(
      `sellingUnits.${index}.price`,
      Number(calculatedPrice.toFixed(2)),
      {
        shouldValidate: true,
      },
    );
  };
  const onSubmit = async (data: CreateProductInputs) => {
    try {
      // setIsSubmitting(true);

      if (user) {
        await CreateProduct(data, user.userId, user.companyId);
        toast.success("✅ تم إضافة المنتج بنجاح!");
      }
    } catch (error) {
      toast.error("❌ حدث خطأ أثناء إضافة المنتج");
      console.error(error);
    } finally {
      // setIsSubmitting(false);
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
          {/* معلومات المنتج الأساسية */}
          <Card className="p-4">
            <h3 className="mb-4 text-lg font-semibold">معلومات المنتج</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-3">
                <Label>اسم المنتج</Label>
                <Input {...register("name")} placeholder="مثال: أرز أبيض" />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="grid gap-3">
                <Label>رمز SKU</Label>
                <Input
                  id="sku"
                  type="text"
                  {...register("sku")}
                  className="bg-muted/50 text-right"
                  placeholder="سيتم التوليد تلقائياً"
                />
              </div>

              <div className="grid gap-3">
                <Label>سعر التكلفة (للوحدة الأساسية)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...register("costPrice", { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
              {/* Warehouse and Dimensions */}
            </div>{" "}
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
              </div>{" "}
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
          </Card>

          {/* وحدات البيع المخصصة */}
          <Card className="p-4">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">وحدات البيع</h3>
              <Button type="button" onClick={addSellingUnit} size="sm">
                <Plus className="ml-2 h-4 w-4" />
                إضافة وحدة
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <Card
                  key={field.id}
                  className={`p-4 ${index === 0 ? "border-green-500" : ""}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {index === 0
                          ? "🟢 الوحدة الأساسية"
                          : `وحدة ${index + 1}`}
                      </span>
                      {index === 0 && (
                        <span className="text-xs text-gray-500">
                          (أصغر وحدة قابلة للبيع)
                        </span>
                      )}
                    </div>

                    {index > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <div className="grid gap-3">
                      <Label>اسم الوحدة (عربي)</Label>
                      <Input
                        {...register(`sellingUnits.${index}.name`)}
                        placeholder="مثال: علبة، كرتون"
                        disabled={index === 0}
                      />
                      {errors.sellingUnits?.[index]?.name && (
                        <p className="text-xs text-red-500">
                          {errors.sellingUnits[index]?.name?.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3">
                      <Label>اسم الوحدة (English)</Label>
                      <Input
                        {...register(`sellingUnits.${index}.nameEn`)}
                        placeholder="Box, Carton"
                        disabled={index === 0}
                      />
                    </div>

                    {index > 0 && (
                      <div className="grid gap-3">
                        <Label>
                          عدد {sellingUnits[index - 1]?.name || "الوحدات"} في
                          هذه الوحدة
                        </Label>
                        <Input
                          type="number"
                          {...register(`sellingUnits.${index}.unitsPerParent`, {
                            valueAsNumber: true,
                          })}
                          placeholder="مثال: 12"
                          onChange={() => calculatePrice(index)}
                        />
                      </div>
                    )}

                    <div className="grid gap-3">
                      <Label className="flex items-center gap-2">
                        السعر
                        {index > 0 && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => calculatePrice(index)}
                          >
                            <Check className="h-3 w-3" />
                            حساب تلقائي
                          </Button>
                        )}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        {...register(`sellingUnits.${index}.price`, {
                          valueAsNumber: true,
                        })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* عرض الحسابات */}
                  {index > 0 && sellingUnits[index]?.unitsPerParent > 0 && (
                    <div className="mt-3 rounded p-2 text-sm">
                      💡 {sellingUnits[index]?.name || "هذه الوحدة"} ={" "}
                      {sellingUnits[index]?.unitsPerParent}{" "}
                      {sellingUnits[index - 1]?.name || "وحدة"}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            {errors.sellingUnits && (
              <p className="mt-2 text-xs text-red-500">
                {errors.sellingUnits.message}
              </p>
            )}
          </Card>

          {/* ملخص الأسعار */}
          {sellingUnits && sellingUnits.length > 0 && (
            <Card className="p-4">
              <h4 className="mb-3 font-semibold">📊 ملخص الأسعار</h4>
              <div className="grid grid-cols-3 gap-3">
                {sellingUnits.map((unit, idx) => (
                  <div
                    key={idx}
                    className="bg-primary rounded-lg p-3 text-center shadow-sm"
                  >
                    <p className="text-xs text-gray-500">{unit.name}</p>
                    <p className="text-lg font-bold">
                      {unit.price?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Button type="submit" className="w-full" size="lg">
            حفظ المنتج
          </Button>
        </form>
      </ScrollArea>
    </Dailogreuse>
  );
}
