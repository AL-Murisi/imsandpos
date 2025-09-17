"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import React from "react";
import { useDebounceEffect } from "./debouns";

export function useFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filter = useMemo(() => {
    return {
      categoryId: searchParams.get("categoryId") || undefined,
      supplierId: searchParams.get("supplierId") || undefined,
      warehouseId: searchParams.get("warehouseId") || undefined,
      users: searchParams.get("users") || undefined,
    };
  }, [searchParams]);

  // Track pending key/value changes
  const [pendingFilter, setPendingFilter] = useState<{
    key?: string;
    value?: string | undefined;
  }>({});

  // Debounced effect to update URL
  useDebounceEffect(
    () => {
      if (!pendingFilter.key) return;

      const { key, value } = pendingFilter;
      const params = new URLSearchParams(searchParams.toString());

      if (value && value !== "All") {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      router.replace(`${pathname}?${params.toString()}`);
    },
    [pendingFilter],
    400 // debounce delay in ms
  );

  const setFilter = (key: string, value: string | undefined) => {
    setPendingFilter({ key, value });
  };

  return {
    filter,
    setFilter,
  };
}
