// "use client";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { useEffect, useState } from "react";
// import { useForm } from "react-hook-form";
// import { z } from "zod";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { CreateProduct } from "@/app/actions/createProduct";
// import { fetchAllFormData } from "@/app/actions/roles";
// import { SelectField } from "../_components/selectproduct";
// import { useAuth } from "@/lib/context/AuthContext";

// import { ScrollArea } from "@/components/ui/scroll-area";
// import { useTranslations } from "next-intl";
// import { toast } from "sonner";
// import { CreateProductInput, CreateProductSchema } from "@/lib/zod";

// interface Option {
//   id: string;
//   name: string;
// }

// // Arabic to English transliteration map
// const arabicToEnglish: { [key: string]: string } = {
//   ا: "A",
//   أ: "A",
//   إ: "A",
//   آ: "A",
//   ب: "B",
//   ت: "T",
//   ث: "TH",
//   ج: "J",
//   ح: "H",
//   خ: "KH",
//   د: "D",
//   ذ: "DH",
//   ر: "R",
//   ز: "Z",
//   س: "S",
//   ش: "SH",
//   ص: "S",
//   ض: "D",
//   ط: "T",
//   ظ: "Z",
//   ع: "A",
//   غ: "GH",
//   ف: "F",
//   ق: "Q",
//   ك: "K",
//   ل: "L",
//   م: "M",
//   ن: "N",
//   ه: "H",
//   و: "W",
//   ي: "Y",
//   ى: "Y",
//   ة: "H",
//   ئ: "Y",
//   ؤ: "W",
// };

// // Function to transliterate Arabic to English
// const transliterateArabic = (text: string): string => {
//   return text
//     .split("")
//     .map((char) => arabicToEnglish[char] || char)
//     .join("")
//     .replace(/[^A-Z]/g, "") // Keep only English letters
//     .toUpperCase();
// };

// // Function to generate SKU from product name, category, and random number
// const generateSKU = (productName: string, categoryName: string): string => {
//   // Transliterate Arabic to English and get first 3 letters
//   const namePart = transliterateArabic(productName)
//     .substring(0, 3)
//     .padEnd(3, "X"); // Pad with X if less than 3 letters

//   // Transliterate category and get first 2 letters
//   const categoryPart = transliterateArabic(categoryName)
//     .substring(0, 2)
//     .padEnd(2, "X");

//   // Generate random 4-digit number
//   const randomPart = Math.floor(1000 + Math.random() * 9000);

//   return `${namePart}-${categoryPart}-${randomPart}`;
// };

// export default function ProductForm() {
//   const [formData, setFormData] = useState<{
//     warehouses: Option[];
//     categories: Option[];
//     brands: Option[];
//     suppliers: Option[];
//   }>({
//     warehouses: [],
//     categories: [],
//     brands: [],
//     suppliers: [],
//   });
//   const [loading, setLoading] = useState(true);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const { user } = useAuth();
//   if (!user) return;
//   const {
//     register,
//     handleSubmit,
//     setValue,
//     reset,
//     watch,
//     formState: { errors },
//   } = useForm<CreateProductInput>({
//     resolver: zodResolver(CreateProductSchema),
//   });

//   // Watch form values
//   const watchedWarehouseId = watch("warehouseId");
//   const watchedCategoryId = watch("categoryId");
//   const watchedBrandId = watch("brandId");
//   const watchedSupplierId = watch("supplierId");
//   const watchedType = watch("type");

//   const watchedName = watch("name");
//   const watchedSku = watch("sku");

//   const t = useTranslations("productForm");

//   // Fetch all form data
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         const data = await fetchAllFormData(user.companyId);
//         setFormData(data);
//       } catch (error) {
//         console.error("Error fetching form data:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, []);

//   // Auto-generate SKU when name or category changes
//   useEffect(() => {
//     if (watchedName && watchedCategoryId) {
//       // Find the category name from the ID
//       const category = formData.categories.find(
//         (cat) => cat.id === watchedCategoryId,
//       );

//       if (category) {
//         const generatedSKU = generateSKU(watchedName, category.name);
//         setValue("sku", generatedSKU);
//       }
//     }
//   }, [watchedName, watchedCategoryId, formData.categories, setValue]);

//   const onSubmit = async (data: CreateProductInput) => {
//     console.log("Submitted:", data);

