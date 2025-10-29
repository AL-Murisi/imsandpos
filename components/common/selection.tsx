"use client";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseAsString } from "nuqs";
import { useQueryState } from "nuqs";
import { useTransition } from "react";

interface Option {
  id: string;
  name: string;
}

interface SelectFieldProps {
  options: Option[];
  paramKey: string; // e.g., "category"
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

  return (
    <div className="bg-accent rounded-2xl shadow-xl/20 shadow-gray-900">
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger
          className="border-primary rounded-md border-2"
          disabled={isPending}
        >
          <SelectValue placeholder={placeholder} />
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
