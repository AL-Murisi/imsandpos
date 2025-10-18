// "use client";

// import { useForm, Controller } from "react-hook-form";
// import { zodResolver } from "@hookform/resolvers/zod";
// import { z } from "zod";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";
// import { toast } from "sonner";
// import { useAuth } from "@/lib/context/AuthContext";
// import { updateSupplier } from "@/app/actions/suppliers";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogDescription,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import { Edit } from "lucide-react";
// import { useState } from "react";

// // Validation schema
// const supplierSchema = z.object({
//   name: z.string().min(2, "يجب أن يكون الاسم على الأقل حرفين"),
//   contactPerson: z.string().min(2, "اسم جهة الاتصال مطلوب"),
//   email: z.string().email("بريد إلكتروني غير صحيح"),
//   phoneNumber: z.string().min(6, "رقم الهاتف غير صحيح"),
//   address: z.string().min(3, "العنوان مطلوب"),
//   city: z.string().min(2, "المدينة مطلوبة"),
//   state: z.string().min(2, "الولاية/المحافظة مطلوبة"),
//   country: z.string().min(2, "الدولة مطلوبة"),
//   postalCode: z.string().min(3, "الرمز البريدي مطلوب"),
//   taxId: z.string().optional().nullable(),
//   paymentTerms: z.string().optional().nullable(),
//   isActive: z.boolean(),
// }) as any;

// type SupplierFormData = {
//   name: string;
//   contactPerson: string;
//   email: string;
//   phoneNumber: string;
//   address: string;
//   city: string;
//   state: string;
//   country: string;
//   postalCode: string;
//   taxId?: string | null;
//   paymentTerms?: string | null;
//   isActive: boolean;
// };

// interface SupplierEditFormProps {
//   supplier: {
//     id: string;
//     name: string;
//     contactPerson: string;
//     email: string;
//     phoneNumber: string;
//     address: string;
//     city: string;
//     state: string;
//     country: string;
//     postalCode: string;
//     taxId?: string | null;
//     paymentTerms?: string | null;
//     isActive: boolean;
//   };
// }

// export default function SupplierEditForm({ supplier }: SupplierEditFormProps) {
//   const { user } = useAuth();
//   const [open, setOpen] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const {
//     register,
//     handleSubmit,
//     reset,
//     control,
//     formState: { errors },
//   } = useForm<SupplierFormData>({
//     resolver: zodResolver(supplierSchema),
//     defaultValues: {
//       name: supplier.name,
//       contactPerson: supplier.contactPerson,
//       email: supplier.email,
//       phoneNumber: supplier.phoneNumber,
//       address: supplier.address,
//       city: supplier.city,
//       state: supplier.state,
//       country: supplier.country,
//       postalCode: supplier.postalCode,
//       taxId: supplier.taxId || "",
//       paymentTerms: supplier.paymentTerms || "",
//       isActive: supplier.isActive,
//     },
//   });

//   if (!user) return null;

//   const onSubmit = async (data: SupplierFormData) => {
//     try {
//       setLoading(true);

//       const result = await updateSupplier(supplier.id, user.companyId, data);

//       if (result.success) {
//         toast.success("تم تحديث المورد بنجاح");
//         setOpen(false);
//         reset();
//       } else {
//         toast.error(result.error || "حدث خطأ في التحديث");
//       }
//     } catch (error) {
//       toast.error("حدث خطأ في التحديث");
//       console.error("Error updating supplier:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <Dialog open={open} onOpenChange={setOpen}>
//       <DialogTrigger asChild>
//         <Button variant="outline" size="sm">
//           <Edit className="h-4 w-4" />
//         </Button>
//       </DialogTrigger>

//       <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl" dir="rtl">
//         <DialogHeader>
//           <DialogTitle>تعديل المورد</DialogTitle>
//           <DialogDescription>تحديث معلومات المورد</DialogDescription>
//         </DialogHeader>

