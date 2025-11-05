"use client";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createCategory } from "@/lib/actions/category"; // assume you have this
import { useAuth } from "@/lib/context/AuthContext";
import { CreateCategorySchema } from "@/lib/zod";
import { Plus } from "lucide-react";

type FormValues = z.infer<typeof CreateCategorySchema>;

type Category = {
  id: string;
  name: string;
};

export default function CategoryForm() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(CreateCategorySchema),
    defaultValues: {
      name: "",
      description: "",
      parentId: "", // empty string means no parent
    },
  });
  const { user } = useAuth();
  if (!user) return;
  // Fetch parent categories on mount

  const onSubmit = async (data: FormValues) => {
    const finalData = {
      ...data,
      parentId: data.parentId || undefined, // Remove empty string
    };
    await createCategory(finalData, user.companyId);
    setOpen(false);
    reset();
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir="rtl">
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">الاسم</Label>
                <Input id="name" {...register("name")} />
                {errors.name && (
                  <p className="text-xs text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">الوصف</Label>
                <Input id="description" {...register("description")} />
              </div>

              {/* Parent Category Dropdown */}
              <div className="grid gap-2">
                <Label htmlFor="parentId">فئة رئيسية</Label>
                <select
                  id="parentId"
                  {...register("parentId")}
                  className="rounded border px-2 py-1"
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
          </div>

          <div className="flex justify-end">
            <Button type="submit">تأكيد</Button>
          </div>
        </form>{" "}
      </DialogContent>
    </Dialog>
  );
}
