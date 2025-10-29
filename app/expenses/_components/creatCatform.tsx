"use client";

import { createExpenseCategory } from "@/app/actions/exponses";
import React, { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import Dailogreuse from "@/components/common/dailogreuse";

interface CategoryFormInput {
  name: string;
  description: string;
}

interface ExpenseCategoryFormProps {
  companyId: string;
}

export default function ExpenseCategoryForm({
  companyId,
}: ExpenseCategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CategoryFormInput>();

  const onSubmit = (values: CategoryFormInput) => {
    startTransition(async () => {
      const res = await createExpenseCategory(companyId, values);

      if (res.success) {
        toast.success(`تم إنشاء الفئة: ${values.name} بنجاح.`);
        reset();
      } else {
        toast.error(res.error || "حدث خطأ أثناء إنشاء فئة المصروف.");
      }
    });
  };

  return (
    <Dailogreuse
      open={open}
      setOpen={setOpen}
      btnLabl="إضافة فئة جديدة للمصروف"
      style="sm:max-w-md"
      titel=">إضافة فئة جديدة للمصروف"
      description="قم بإدخال اسم الفئة الجديدة لإضافتها إلى قائمة فئات المصروفات"
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-accent mx-auto max-w-lg space-y-6 rounded-xl border border-gray-200 p-6 shadow-lg"
        dir="rtl"
      >
        <h2 className="border-b pb-2 text-2xl font-bold">
          إنشاء فئة مصروف جديدة
        </h2>

        {/* 1. اسم الفئة (Name) - Required */}
        <div>
          <label htmlFor="name" className="mb-1 block text-sm font-medium">
            اسم الفئة
          </label>
          <input
            id="name"
            type="text"
            placeholder="أدخل اسم الفئة (مثال: فواتير التشغيل)"
            {...register("name", {
              required: "يرجى إدخال اسم الفئة.",
            })}
            className="w-full rounded-md border border-gray-300 p-2.5 shadow-sm transition duration-150 ease-in-out focus:border-blue-500 focus:ring-blue-500"
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* 2. الوصف (Description) - Optional */}
        <div>
          <label
            htmlFor="description"
            className="mb-1 block text-sm font-medium"
          >
            الوصف (اختياري)
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="أدخل وصفًا موجزًا لهذه الفئة"
            {...register("description")}
            className="w-full rounded-md border border-gray-300 p-2.5 shadow-sm transition duration-150 ease-in-out focus:border-blue-500 focus:ring-blue-500"
          />
          {/* No error handling needed as it's optional */}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md bg-blue-600 px-4 py-2.5 font-semibold text-white shadow-md transition duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isPending ? "جارٍ الحفظ..." : "➕ حفظ الفئة"}
        </button>
      </form>
    </Dailogreuse>
  );
}
