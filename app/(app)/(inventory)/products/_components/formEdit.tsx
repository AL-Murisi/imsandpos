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
import { UpdateProductFormValues, UpdateProducts } from "@/lib/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import WarehouseForm from "@/components/forms/warehouseShortcut";
import SupplierForm from "@/components/forms/suppliershortcut";
import CategoryForm from "@/components/forms/catigresShortcut";
import { Check, Plus, Trash2 } from "lucide-react";
import dynamic from "next/dynamic";

const LiveBarcodeScanner = dynamic(
  () => import("@/app/(app)/(sales)/cashiercontrol/_components/barcodetesting"),
  { ssr: false },
);

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
  const [openScanner, setOpenScanner] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pricingMode, setPricingMode] = useState<
    "full" | "cartonUnit" | "cartonOnly"
  >(product?.type ?? "full");
  const [last, setLast] = useState<{ text: string; format: string } | null>(
    null,
  );

  const { user } = useAuth();
  const isUpdatingRef = useRef(false);

  if (!user) return null;

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<UpdateProductFormValues>({
    resolver: zodResolver(UpdateProducts),
  });

  const watchedCategoryId = watch("categoryId");

  const t = useTranslations("productForm");
  const sellingUnits = watch("sellingUnits");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sellingUnits",
  });
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
      barcode: product.barcode || "",
      categoryId: product.categoryId || "",

      description: product.description || "",

      wholesalePrice: product.wholesalePrice || undefined,
      minWholesaleQty: product.minWholesaleQty || undefined,
      dimensions: product.dimensions || "",
      type: product.type || "cartonOnly", // ✅ Keep original typesellingUnits: product.sellingUnits?.length > 0
      sellingUnits:
        product.sellingUnits?.length > 0
          ? product.sellingUnits.map((u: any) => ({
              id: u.id,
              name: u.name,
              nameEn: u.nameEn,
              unitsPerParent: u.unitsPerParent,
              price: u.price,
              isBase: u.isBase,
              // إذا كان لديك حقل للكمية في قاعدة البيانات لكل وحدة
              stock: u.stock || 0,
            }))
          : [
              {
                id: "unit-1",
                name: "حبة",
                nameEn: "Unit",
                unitsPerParent: 1,
                price: 0,
                isBase: true,
              },
            ],
    });
  }, [product?.id, reset]);

  // ✅ Auto-calculate prices for full mode - FIXED

  // ✅ Auto-calculate prices for cartonUnit mode - FIXED

  const onSubmit = async (data: UpdateProductFormValues) => {
    try {
      setIsSubmitting(true);

      const payload: UpdateProductFormValues = {
        ...data,
      };
      await UpdateProduct(payload, user.companyId, user.userId);
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

    // 1. Get the price of the Base Unit (the very first unit at index 0)
    const basePrice = currentUnits[0]?.price || 0;

    // 2. Get the total base units entered for THIS specific level (e.g., 360)
    const totalBaseUnits = currentUnits[index]?.unitsPerParent || 0;

    // 3. Final Price = Base Price * Total Units in this level
    // Example: 2.5 (price) * 360 (units) = 900
    const calculatedPrice = basePrice * totalBaseUnits;

    setValue(
      `sellingUnits.${index}.price`,
      Number(calculatedPrice.toFixed(2)),
      {
        shouldValidate: true,
      },
    );
  };
  function toDateTimeLocal(value?: string | Date) {
    if (!value) return "";
    const date = typeof value === "string" ? new Date(value) : value;
    return date.toISOString().slice(0, 16);
  }

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

              {/* Warehouse and Dimensions */}
            </div>{" "}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
            </div>{" "}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                  id="barcode"
                  type="text"
                  inputMode="numeric"
                  {...register("barcode", {})}
                  className="text-right"
                  placeholder="Enter barcode"
                />
                {errors.barcode && (
                  <p className="text-right text-xs text-red-500">
                    {errors.barcode.message}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenScanner(true)}
                >
                  Scan barcode
                </Button>
              </div>
              {/* <Dailogreuse
                open={opens}
                setOpen={setOpens}
                btnLabl="تعديل"
                style="w-full max-w-[1400px] overflow-y-auto rounded-lg p-6 xl:max-w-[1600px]"
                titel="قم بتحديث تفاصيل المنتج"
                description={`تعديل المنتج: ${product?.name}`}
              >
                {/* <BarcodeScanner
                  action={(result) => setValue("barcode", result.text)}
                /> */}
              {/* </Dailogreuse>{" "} */}
            </div>
            <div className="w-90 md:w-1/2">
              <LiveBarcodeScanner
                opened={openScanner}
                action={() => setOpenScanner(false)}
                onDetected={(code) => {
                  setValue("barcode", code);
                  console.log(code);
                  setOpenScanner(false);
                }}
              />
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
                          عدد {sellingUnits[0]?.name || "الوحدات الأساسية"} في
                          هذه الوحدة ({field.name || "الوحدة الحالية"})
                        </Label>
                        <Input
                          type="number"
                          {...register(`sellingUnits.${index}.unitsPerParent`, {
                            valueAsNumber: true,
                          })}
                          /* Example: if Base is 'حبة', placeholder shows 'مثال: 440 حبة' */
                          placeholder={`مثال: 12 ${sellingUnits[0]?.name || ""}`}
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
                    className="rounded-lg p-3 text-center shadow-sm"
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

          <Button
            disabled={isSubmitting}
            type="submit"
            className="w-full"
            size="lg"
          >
            {isSubmitting ? "جاري الحفظ..." : "حفظ "}
          </Button>
        </form>
      </ScrollArea>
    </Dailogreuse>
  );
}
