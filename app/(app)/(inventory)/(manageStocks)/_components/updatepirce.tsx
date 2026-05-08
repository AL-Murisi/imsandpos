"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { checkPriceMismatch } from "@/lib/inventory-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Trash2, Plus, RefreshCw, Info, LayoutDashboard } from "lucide-react";
import Dailogreuse from "@/components/common/dailogreuse";
import { updateSellingUnits } from "@/lib/actions/Product";
import { toast } from "sonner";

type SellingUnit = {
  id: string;
  name: string;
  nameEn?: string;
  unitsPerParent: number;
  price: number;
  isBase: boolean;
};

type InventoryLike = {
  id: string;
  productId: string;
  selectedUnitId: string;
  unitCost: number | string;
  sellingUnits: SellingUnit[];
};

interface PriceMismatchAlertProps {
  inventory: InventoryLike;
  action: (newCost: number, updatedUnits?: SellingUnit[]) => void; // الحفاظ على هذه كما هي لتحديث السعر
  // updateSellingUnits: (units: SellingUnit[]) => void; // الدالة الجديدة لتحديث المصفوفة
}

export function PriceMismatchAlert({
  inventory,
  action,
  // updateSellingUnits,
}: PriceMismatchAlertProps) {
  const [open, setOpen] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      sellingUnits: inventory.sellingUnits || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "sellingUnits",
  });

  const sellingUnits = watch("sellingUnits");

  // مزامنة البيانات عند فتح النافذة
  useEffect(() => {
    if (open) {
      reset({ sellingUnits: inventory.sellingUnits });
    }
  }, [open, inventory.sellingUnits, reset]);

  const result = useMemo(
    () =>
      checkPriceMismatch(
        Number(inventory.unitCost || 0),
        inventory.sellingUnits || [],
        inventory.selectedUnitId,
      ),
    [inventory.unitCost, inventory.sellingUnits, inventory.selectedUnitId],
  );

  const expectedCost = Number(result?.expectedCost || 0);

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

  const calculatePrice = (index: number) => {
    const baseUnit = sellingUnits[0];
    const currentUnit = sellingUnits[index];
    if (!baseUnit || !currentUnit || index === 0) return;

    const basePrice = baseUnit.price || 0;
    const totalBaseUnits = currentUnit.unitsPerParent || 0;
    const calculatedPrice = basePrice * totalBaseUnits;

    setValue(
      `sellingUnits.${index}.price`,
      Number(calculatedPrice.toFixed(2)),
      {
        shouldValidate: true,
      },
    );
  };

  // 🔹 دالة التسليم النهائية
  const onFormSubmit = (data: { sellingUnits: SellingUnit[] }) => {
    toast("تم تحديث وحدات البيع", {
      description: `السعر المتوقع: ${expectedCost}`,
    });
    action(expectedCost, data.sellingUnits);
    // await updateSellingUnits(data.sellingUnits);

    // 2. تحديث السعر المتوقع (الاستمرار في استخدام الأكشن الأصلية)

    setOpen(false);
  };

  return (
    <div
      className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs"
      dir="rtl"
    >
      <div className="flex flex-col gap-1">
        <p className="text-[13px] font-semibold text-amber-800">
          سعر التكلفة لا يتطابق مع تسعير الوحدة
        </p>
        <p className="font-medium text-amber-700">
          المُدخل:{" "}
          <span className="font-bold underline">{inventory.unitCost}</span> -
          المتوقع: <span className="font-bold underline">{expectedCost}</span>
        </p>
      </div>

      <div className="mt-2 flex gap-2">
        <Button
          className="h-7 text-[11px] text-amber-900"
          onClick={() => setOpen(true)}
        >
          تعديل الوحدات والأسعار
        </Button>
        <Button
          className="h-7 text-[11px]"
          onClick={() => action(expectedCost)}
        >
          اعتماد السعر المتوقع فقط
        </Button>
      </div>

      <Dailogreuse
        open={open}
        setOpen={setOpen}
        btnLabl="تعديل التسعير"
        style={"outline"}
      >
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4 p-1">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="text-sm font-bold text-gray-800">
              إدارة وحدات البيع
            </h4>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={addSellingUnit}
              className="h-8 text-xs"
            >
              <Plus className="ml-1 h-3 w-3" /> إضافة وحدة
            </Button>
          </div>

          <div className="custom-scrollbar max-h-[55vh] space-y-4 overflow-y-auto pr-1">
            {fields.map((field, index) => (
              <Card
                key={field.id}
                className={`p-4 transition-all ${index === 0 ? "border-green-500 bg-green-50/20" : "border-gray-200"}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${index === 0 ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
                  >
                    {index === 0
                      ? "🟢 الوحدة الأساسية"
                      : `📦 وحدة مستوى ${index + 1}`}
                  </span>
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-6 w-6 p-0 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-[10px]">الاسم (عربي)</Label>
                    <Input
                      {...register(`sellingUnits.${index}.name`)}
                      className="h-8 bg-white text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">الاسم (EN)</Label>
                    <Input
                      {...register(`sellingUnits.${index}.nameEn`)}
                      className="h-8 bg-white text-left text-xs"
                    />
                  </div>
                  {index > 0 ? (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-blue-700">
                        الكمية من ({sellingUnits[0]?.name})
                      </Label>
                      <Input
                        type="number"
                        {...register(`sellingUnits.${index}.unitsPerParent`, {
                          valueAsNumber: true,
                        })}
                        className="h-8 bg-white text-xs"
                        onChange={(e) => {
                          register(
                            `sellingUnits.${index}.unitsPerParent`,
                          ).onChange(e);
                          calculatePrice(index);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center pt-5">
                      <span className="text-[9px] text-gray-400">
                        الوحدة الأساسية
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label className="flex items-center justify-between text-[10px]">
                      السعر
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => calculatePrice(index)}
                          className="flex items-center gap-0.5 text-[9px] text-blue-600"
                        >
                          <RefreshCw className="h-2 w-2" /> تلقائي
                        </button>
                      )}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`sellingUnits.${index}.price`, {
                        valueAsNumber: true,
                      })}
                      className="h-8 bg-white text-xs"
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="flex items-center justify-between rounded border border-blue-100 bg-blue-50 p-2 text-[11px]">
              <span className="text-blue-700">التكلفة المتوقعة:</span>
              <span className="font-bold text-blue-800">{expectedCost}</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="submit"
                className="h-9 flex-1 bg-green-600 text-xs hover:bg-green-700"
              >
                حفظ الكل وتعديل السعر
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-9 text-xs"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </form>
      </Dailogreuse>
    </div>
  );
}


