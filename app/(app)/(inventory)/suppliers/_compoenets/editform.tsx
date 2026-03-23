"use client";
// import { z } from "zod";

// 🧾 Create Supplier Schema
// const CreateSupplierSchema = z.object({
//   name: z.string().min(1, "اسم المورد مطلوب"),
//   contactPerson: z.string().optional(),
//   email: z
//     .string()
//     .trim()
//     .email("البريد الإلكتروني غير صالح")
//     .optional()
//     .or(z.literal("")),
//   preferred_currency: z
//     .array(z.string())
//     .min(1, "يجب إضافة وحدة بيع واحدة على الأقل"),
//   phoneNumber: z.string().optional(),
//   address: z.string().optional(),
//   city: z.string().optional(),
//   state: z.string().optional(),
//   country: z.string().optional(),
//   postalCode: z.string().optional(),
//   taxId: z.string().optional(),
//   paymentTerms: z.string().optional(),
// });

// type CreateSupplierInput = z.infer<typeof CreateSupplierSchema>;

// 🛠 Update Supplier Schema (allows same fields, plus optional isActive)

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { updateSupplier } from "@/lib/actions/suppliers";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Dailogreuse from "@/components/common/dailogreuse";
import { CreateSupplierInput, CreateSupplierSchema } from "@/lib/zod";
import { Check } from "lucide-react";
import { fallbackCurrencyOptions } from "@/lib/actions/currnciesOptions";
import { useCurrencyOptions } from "@/hooks/useCurrencyOptions";
import { useCompany } from "@/hooks/useCompany";
import { ScrollArea } from "@/components/ui/scroll-area";

export function EditSupplierForm({ supplier }: any) {
  const [loading, setLoading] = useState(false);
  const { company } = useCompany();
  const basCurrncy = company?.base_currency;
  const { options } = useCurrencyOptions();
  const currencyOptions = options.length ? options : fallbackCurrencyOptions;

  const form = useForm<CreateSupplierInput>({
    resolver: zodResolver(CreateSupplierSchema),
    defaultValues: {
      name: supplier.name || "",
      contactPerson: supplier.contactPerson || "",
      email: supplier.email || "",
      phoneNumber: supplier.phoneNumber || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      country: supplier.country || "",
      postalCode: supplier.postalCode || "",
      taxId: supplier.taxId || "",
      paymentTerms: supplier.paymentTerms || "",
      preferred_currency: supplier.preferred_currency || "",
    },
  });
  useEffect(() => {
    if (basCurrncy) {
      form.setValue("preferred_currency", [basCurrncy]);
    }
  }, [basCurrncy, form.setValue]);
  const [open, setOpen] = useState(false);
  const onSubmit = async (data: CreateSupplierInput) => {
    setLoading(true);
    try {
      const res = await updateSupplier(supplier.id, data);
      if (res.success) {
        toast.success("تم تحديث المورد بنجاح");
      } else {
        toast.error(res.error || "فشل تحديث المورد");
      }
      setOpen(false);
    } catch (err) {
      setOpen(false);

      toast.error("حدث خطأ أثناء تحديث المورد");
    } finally {
      setLoading(false);
    }
  };

  const { register, handleSubmit } = form;

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl={supplier ? "تعديل المورد" : "إضافة مورد جديد"}
      style="sm:max-w-6xl"
      titel={supplier ? "تعديل بيانات المورد" : "إضافة مورد جديد"}
      description="أدخل تفاصيل المورد واحفظها"
    >
      <ScrollArea className="max-h-[85vh]" dir="rtl">
        <form onSubmit={handleSubmit(onSubmit)} className="">
          <div className="grid gap-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>اسم المورد</Label>
                <Input {...register("name")} placeholder="اسم المورد" />
              </div>

              <div className="grid gap-2">
                <Label>الشخص المسؤول</Label>
                <Input {...register("contactPerson")} />
              </div>

              <div className="grid gap-2">
                <Label>البريد الإلكتروني</Label>
                <Input {...register("email")} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label>رقم الهاتف</Label>
                <Input {...register("phoneNumber")} />
              </div>

              <div className="grid gap-2">
                <Label>العنوان</Label>
                <Input {...register("address")} />
              </div>

              <div className="grid gap-2">
                {" "}
                <Label>المدينة</Label>
                <Input {...register("city")} />
              </div>
            </div>
            <div className="grid gap-3">
              <Label className="text-right">العملات المسموحة</Label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
                {currencyOptions.map((option) => {
                  // Check if this currency is currently in the array
                  const isSelected = form
                    .watch("preferred_currency")
                    ?.includes(option.id);

                  return (
                    <div
                      key={option.id}
                      onClick={() => {
                        const currentValues =
                          form.watch("preferred_currency") || [];
                        const newValues = isSelected
                          ? currentValues.filter((v: string) => v !== option.id) // Remove if already there
                          : [...currentValues, option.id]; // Add if not there

                        form.setValue("preferred_currency", newValues, {
                          shouldValidate: true,
                        });
                      }}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-4 py-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-sm"
                          : "bg-gray border-gray-200 hover:border-gray-300"
                      } `}
                    >
                      {/* The "Tick" Icon */}
                      <div
                        className={`flex h-4 w-4 items-center justify-center rounded-sm border ${isSelected ? "bg-primary border-primary" : "border-gray-300"} `}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>

                      <span className="font-medium">{option.name}</span>
                      {/* <span className="text-muted-foreground text-xs">
                                   ({option.name})
                                 </span> */}
                    </div>
                  );
                })}
              </div>
              {form.formState.errors.preferred_currency && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.preferred_currency.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="grid gap-2">
                <Label>الدولة</Label>
                <Input {...register("country")} />
              </div>
              {/* <div className="grid gap-3">
              <Label htmlFor="preferred_currency"> العمله الرئيسية</Label>
              <Input
                id="preferred_currency"
                {...register("preferred_currency")}
                className="text-right"
              />
            </div> */}
              <div className="grid gap-2">
                <Label>الرقم الضريبي</Label>
                <Input {...register("taxId")} />
              </div>

              <div className="col-span-2 mt-4 flex justify-end">
                <Button type="submit" disabled={loading}>
                  {loading ? "جارٍ التحديث..." : "تحديث"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </ScrollArea>
    </Dailogreuse>
  );
}
