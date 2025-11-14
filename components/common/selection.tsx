"use client";

import { useTransition } from "react";
import { useQueryState, parseAsString } from "nuqs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";

interface Option {
  id: string;
  name: string;
}

interface SelectFieldProps {
  options: Option[];
  paramKey: string;
  placeholder: string;
}

export function SelectField({
  options,
  paramKey,
  placeholder,
}: SelectFieldProps) {
  const [isPending, startTransition] = useTransition();

  const [value, setValue] = useQueryState(
    paramKey,
    parseAsString.withDefault("").withOptions({
      shallow: false,
      startTransition,
    }),
  );

  const handleValueChange = (newValue: string) => {
    if (newValue === "all") {
      // ❌ Remove the parameter completely
      setValue(null);
    } else {
      // ✅ Set normal value
      setValue(newValue);
    }
  };

  return (
    <div className="rounded-2xl shadow-xl/20 shadow-gray-900">
      <Select value={value} onValueChange={handleValueChange}>
        <SelectTrigger
          className="border-primary rounded-md border-2"
          disabled={isPending}
        >
          <SelectValue placeholder={placeholder} className="" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">الكل</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
