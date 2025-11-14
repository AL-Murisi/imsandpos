"use client";

import { ChevronDownIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import dynamic from "next/dynamic";
const Calendar = dynamic(
  () => import("@/components/ui/calendar").then((m) => m.Calendar),
  {
    ssr: false,
  },
);

import {
  addDays,
  endOfDay,
  endOfMonth,
  format,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
export function Calendar22() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({
    from: undefined,
    to: undefined,
  });
  const formatted = date?.from
    ? date.to
      ? `from ${format(date.from, "yyyy-MM-dd")} to ${format(
          date.to,
          "yyyy-MM-dd",
        )}`
      : `from ${format(date.from, "yyyy-MM-dd")}`
    : " اختر تاريخًا ";
  // Sync date state with URL params on every change
  useEffect(() => {
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    setDate({
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
    });
  }, [searchParams]);

  // Debounced URL update effect stays same
  useEffect(() => {
    const debounce = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      if (date?.from) {
        params.set("from", format(date.from, "yyyy-MM-dd"));
      } else {
        params.delete("from");
      }

      if (date?.to) {
        params.set("to", format(date.to, "yyyy-MM-dd"));
      } else {
        params.delete("to");
      }
      if (params.toString() !== searchParams.toString()) {
        replace(`${pathname}?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [date, searchParams, pathname, replace]);

  // ... rest of your component

  // Debounce syncing URL params when date changes

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
      from: startOfDay(subDays(today, 89)), // 90 days ago (including today)
      to: endOfDay(today),
    });
  };
  return (
    <div className="bg-accent flex flex-col gap-3 rounded-[10px] shadow-xl/20 shadow-gray-900">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            aria-label="time"
            variant="outline"
            id="range-date"
            className="border-primary w-64 justify-end font-normal"
          >
            <span className="truncate text-right">{formatted}</span>
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
            <Button
              aria-label="time"
              variant="ghost"
              size="sm"
              onClick={setToday}
            >
              اليوم
            </Button>
            <Button
              aria-label="time"
              variant="ghost"
              size="sm"
              onClick={setThisMonth}
            >
              هذا الشهر
            </Button>
            <Button
              aria-label="time"
              variant="ghost"
              size="sm"
              onClick={setThreeMonths}
            >
              90 يوم
            </Button>
            <Button
              aria-label="time"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearSelection(e);
              }}
            >
              مسح
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
