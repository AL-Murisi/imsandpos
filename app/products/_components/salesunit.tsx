import React, { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Dailogreuse from "@/components/common/dailogreuse";

interface SellingUnit {
  name: string;
  key: string;
  ratio: number;
  price: number;
}

interface SellingUnitsConfig {
  baseUnit: string;
  units: SellingUnit[];
}

export default function SellingUnitsManager() {
  const [config, setConfig] = useState<SellingUnitsConfig>({
    baseUnit: "unit",
    units: [
      { name: "حبة", key: "unit", ratio: 1, price: 10 },
      { name: "جوته", key: "packet", ratio: 12, price: 115 },
      { name: "شده", key: "bundle", ratio: 6, price: 65 },
      { name: "كرتون", key: "carton", ratio: 72, price: 820 },
    ],
  });
  const [open, setOpen] = useState(false);

  const addUnit = () => {
    setConfig({
      ...config,
      units: [...config.units, { name: "", key: "", ratio: 1, price: 0 }],
    });
  };

  const removeUnit = (index: number) => {
    const newUnits = config.units.filter((_, i) => i !== index);
    setConfig({ ...config, units: newUnits });
  };

  const updateUnit = (
    index: number,
    field: keyof SellingUnit,
    value: string | number,
  ) => {
    const newUnits = [...config.units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    setConfig({ ...config, units: newUnits });
  };

  const handleSave = () => {
    console.log("Saving config:", JSON.stringify(config, null, 2));
    alert("تم حفظ وحدات البيع بنجاح!");
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl=" وحدات البيع"
      style="w-full max-w-[1200px] overflow-y-auto rounded-lg p-6 xl:max-w-[1300px]"
      description="أدخل تفاصيل المنتج واحفظه"
    >
      <ScrollArea className="max-h-[85vh]" dir="rtl">
        {/* <div
          className="mx-auto max-w-4xl rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800"
          dir="rtl"
        > */}
        <div className="mb-6">
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            إعدادات وحدات البيع
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            قم بتخصيص وحدات البيع حسب احتياجاتك (حبة، جوته، شده، كرتون، إلخ)
          </p>
        </div>

        {/* Base Unit Selection */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            الوحدة الأساسية (أصغر وحدة)
          </label>
          <select
            value={config.baseUnit}
            onChange={(e) => setConfig({ ...config, baseUnit: e.target.value })}
            className="w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            {config.units.map((unit) => (
              <option key={unit.key} value={unit.key}>
                {unit.name} ({unit.key})
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            ⚠️ المخزون يُحفظ دائماً بالوحدة الأساسية
          </p>
        </div>

        {/* Units List */}
        <div className="space-y-4">
          {config.units.map((unit, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-300 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                {/* Display Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    اسم الوحدة
                  </label>
                  <input
                    type="text"
                    value={unit.name}
                    onChange={(e) => updateUnit(index, "name", e.target.value)}
                    placeholder="مثال: حبة، جوته، شده"
                    className="w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>

                {/* Key */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    المفتاح (بالإنجليزية)
                  </label>
                  <input
                    type="text"
                    value={unit.key}
                    onChange={(e) =>
                      updateUnit(index, "key", e.target.value.toLowerCase())
                    }
                    placeholder="unit, packet, bundle"
                    className="w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>

                {/* Ratio */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    النسبة (كم حبة)
                  </label>
                  <input
                    type="number"
                    value={unit.ratio}
                    onChange={(e) =>
                      updateUnit(index, "ratio", Number(e.target.value))
                    }
                    min="1"
                    className="w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    السعر
                  </label>
                  <input
                    type="number"
                    value={unit.price}
                    onChange={(e) =>
                      updateUnit(index, "price", Number(e.target.value))
                    }
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-gray-300 bg-white p-2 text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>

                {/* Delete Button */}
                <div className="flex items-end">
                  <button
                    onClick={() => removeUnit(index)}
                    disabled={config.units.length === 1}
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-red-500 p-2 text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    <Trash2 size={16} />
                    حذف
                  </button>
                </div>
              </div>

              {/* Visual Example */}
              <div className="mt-3 rounded bg-blue-100 p-2 text-sm text-gray-700 dark:bg-blue-900/30 dark:text-gray-300">
                📦 {unit.name} واحد = {unit.ratio} من الوحدة الأساسية
                {unit.ratio > 1 &&
                  ` (${(unit.price / unit.ratio).toFixed(2)} لكل وحدة أساسية)`}
              </div>
            </div>
          ))}
        </div>

        {/* Add Unit Button */}
        <button
          onClick={addUnit}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-green-500 p-3 font-medium text-white hover:bg-green-600"
        >
          <Plus size={20} />
          إضافة وحدة بيع جديدة
        </button>

        {/* Preview Section */}
        <div className="mt-6 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
          <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100">
            مثال: إذا كان لديك 100{" "}
            {config.units.find((u) => u.key === config.baseUnit)?.name}
          </h3>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            {config.units.map((unit) => {
              const baseUnit = config.units.find(
                (u) => u.key === config.baseUnit,
              );
              const quantity =
                unit.key === config.baseUnit
                  ? 100
                  : (100 / unit.ratio).toFixed(2);
              return (
                <div key={unit.key} className="flex justify-between">
                  <span>• يمكن بيعها كـ:</span>
                  <strong>
                    {quantity} {unit.name}
                  </strong>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 p-4 text-lg font-bold text-white hover:bg-blue-700"
        >
          <Save size={24} />
          حفظ التكوين
        </button>

        {/* JSON Output (for debugging) */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
            عرض JSON (للمطورين)
          </summary>
          <pre className="mt-2 max-h-60 overflow-auto rounded bg-gray-100 p-4 text-xs dark:bg-gray-900">
            {JSON.stringify(config, null, 2)}
          </pre>
        </details>
        {/* </div> */}
      </ScrollArea>
    </Dailogreuse>
  );
}
