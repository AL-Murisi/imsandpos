"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Globe } from "lucide-react";
import { useTransition } from "react";
import { Locale } from "@/i18n/config";
import { setUserLocale } from "@/lib/local";
import { cn } from "@/lib/utils";

export default function LocaleSwitcherSelect({
  defaultValue,

  items = [],
}: {
  defaultValue: string;
  items?: Array<{ value: string; label: string }>;
}) {
  const [isPending, startTransition] = useTransition();

  function onChange(value: string) {
    const locale = value as Locale;
    startTransition(() => {
      setUserLocale(locale);
    });
  }

  return (
    <Select defaultValue={defaultValue} onValueChange={onChange} dir="rtl">
      <SelectTrigger
        className={cn(
          // 1. إزالة التنسيقات الافتراضية
          "h-10 w-10 border-none bg-transparent p-0 shadow-none ring-0 outline-none focus:ring-0 focus:ring-offset-0",

          // 2. إخفاء السهم الافتراضي فقط
          "[&>svg]:hidden",

          // 3. إخفاء نص القيمة فقط (span الافتراضي) وليس الأيقونة
          // نستخدم select-none أو نحدد الـ span الفارغ الذي ينشئه shadcn
          "[&>span]:empty:hidden data-[placeholder]:[&>span]:hidden",

          // 4. توسيط الأيقونة
          "flex items-center justify-center rounded-full transition-colors hover:bg-white/10",
        )}
      >
        {/* وضع الأيقونة مباشرة */}
        <Globe size={22} className="text-blue-500" />

        {/* ملاحظة: تأكد من عدم وجود SelectValue هنا إذا كنت تريد الأيقونة فقط */}
      </SelectTrigger>
      <SelectContent
        align="center"
        className="min-w-[120px] rounded-xl border-gray-800 bg-[#111827] text-white shadow-2xl"
      >
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            className="cursor-pointer py-3 focus:bg-blue-600 focus:text-white"
          >
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
