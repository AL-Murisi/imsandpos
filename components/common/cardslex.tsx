"use client";

import React, { useOptimistic, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

// Define your sections and chartConfigs types more precisely if you want
type Section = {
  description: string;
  label: string;
  chartData?: { date: string; value: number }[];
};
type ChartConfig = {
  label: string;
  stroke: string;
  fill: string;
  dateFormat?: string;
};

const dateFilterKeys = ["From", "To"] as const;

interface CardSelectorProps {
  sections: Section[];
  //   action: (e: string) => void;
  chartConfigs: Record<string, ChartConfig>;
}

export default function CardSelector({
  sections,
  //   action,
  chartConfigs,
}: CardSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const t = useTranslations("selection");
  const [optimisticParam, setOptimisticParam] = useOptimistic(
    searchParams.get("card") || "all",
  );
  // Controlled selected card state synced with URL

  // Sync selectedCard from URL param
  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    // set the new tab
    params.set("card", value);

    // delete filters
    [
      "allFrom",
      "allTo",
      "revenueFrom",
      "revenueTo",
      "salesFrom",
      "salesTo",
      "debtFrom",
      "debtTo",
      "purchasesFrom",
      "purchasesTo",
    ].forEach((param) => params.delete(param));
    startTransition(() => {
      setOptimisticParam(value);
      if (params.toString() !== searchParams.toString()) {
        router.push(`${pathname}?${params.toString()}`);
      }
    });
  }

  return (
    <div data-pending={isPending ? "" : undefined}>
      <Select value={optimisticParam} onValueChange={handleChange}>
        <SelectTrigger
          aria-label="chose"
          className="border-primary rounded-md border-2"
        >
          <SelectValue placeholder={optimisticParam ?? "اختر بطاقة"} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="all">{t("all")}</SelectItem>
            {sections
              .filter((s) => s.chartData)
              .map((s) => (
                <SelectItem key={s.description} value={s.description}>
                  {chartConfigs[s.description]?.label || s.label}
                </SelectItem>
              ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
