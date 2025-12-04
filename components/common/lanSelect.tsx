"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages, Check, Globe } from "lucide-react";
import clsx from "clsx";
import { useTransition } from "react";
import { Locale } from "@/i18n/config";
import { setUserLocale } from "@/lib/local";
import { Button } from "../ui/button";

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
    <Select defaultValue={defaultValue} onValueChange={onChange} dir="rtl">
      <SelectTrigger
        className="h-auto w-fit p-2" // Adjust sizing to fit just the icon
        aria-label="Select Language" // Good accessibility practice
      >
        {/* 2. Place your custom Icon directly inside */}
        <Globe className="h-5 w-5 text-blue-400" />

        {/* 3. CRITICAL: Hide the default arrow icon */}
        {/* The 'SelectIcon' component, usually rendered by the trigger, needs to be hidden via CSS/Tailwind utilities. */}
        {/* The common way to hide the default arrow in shadcn/ui is via a utility class that targets the icon element. */}
        {/* If using the standard shadcn/ui Select, the default icon is often inside a span. */}

        {/* If the default SelectIcon is part of the SelectTrigger implementation, 
             the best way is to target it with CSS. 
             If you can't access it, you might need to add a utility class
             to SelectTrigger that hides the default arrow. */}
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
