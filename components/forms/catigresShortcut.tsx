"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

import { createCategory, getAllCategories } from "@/app/actions/roles";
import { CreateCategorySchema } from "@/lib/zod";
import { useAuth } from "@/lib/context/AuthContext";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type FormValues = z.infer<typeof CreateCategorySchema>;

type Category = {
  id: string;
  name: string;
};

export default function CategoryForm() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      parentId: "",
    },
  });

  const { user } = useAuth();
  if (!user) return null;

  const onSubmit = (data: FormValues) => {
    startTransition(async () => {
      try {
        const finalData = {
          ...data,
          parentId: data.parentId || undefined,
        };
        const res = await createCategory(finalData, user.companyId);

        if (res) {
          toast.success(`تم إنشاء الفئة: ${data.name} بنجاح`);
          reset();
          setOpen(false);
        } else {
          toast.error(res || "حدث خطأ في إنشاء الفئة");
        }
      } catch (error) {
        toast.error("حدث خطأ في إنشاء الفئة");
        console.error(error);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} modal={false}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          جديد
        </Button>
      </DialogTrigger>

      <DialogContent dir="rtl" className="sm:w-md">
        <DialogHeader>
          <DialogTitle>إضافة فئة جديدة</DialogTitle>
          <DialogDescription>أدخل تفاصيل الفئة الجديدة</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="name">الاسم</Label>
              <Input id="name" {...register("name")} disabled={isPending} />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">الوصف</Label>
              <Input
                id="description"
                {...register("description")}
                disabled={isPending}
              />
              {errors.description && (
                <p className="text-xs text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Parent Category Dropdown */}
            <div className="grid gap-2">
              <Label htmlFor="parentId">فئة رئيسية</Label>
              <select
                id="parentId"
                {...register("parentId")}
                className="rounded border px-2 py-1"
                disabled={isPending}
              >
                <option value="">لا يوجد</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              {errors.parentId && (
                <p className="text-xs text-red-500">
                  {errors.parentId.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              إلغاء
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isPending}>
              {isPending ? "جاري الحفظ..." : "تأكيد"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
