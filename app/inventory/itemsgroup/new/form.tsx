import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";

import { ChevronDown, Plus } from "lucide-react";
import React, { useEffect, useState } from "react";

export default function Form() {
  const [selectstatus, setSelectStatus] = useState<string>("الحالة");
  const status = ["معلق", "قيد المعالجة", "ناجح", "فشل"];

  const [productName, setProductName] = useState<string>("اسم المنتج");
  const [category, setCategory] = useState<string>("الفئة");
  const [supplierName, setSupplierName] = useState<string>("المورد");
  const [productSku, setProductSku] = useState<string>("");

  // Categories list
  const [categories, setCategories] = useState<string[]>([
    "الفئة",
    "مواد غذائية",
    "منظفات",
  ]);

  // New category input for dialog
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    const cleanAndUpper = (str: string) =>
      str
        .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "")
        .substring(0, 3)
        .toUpperCase();

    const namePart = cleanAndUpper(productName);
    const categoryPart = cleanAndUpper(category);
    const supplierPart = cleanAndUpper(supplierName);
    const uniqueId = Date.now().toString().slice(-4);

    const parts = [namePart, categoryPart, supplierPart].filter(Boolean);
    const generatedSku =
      parts.length > 0 ? `${parts.join("-")}-${uniqueId}` : uniqueId;
    setProductSku(generatedSku);
  }, [productName, category, supplierName]);

  // Add category handler
  const handleAddCategory = () => {
    if (newCategory.trim() !== "" && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setCategory(newCategory);
      setNewCategory("");
    }
  };

  return (
    <form>
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="grid gap-3">
            <Label htmlFor="name-1">الاسم</Label>
            <Input
              id="name-1"
              name="name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="product-sku">رمز المنتج (مقترح)</Label>
            <Input
              id="product-sku"
              name="productSku"
              value={productSku}
              onChange={(e) => setProductSku(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="category">الفئة</Label>
            <div className="flex gap-2">
              <select
                id="category"
                className="flex-1 border rounded-md p-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
