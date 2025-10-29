"use client";

import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Label } from "../ui/label";
import { useTranslations } from "next-intl";
import { useOptimistic, useState, useTransition } from "react";

interface Option {
  id: string;
  name: string;
}

interface MultiSelectFieldProps {
  options: Option[];
  placeholder: string;
  selectkey: string;
}

export function Selection({
  options,
  placeholder,
  selectkey,
}: MultiSelectFieldProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("selection");

  const value = searchParams.getAll(`${selectkey}`);
  const [optimisticParam, setOptimisticParam] = useOptimistic(
    searchParams.getAll(`${selectkey}`),
  );
  const updateCategories = (values: string[]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(`${selectkey}`);
    values.forEach((v) => params.append(`${selectkey}`, v));

    // Wrap router.push in a transition so React knows this is async navigation
    startTransition(() => {
      setOptimisticParam(values);
      if (params.toString() !== searchParams.toString()) {
        router.push(`${pathname}?${params.toString()}`);
      }
    });
  };

  const handleToggle = (optionId: string) => {
    if (optimisticParam.includes(optionId)) {
      updateCategories(value.filter((val) => val !== optionId));
    } else {
      const newValues = [...optimisticParam, optionId];
      if (newValues.length === options.length) {
        updateCategories([]);
      } else {
        updateCategories(newValues);
      }
    }
  };

  const handleRemoveBadge = (optionId: string) => {
    updateCategories(value.filter((val) => val !== optionId));
  };

  const getOptionName = (optionId: string) => {
    const option = options.find((o) => o.id === optionId);
    return option ? option.name : optionId;
  };
  const badgesToRender =
    value.length === 0
      ? options
      : options.filter((option) => value.includes(option.id));

  return (
    <div
      data-pending={isPending ? "" : undefined}
      className="flex flex-col gap-4"
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="border-primary w-full justify-between rounded-xl border-2 dark:border-amber-50"
          >
            <span className="text-muted-foreground">{placeholder}</span>

            <ChevronDown
              color={"white"}
              className="ml-2 h-4 w-4 shrink-0 opacity-50"
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  value="All"
                  key={""}
                  onSelect={() => updateCategories([])}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <div
                    className={cn(
                      "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                      value.length === 0
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50",
                    )}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                  <span>{t("all")}</span>
                </CommandItem>
                {options.map((option, idx) => (
                  <CommandItem
                    key={idx}
                    value={option.id}
                    onSelect={() => handleToggle(option.id)}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <div
                      className={cn(
                        "border-primary mr-2 flex h-4 w-4 items-center justify-center rounded-sm border",
                        value.includes(option.id)
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50",
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{option.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* <div className="flex flex-wrap gap-1">
        {badgesToRender.length > 0 &&
          badgesToRender.map((option) => (
            <div key={option.id} className="rounded-[10px]">
              <Badge className="flex cursor-pointer flex-row">
                <Label>{option.name}</Label>
                {value.length > 0 ? ( // Only show the remove button if not in "All" mode
                  <Button
                    type="button"
                    className="ml-1 text-xs"
                    aria-label={`Remove ${option.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveBadge(option.id);
                    }}
                  >
                    ×
                  </Button>
                ) : (
                  <Button
                    type="button"
                    className="ml-1 text-xs"
                    aria-label={`Remove ${option.name}`}
                    onClick={(e) => {
                      handleToggle(option.id);
                    }}
                  >
                    +
                  </Button>
                )}
              </Badge>
            </div>
          ))}
      </div> */}
    </div>
  );
}