//     try {
//       setIsSubmitting(true);
//       if (user) {
//         await CreateProduct(data, user.userId, user.companyId);
//         toast.success("✅ تم إضافة المنتج بنجاح!");
//         reset();
//       }
//     } catch (error) {
//       toast.error("❌ حدث خطأ أثناء إضافة المنتج");
//       console.error(error);
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   const productTypeOptions = [
//     { id: "single", name: "Single Product" },
//     { id: "bundle", name: "Bundle" },
//     { id: "variant", name: "Variant" },
//   ];

//   const statusOptions = [
//     { id: "active", name: "Active" },
//     { id: "inactive", name: "Inactive" },
//   ];

//   return (
//     <Card className="shadow-xl">
//       <CardHeader className="bg-primary/5 border-b p-4 text-right">
//         <CardTitle className="text-primary text-2xl font-bold">
//           {t("new")}
//         </CardTitle>
//       </CardHeader>
//       <CardContent className="p-6">
//         <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
//           <ScrollArea dir="rtl" className="p-4">
//             <div className="grid gap-6">
//               {/* Product Identifiers: Name, SKU, Barcode */}
//               <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
//                 {/* Name */}
//                 <div className="grid gap-2">
//                   <Label htmlFor="name">{t("name")}</Label>
//                   <Input
//                     id="name"
//                     {...register("name")}
//                     className="text-right"
//                   />
//                   {errors.name && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.name.message}
//                     </p>
//                   )}
//                 </div>
//                 {/* SKU - Auto-generated but editable */}
//                 <div className="grid gap-2">
//                   <Label htmlFor="sku" className="flex items-center gap-2">
//                     {t("sku")}
//                     <span className="text-muted-foreground text-xs">
//                       (تلقائي)
//                     </span>
//                   </Label>
//                   <Input
//                     id="sku"
//                     type="text"
//                     {...register("sku")}
//                     className="bg-muted/50 text-right"
//                     placeholder="سيتم التوليد تلقائياً"
//                   />
//                   {errors.sku && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.sku.message}
//                     </p>
//                   )}
//                 </div>
//                 {/* Barcode */}
//                 {/* <div className="grid gap-2">
//                   <Label htmlFor="barcode">{t("barcode")}</Label>
//                   <Input
//                     id="barcode"
//                     type="text"
//                     {...register("barcode")}
//                     className="text-right"
//                   />
//                   {errors.barcode && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.barcode.message}
//                     </p>
//                   )}
//                 </div> */}{" "}
//                 <div className="grid gap-2">
//                   <Label htmlFor="categoryId">{t("categoryId")}</Label>
//                   <SelectField
//                     options={formData.categories}
//                     value={watchedCategoryId}
//                     action={(val) => setValue("categoryId", val)}
//                     placeholder={t("categoryId") || "Select Category"}
//                   />
//                   {errors.categoryId && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.categoryId.message}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               {/* Categorization: Category, Description, Brand */}
//               <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
//                 {/* Category ID */}

//                 {/* Description */}

//                 {/* Brand ID */}
//                 {/* <div className="grid gap-2">
//                   <Label htmlFor="brandId">{t("brandId")}</Label>
//                   <SelectField
//                     options={formData.brands}
//                     value={watchedBrandId}
//                     action={(val) => setValue("brandId", val)}
//                     placeholder={t("brandId") || "Select Brand"}
//                   />
//                   {errors.brandId && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.brandId.message}
//                     </p>
//                   )}
//                 </div> */}
//               </div>

//               {/* Packaging: Type, Units per Packet, Packets per Carton */}
//               <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
//                 {/* <div className="grid gap-2">
//                   <Label htmlFor="type">{t("type")}</Label>
//                   <SelectField
//                     options={productTypeOptions}
//                     value={watchedType}
//                     action={(val) =>
//                       setValue("type", val as CreateProductInput["type"])
//                     }
//                     placeholder={t("type") || "Select Type"}
//                   />
//                   {errors.type && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.type.message}
//                     </p>
//                   )}
//                 </div> */}
//                 <div className="grid gap-2">
//                   <Label htmlFor="description">{t("description")}</Label>
//                   <Input
//                     id="description"
//                     type="text"
//                     {...register("description")}
//                     className="text-right"
//                   />
//                   {errors.description && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.description.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="grid gap-2">
//                   <Label htmlFor="unitsPerPacket">{t("unitsPerPacket")}</Label>
//                   <Input
//                     id="unitsPerPacket"
//                     type="number"
//                     {...register("unitsPerPacket", { valueAsNumber: true })}
//                     className="text-right"
//                   />
//                   {errors.unitsPerPacket && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.unitsPerPacket.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="grid gap-2">
//                   <Label htmlFor="packetsPerCarton">
//                     {t("packetsPerCarton")}
//                   </Label>
//                   <Input
//                     id="packetsPerCarton"
//                     type="number"
//                     {...register("packetsPerCarton", { valueAsNumber: true })}
//                     className="text-right"
//                   />
//                   {errors.packetsPerCarton && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.packetsPerCarton.message}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               {/* Pricing: Cost, Unit Price, Packet Price */}
//               <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
//                 <div className="grid gap-2">
//                   <Label htmlFor="costPrice">{t("costPrice")}</Label>
//                   <Input
//                     id="costPrice"
//                     type="number"
//                     step="0.01"
//                     {...register("costPrice", { valueAsNumber: true })}
//                     className="text-right"
//                   />
//                   {errors.costPrice && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.costPrice.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="grid gap-2">
//                   <Label htmlFor="pricePerUnit">{t("pricePerUnit")}</Label>
//                   <Input
//                     id="pricePerUnit"
//                     type="number"
//                     step="0.01"
//                     {...register("pricePerUnit", { valueAsNumber: true })}
//                     className="text-right"
//                   />
//                   {errors.pricePerUnit && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.pricePerUnit.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="grid gap-2">
//                   <Label htmlFor="pricePerPacket">{t("pricePerPacket")}</Label>
//                   <Input
//                     id="pricePerPacket"
//                     type="number"
//                     step="0.01"
//                     {...register("pricePerPacket", { valueAsNumber: true })}
//                     className="text-right"
//                   />
//                   {errors.pricePerPacket && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.pricePerPacket.message}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               {/* Wholesale Pricing and Weight/Dimensions */}
//               <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
//                 <div className="grid gap-2">
//                   <Label htmlFor="pricePerCarton">{t("pricePerCarton")}</Label>
//                   <Input
//                     id="pricePerCarton"
//                     type="number"
//                     step="0.01"
//                     {...register("pricePerCarton", { valueAsNumber: true })}
//                     className="text-right"
//                   />
//                   {errors.pricePerCarton && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.pricePerCarton.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="grid gap-2">
//                   <Label htmlFor="wholesalePrice">{t("wholesalePrice")}</Label>
//                   <Input
//                     id="wholesalePrice"
//                     type="number"
//                     step="0.01"
//                     {...register("wholesalePrice", { valueAsNumber: true })}
//                     className="text-right"
//                   />
//                   {errors.wholesalePrice && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.wholesalePrice.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="grid gap-2">
//                   <Label htmlFor="minWholesaleQty">
//                     {t("minWholesaleQty")}
//                   </Label>
//                   <Input
//                     id="minWholesaleQty"
//                     type="number"
//                     {...register("minWholesaleQty", { valueAsNumber: true })}
//                     className="text-right"
//                   />
//                   {errors.minWholesaleQty && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.minWholesaleQty.message}
//                     </p>
//                   )}
//                 </div>
//               </div>

//               {/* Shipping Details and Logistics */}
//               <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
//                 <div className="grid gap-2">
//                   <Label htmlFor="dimensions">{t("dimensions")}</Label>
//                   <Input
//                     id="dimensions"
//                     type="text"
//                     {...register("dimensions")}
//                     className="text-right"
//                   />
//                   {errors.dimensions && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.dimensions.message}
//                     </p>
//                   )}
//                 </div>
//                 <div className="grid gap-2">
//                   <Label htmlFor="supplierId">{t("supplierId")}</Label>
//                   <SelectField
//                     options={formData.suppliers}
//                     value={watchedSupplierId}
//                     action={(val) => setValue("supplierId", val)}
//                     placeholder={t("supplierId") || "Select Supplier"}
//                   />
//                   {errors.supplierId && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.supplierId.message}
//                     </p>
//                   )}
//                 </div>

//                 {/* Warehouse and Status */}
//                 <div className="grid gap-2">
//                   <Label htmlFor="warehouseId">{t("warehouseId")}</Label>
//                   <SelectField
//                     options={formData.warehouses}
//                     value={watchedWarehouseId}
//                     action={(val) => setValue("warehouseId", val)}
//                     placeholder={t("warehouseId") || "Select Warehouse"}
//                   />
//                   {errors.warehouseId && (
//                     <p className="text-right text-xs text-red-500">
//                       {errors.warehouseId.message}
//                     </p>
//                   )}
//                 </div>
//               </div>
//             </div>

//             {/* Submit Button */}
//             <div className="flex justify-end">
//               <Button
//                 type="submit"
//                 disabled={isSubmitting || loading}
//                 className="min-w-[100px]"
//               >
//                 {isSubmitting || loading ? t("loading") : t("save")}
//               </Button>
//             </div>
//           </ScrollArea>
//         </form>
//       </CardContent>
//     </Card>
//   );
// }
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Edit } from "lucide-react";

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
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
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
  const watchedBrandId = watch("brandId");
  const watchedSupplierId = watch("supplierId");
  const watchedName = watch("name");
  const unitsPerPacket = watch("unitsPerPacket");
  const packetsPerCarton = watch("packetsPerCarton");
  const pricePerCarton = watch("pricePerCarton");
  const pricePerUnit = watch("pricePerUnit");
  const pricePerPacket = watch("pricePerPacket");
  const [pricingMode, setPricingMode] = useState<
    "full" | "cartonUnit" | "cartonOnly"
  >("full");

  const t = useTranslations("productForm");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchAllFormData(user.companyId);
        setFormData(data);
      } catch (error) {
        console.error("Error fetching form data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
  }, [watchedName, watchedCategoryId, formData.categories, setValue]);

  // Auto-calculate prices based on carton price
  useEffect(() => {
    if (
      pricePerCarton &&
      unitsPerPacket &&
      packetsPerCarton &&
      pricePerCarton > 0
    ) {
      // Calculate price per packet
      const calculatedPricePerPacket = pricePerCarton / packetsPerCarton;
      setValue(
        "pricePerPacket",
        Math.round(calculatedPricePerPacket * 100) / 100,
      );
      // Calculate price per unit
      const calculatedPricePerUnit = calculatedPricePerPacket / unitsPerPacket;
      setValue("pricePerUnit", Math.round(calculatedPricePerUnit * 100) / 100);
    }
  }, [pricePerCarton, unitsPerPacket, packetsPerCarton, setValue]);

  // Auto-calculate pricePerUnit for cartonUnit mode
  useEffect(() => {
    if (
      pricingMode === "cartonUnit" &&
      pricePerCarton &&
      unitsPerPacket &&
      pricePerCarton > 0
    ) {
      const calculatedPricePerUnit = pricePerCarton / unitsPerPacket;
      setValue("pricePerUnit", Math.round(calculatedPricePerUnit * 100) / 100);
    }
  }, [pricePerCarton, unitsPerPacket, pricingMode, setValue]);

  const onSubmit = async (data: CreateProductInput) => {
    console.log("Submitted:", data);

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
        setFormData({
          warehouses: [],
          categories: [],
          brands: [],
          suppliers: [],
        });
        setPricingMode("full");

        // Reload form data
        const newData = await fetchAllFormData(user.companyId);
        setFormData(newData);
      }
    } catch (error) {
      toast.error("❌ حدث خطأ أثناء إضافة المنتج");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Edit /> منتج جديد
        </Button>
      </DialogTrigger>

      <DialogContent
        dir="rtl"
        className="max-h-[90vh] w-full max-w-[1400px] overflow-y-auto rounded-lg p-6 xl:max-w-[1600px]"
      >
        <DialogHeader>
          <DialogTitle>منتج</DialogTitle>
          <DialogDescription>أدخل تفاصيل المنتج واحفظه</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-6">
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-right font-semibold">نموذج البيع</h3>
            <div className="mb-4 flex flex-col gap-3 md:flex-row">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  checked={pricingMode === "full"}
                  onChange={() => {
                    setPricingMode("full");
                    setValue("pricePerUnit", undefined);
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

          {pricingMode === "cartonUnit" && (
            <div className="grid gap-2">
              <Label htmlFor="unitsPerPacket">عدد الوحدات في الكرتونة</Label>
              <Input
                id="unitsPerPacket"
                type="number"
                {...register("unitsPerPacket", { valueAsNumber: true })}
                className="text-right"
                placeholder="مثال: 120 وحدة"
              />
              <p className="text-right text-xs text-gray-600">
                (عدد الوحدات الموجودة مباشرة في الكرتونة)
              </p>
              {errors.unitsPerPacket && (
                <p className="text-right text-xs text-red-500">
                  {errors.unitsPerPacket.message}
                </p>
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
          <div className="grid gap-6">
            {/* Product Identifiers */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
                />
                {errors.categoryId && (
                  <p className="text-right text-xs text-red-500">
                    {errors.categoryId.message}
                  </p>
                )}
              </div>
            </div>

            {/* Description and Supplier */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {/* Supplier Price Box */}
              <div className="rounded-lg border border-green-100 p-4">
                <h3 className="mb-4 text-right font-semibold text-green-900">
                  سعر الشراء من المورد
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="costPrice">سعر الشراء بالكرتون</Label>
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
              </div>

              {/* Retail Price Box */}
              <div className="rounded-lg border border-amber-100 p-4">
                <h3 className="mb-4 text-right font-semibold text-amber-900">
                  أسعار البيع بالتجزئة (البيع الفردي)
                </h3>
                {pricingMode === "full" && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="pricePerUnit">
                        سعر بيع الوحدة الواحدة
                      </Label>
                      <Input
                        id="pricePerUnit"
                        type="number"
                        step="0.01"
                        disabled
                        value={pricePerUnit || ""}
                        className="bg-gray-100 text-right"
                        placeholder="يُحسب تلقائياً"
                      />
                      <p className="text-right text-xs text-gray-600">
                        (يُحسب تلقائياً من سعر الكرتونة)
                      </p>
                      {errors.pricePerUnit && (
                        <p className="text-right text-xs text-red-500">
                          {errors.pricePerUnit.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pricePerPacket">
                        سعر بيع العبوة الواحدة
                      </Label>
                      <Input
                        id="pricePerPacket"
                        type="number"
                        step="0.01"
                        disabled
                        value={pricePerPacket || ""}
                        className="bg-gray-100 text-right"
                        placeholder="يُحسب تلقائياً"
                      />
                      <p className="text-right text-xs text-gray-600">
                        (يُحسب تلقائياً من سعر الكرتونة)
                      </p>
                      {errors.pricePerPacket && (
                        <p className="text-right text-xs text-red-500">
                          {errors.pricePerPacket.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {pricingMode === "cartonUnit" && (
                  <div className="grid gap-2">
                    <Label htmlFor="pricePerUnit">سعر بيع الوحدة الواحدة</Label>
                    <Input
                      id="pricePerUnit"
                      type="number"
                      step="0.01"
                      disabled
                      value={pricePerUnit || ""}
                      className="bg-gray-100 text-right"
                      placeholder="يُحسب تلقائياً"
                    />
                    <p className="text-right text-xs text-gray-600">
                      (يُحسب تلقائياً من سعر الكرتونة)
                    </p>
                    {errors.pricePerUnit && (
                      <p className="text-right text-xs text-red-500">
                        {errors.pricePerUnit.message}
                      </p>
                    )}
                  </div>
                )}
                {pricingMode === "cartonOnly" && (
                  <div className="rounded-lg p-3">
                    <p className="text-right text-sm text-gray-600">
                      لا توجد أسعار للوحدة أو العبوة - سيتم البيع بالكرتونة فقط
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-lg border border-green-100 p-4">
                <h3 className="mb-4 text-right font-semibold text-green-900">
                  سعر الشراء من المورد
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="costPrice">سعر الشراء بالكرتون</Label>
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
              </div>

              {/* Retail/Single Unit Pricing */}
              <div className="rounded-lg border border-amber-100 p-4">
                <h3 className="mb-4 text-right font-semibold text-amber-900">
                  أسعار البيع بالتجزئة (البيع الفردي)
                </h3>
                {pricingMode === "full" && (
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="pricePerUnit">
                        سعر بيع الوحدة الواحدة
                      </Label>
                      <Input
                        id="pricePerUnit"
                        type="number"
                        step="0.01"
                        disabled
                        value={pricePerUnit || ""}
                        className="bg-gray-100 text-right"
                        placeholder="يُحسب تلقائياً"
                      />
                      <p className="text-right text-xs text-gray-600">
                        (يُحسب تلقائياً من سعر الكرتونة)
                      </p>
                      {errors.pricePerUnit && (
                        <p className="text-right text-xs text-red-500">
                          {errors.pricePerUnit.message}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="pricePerPacket">
                        سعر بيع العبوة الواحدة
                      </Label>
                      <Input
                        id="pricePerPacket"
                        type="number"
                        step="0.01"
                        disabled
                        value={pricePerPacket || ""}
                        className="bg-gray-100 text-right"
                        placeholder="يُحسب تلقائياً"
                      />
                      <p className="text-right text-xs text-gray-600">
                        (يُحسب تلقائياً من سعر الكرتونة)
                      </p>
                      {errors.pricePerPacket && (
                        <p className="text-right text-xs text-red-500">
                          {errors.pricePerPacket.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {pricingMode === "cartonUnit" && (
                  <div className="grid gap-2">
                    <Label htmlFor="pricePerUnit">سعر بيع الوحدة الواحدة</Label>
                    <Input
                      id="pricePerUnit"
                      type="number"
                      step="0.01"
                      disabled
                      value={pricePerUnit || ""}
                      className="bg-gray-100 text-right"
                      placeholder="يُحسب تلقائياً"
                    />
                    <p className="text-right text-xs text-gray-600">
                      (يُحسب تلقائياً من سعر الكرتونة)
                    </p>
                    {errors.pricePerUnit && (
                      <p className="text-right text-xs text-red-500">
                        {errors.pricePerUnit.message}
                      </p>
                    )}
                  </div>
                )}
                {pricingMode === "cartonOnly" && (
                  <div className="rounded-lg p-3">
                    <p className="text-right text-sm text-gray-600">
                      لا توجد أسعار للوحدة أو العبوة - سيتم البيع بالكرتونة فقط
                    </p>
                  </div>
                )}
              </div>

              {/* Bulk/Carton Pricing */}
            </div>

            {/* Warehouse and Dimensions */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-lg border border-purple-100 p-4">
                <h3 className="mb-4 text-right font-semibold text-purple-900">
                  أسعار البيع بالجملة (الكرتونة والتجار)
                </h3>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="pricePerCarton">سعر بيع الكرتونة</Label>
                    <Input
                      id="pricePerCarton"
                      type="number"
                      step="0.01"
                      {...register("pricePerCarton", { valueAsNumber: true })}
                      className="text-right"
                      placeholder="0.00"
                    />
                    <p className="text-right text-xs text-gray-600">
                      (السعر للعميل الذي يشتري كرتونة كاملة)
                    </p>
                    {errors.pricePerCarton && (
                      <p className="text-right text-xs text-red-500">
                        {errors.pricePerCarton.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="wholesalePrice">سعر الجملة بالكرتون</Label>
                    <Input
                      id="wholesalePrice"
                      type="number"
                      step="0.01"
                      {...register("wholesalePrice", { valueAsNumber: true })}
                      className="text-right"
                      placeholder="0.00"
                    />
                    <p className="text-right text-xs text-gray-600">
                      (السعر للوحدة عند شراء كمية كبيرة)
                    </p>
                    {errors.wholesalePrice && (
                      <p className="text-right text-xs text-red-500">
                        {errors.wholesalePrice.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  <Label htmlFor="minWholesaleQty">
                    الحد الأدنى للشراء بالسعر الجملي (عدد الوحدات)
                  </Label>
                  <Input
                    id="minWholesaleQty"
                    type="number"
                    {...register("minWholesaleQty", { valueAsNumber: true })}
                    className="text-right"
                    placeholder="مثال: 100 وحدة"
                  />
                  <p className="text-right text-xs text-gray-600">
                    (العميل يحصل على السعر الجملي فقط إذا اشترى هذه الكمية أو
                    أكثر)
                  </p>
                  {errors.minWholesaleQty && (
                    <p className="text-right text-xs text-red-500">
                      {errors.minWholesaleQty.message}
                    </p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                <div className="grid">
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
                </div>{" "}
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => reset()}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || loading}
                    className="min-w-[100px] bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting || loading ? "جاري الحفظ..." : "حفظ المنتج"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
