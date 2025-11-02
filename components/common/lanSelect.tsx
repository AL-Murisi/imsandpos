"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages, Check } from "lucide-react";
import clsx from "clsx";
import { useTransition } from "react";
import { Locale } from "@/i18n/config";
import { setUserLocale } from "@/lib/local";

type Props = {
  defaultValue: string;
  items?: Array<{ value: string; label: string }>; // optional
  label: string;
};

export default function LocaleSwitcherSelect({
  defaultValue,
  items = [], // ✅ fallback so .map never crashes
  label,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function onChange(value: string) {
    const locale = value as Locale;
    startTransition(() => {
      setUserLocale(locale);
    });
  }

  return (
    <Select defaultValue={defaultValue} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={clsx(
          "flex items-center border-[#0b142a] bg-[#0b142a] text-sm hover:bg-gray-500",
          isPending && "pointer-events-none opacity-60",
        )}
      >
        {/* <Languages className="text-muted-foreground h-5 w-5" color="red" /> */}
        <SelectValue placeholder={label} className="" />
      </SelectTrigger>
      <SelectContent align="end" className="bg-background rounded-md shadow-md">
        {items.map((item) => (
          <SelectItem
            key={item.value}
            value={item.value}
            className="flex items-center gap-x-4 gap-y-3"
          >
            {/* {item.value === defaultValue && (
              <Check className="text-muted-foreground h-4 w-4" />
            )} */}
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
