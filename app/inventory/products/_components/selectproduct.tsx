// components/common/selection.tsx
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  id: string;
  name: string;
}

// selectproduct.tsx
interface SelectFieldProps {
  options: Option[];
  value?: string | null; // <-- add null here
  action: (value: string) => void;
  placeholder?: string;
}

export function SelectField({
  options,
  value,
  action,
  placeholder,
}: SelectFieldProps) {
  return (
    <Select
      value={value ?? undefined} // <-- convert null to undefined
      onValueChange={action}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id}>
            {opt.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
