"use client";

import React, { useState, useTransition } from "react";
import { Input } from "../ui/input";
import { useDebouncedCallback } from "use-debounce";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "../ui/command";
import { ScrollArea } from "../ui/scroll-area";
import SearchStatus from "./SearchStatus";
import { parseAsString, useQueryState } from "nuqs";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

// lib/types.ts
interface UserOption {
  id?: string;
  name?: string;
  phoneNumber?: string | null;
  outstandingBalance?: number;
}

type SearchInputProps = {
  placeholder: string;
  paramKey: string;
  options: UserOption[];
  action: (users: UserOption) => void;
};

export default function SearchInput({
  placeholder,
  paramKey,
  options,
  action,
}: SearchInputProps) {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useQueryState(
    `${paramKey}query`,
    parseAsString.withDefault("").withOptions({
      shallow: false,
      startTransition,
    }),
  );
  const [open, setOpen] = useState(false);

  const debouncedSetQuery = useDebouncedCallback((value: string) => {
    setQuery(value);
    setOpen(true);
  }, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    debouncedSetQuery(e.target.value);
  };

  const filteredOptions = options.filter((opt) =>
    opt.name?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Button
            variant={"outline"}
            className={cn(
              "border-primary flex w-full cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-sm shadow-sm",
            )}
          >
            <span>{placeholder}</span>
            <ChevronDown className="text-muted-foreground h-4 w-4" />
          </Button>
        </div>
      </PopoverTrigger>

      <PopoverContent className="p-0" align="end">
        <Command>
          <div className="relative w-full">
            <CommandInput
              placeholder="ابحث..."
              value={query}
              autoComplete="off"
              onChangeCapture={(e: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
            />
            <div className="absolute top-1/2 right-10 -translate-y-1/2">
              <button onClick={() => setQuery("")}>
                <SearchStatus searching={isPending} />
              </button>
            </div>
          </div>
          <ScrollArea className="h-36">
            <CommandEmpty>لا توجد نتائج</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.name}
                  onSelect={() => {
                    action(opt);
                    setOpen(false);
                    setQuery(opt.name ?? "");
                  }}
                >
                  {opt.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </ScrollArea>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
