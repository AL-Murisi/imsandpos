"use client";

import { ChevronDownIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((m) => m.Calendar),
  {
    ssr: false,
    loading: () => <input type="date" className="..." />,
  },
);
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  subDays,
  addDays,
} from "date-fns";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

interface DateRangeFilterProps {
  fromKey: string;
  toKey: string;
}

export function DateRangeFilter({ fromKey, toKey }: DateRangeFilterProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const t = useTranslations("datePicker");
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });

  useEffect(() => {
    const fromParam = searchParams.get(fromKey);
    const toParam = searchParams.get(toKey);
    setDate({
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
    });
  }, [searchParams, fromKey, toKey]);
  useEffect(() => {
    const debounce = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      // Only update if different
      const currentFrom = searchParams.get(fromKey);
      const currentTo = searchParams.get(toKey);
      const newFrom = date?.from ? format(date.from, "yyyy-MM-dd") : null;
      const newTo = date?.to ? format(date.to, "yyyy-MM-dd") : null;

      if (newFrom !== currentFrom) {
        if (newFrom) params.set(fromKey, newFrom);
        else params.delete(fromKey);
      }

      if (newTo !== currentTo) {
        if (newTo) params.set(toKey, newTo);
        else params.delete(toKey);
      }

      // Only push if params actually changed
      if (params.toString() !== searchParams.toString()) {
        replace(`${pathname}?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [date, fromKey, toKey, pathname, replace, searchParams.toString()]);

  const formatted = date?.from
    ? date.to
      ? `from ${format(date.from, "yyyy-MM-dd")} to ${format(
          date.to,
          "yyyy-MM-dd",
        )}`
      : `from ${format(date.from, "yyyy-MM-dd")}`
    : t("label");

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate({ from: undefined, to: undefined });
  };

  const setToday = () => {
    const today = new Date();
    setDate({
      from: startOfDay(today),
      to: endOfDay(addDays(today, 1)),
    });
  };

  const setThisMonth = () => {
    const today = new Date();
    setDate({
      from: startOfMonth(today),
      to: endOfMonth(today),
    });
  };

  const setThreeMonths = () => {
    const today = new Date();
    setDate({
      from: startOfDay(subDays(today, 89)),
      to: endOfDay(today),
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={`${fromKey}-range-date`}
            className="border-primary w-64 justify-between rounded-2xl border-2 font-normal dark:border-amber-50"
          >
            <span className="truncate">{formatted}</span>
            {date?.from || date?.to ? (
              <X
                className="text-muted-foreground ml-2 h-4 w-4 hover:text-red-500"
                onClick={clearSelection}
              />
            ) : (
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="range"
            selected={date}
            onSelect={setDate}
            numberOfMonths={1}
          />
          <div className="flex justify-end gap-2 border-t p-2">
            <Button variant="ghost" size="sm" onClick={setToday}>
              {t("today")}
            </Button>
            <Button variant="ghost" size="sm" onClick={setThisMonth}>
              {t("thismonth")}
            </Button>
            <Button variant="ghost" size="sm" onClick={setThreeMonths}>
              {t("threemonths")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearSelection(e);
              }}
            >
              {t("delete")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
