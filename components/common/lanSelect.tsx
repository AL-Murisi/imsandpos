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
          // 1. Remove all default styling
          "h-10 w-10 border-none bg-transparent p-0 shadow-none ring-0 outline-none focus:ring-0 focus:ring-offset-0",
          // 2. Hide the default arrow and the value text span
          "[&>span]:hidden [&>svg]:hidden",
          // 3. Center our custom icon
          "flex items-center justify-center rounded-full transition-colors hover:bg-white/5",
        )}
      >
        <Globe
          size={22}
          className={
            isPending ? "animate-pulse text-gray-500" : "text-blue-400"
          }
        />
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
