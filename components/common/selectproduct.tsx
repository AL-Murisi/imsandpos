"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode, useState } from "react";

interface Option {
  id: string;
  name: string;
}

interface ComboboxFieldProps {
  options: Option[];
  value?: string | null;
  action: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  add?: ReactNode;
}

export function SelectField({
  options,
  value,
  action,
  placeholder = "اختر...",
  disabled = false,
  add,
}: ComboboxFieldProps) {
  const [open, setOpen] = useState(false);

  const selected = options.find((opt) => opt.id === value);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          className={cn(
            "border-input bg-background flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm shadow-sm",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <span>{selected?.name ?? placeholder}</span>
          <ChevronDown className="text-muted-foreground h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="end">
        <Command>
          <CommandInput placeholder="ابحث..." />
          <CommandEmpty>لا توجد نتائج</CommandEmpty>
          <CommandGroup>
            {options.map((opt) => (
              <CommandItem
                key={opt.id}
                value={opt.name}
                onSelect={() => {
                  setOpen(false);
                  action(opt.id);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === opt.id ? "opacity-100" : "opacity-0",
                  )}
                />
                {opt.name}
              </CommandItem>
            ))}
            {add}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