//         <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
//           {/* الاسم وجهة الاتصال */}
//           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//             <div className="grid gap-2">
//               <Label className="text-gray-100">اسم المورد</Label>
//               <Input
//                 type="text"
//                 placeholder="أدخل اسم المورد"
//                 {...register("name")}
//                 className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//               />
//               {errors.name && (
//                 <p className="text-xs text-red-400">{errors.name.message}</p>
//               )}
//             </div>
//             <div className="grid gap-2">
//               <Label className="text-gray-100">جهة الاتصال</Label>
//               <Input
//                 type="text"
//                 placeholder="أدخل اسم جهة الاتصال"
//                 {...register("contactPerson")}
//                 className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//               />
//               {errors.contactPerson && (
//                 <p className="text-xs text-red-400">
//                   {errors.contactPerson.message}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* البريد والهاتف */}
//           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//             <div className="grid gap-2">
//               <Label className="text-gray-100">البريد الإلكتروني</Label>
//               <Input
//                 type="email"
//                 placeholder="أدخل البريد الإلكتروني"
//                 {...register("email")}
//                 className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//               />
//               {errors.email && (
//                 <p className="text-xs text-red-400">{errors.email.message}</p>
//               )}
//             </div>
//             <div className="grid gap-2">
//               <Label className="text-gray-100">رقم الهاتف</Label>
//               <Input
//                 type="tel"
//                 placeholder="أدخل رقم الهاتف"
//                 {...register("phoneNumber")}
//                 className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//               />
//               {errors.phoneNumber && (
//                 <p className="text-xs text-red-400">
//                   {errors.phoneNumber.message}
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* العنوان */}
//           <div className="grid gap-2">
//             <Label className="text-gray-100">العنوان</Label>
//             <Input
//               type="text"
//               placeholder="أدخل العنوان"
//               {...register("address")}
//               className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//             />
//             {errors.address && (
//               <p className="text-xs text-red-400">{errors.address.message}</p>
//             )}
//           </div>

//           {/* المدينة والولاية والدولة */}
//           <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
//             <div className="grid gap-2">
//               <Label className="text-gray-100">المدينة</Label>
//               <Input
//                 type="text"
//                 placeholder="أدخل المدينة"
//                 {...register("city")}
//                 className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//               />
//               {errors.city && (
//                 <p className="text-xs text-red-400">{errors.city.message}</p>
//               )}
//             </div>
//             <div className="grid gap-2">
//               <Label className="text-gray-100">الولاية/المحافظة</Label>
//               <Input
//                 type="text"
//                 placeholder="أدخل الولاية"
//                 {...register("state")}
//                 className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//               />
//               {errors.state && (
//                 <p className="text-xs text-red-400">{errors.state.message}</p>
//               )}
//             </div>
//             <div className="grid gap-2">
//               <Label className="text-gray-100">الدولة</Label>
//               <Input
//                 type="text"
//                 placeholder="أدخل الدولة"
//                 {...register("country")}
//                 className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//               />
//               {errors.country && (
//                 <p className="text-xs text-red-400">{errors.country.message}</p>
//               )}
//             </div>
//           </div>

//           {/* الرمز البريدي والضريبة */}
//           <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
//             <div className="grid gap-2">
//               <Label className="text-gray-100">الرمز البريدي</Label>
//               <Input
//                 type="text"
//                 placeholder="أدخل الرمز البريدي"
//                 {...register("postalCode")}
//                 className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//               />
//               {errors.postalCode && (
//                 <p className="text-xs text-red-400">
//                   {errors.postalCode.message}
//                 </p>
//               )}
//             </div>
//             <div className="grid gap-2">
//               <Label className="text-gray-100">رقم الضريبة</Label>
//               <Input
//                 type="text"
//                 placeholder="أدخل رقم الضريبة (اختياري)"
//                 {...register("taxId")}
//                 className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//               />
//             </div>
//           </div>

//           {/* شروط الدفع */}
//           <div className="grid gap-2">
//             <Label className="text-gray-100">شروط الدفع</Label>
//             <Input
//               type="text"
//               placeholder="مثال: 30 يوم صافي، إلخ (اختياري)"
//               {...register("paymentTerms")}
//               className="border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-500"
//             />
//           </div>

//           {/* الحالة النشطة */}
//           <div className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 p-4">
//             <Controller
//               name="isActive"
//               control={control}
//               render={({ field }) => (
//                 <Checkbox
//                   checked={field.value}
//                   onCheckedChange={field.onChange}
//                 />
//               )}
//             />
//             <Label className="cursor-pointer text-gray-100">
//               المورد نشط
//             </Label>
//           </div>

//           {/* الأزرار */}
//           <div className="flex justify-end gap-2 border-t border-gray-700 pt-4">
//             <Button
//               type="button"
//               variant="outline"
//               onClick={() => {
//                 reset();
//                 setOpen(false);
//               }}
//               className="border-gray-700 text-gray-100 hover:bg-gray-800"
//             >
//               إلغاء
//             </Button>
//             <Button
//               type="submit"
//               disabled={loading}
//               className="bg-blue-600 hover:bg-blue-700"
//             >
//               {loading ? "جارٍ الحفظ..." : "حفظ التغييرات"}
//             </Button>
//           </div>
//         </form>
//       </DialogContent>
//     </Dialog>
//   );
// }
