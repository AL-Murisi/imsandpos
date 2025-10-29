"use client";
import type { PaginationState, SortingState } from "@tanstack/react-table";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMemo } from "react";
export function useTablePrams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.max(Number(searchParams.get("limit") || 7), 1);

  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort");

  const categoryId = searchParams.getAll("categoryId") || undefined;
  const supplierId = searchParams.get("supplierId") || undefined;
  const warehouseId = searchParams.get("warehouseId") || undefined;
  const roles = searchParams.get("roles") || undefined;
  const users = searchParams.get("users") || undefined;
  const sorting: SortingState = useMemo(() => {
    if (!sort) return [];
    const [id, dirction] = sort.split(".");
    return [{ id, desc: dirction === "desc" }];
  }, [sort]);
  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize: limit,
  };

  const setParam = (key: string, value?: string | number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (
      value === undefined ||
      value === "All" ||
      value === null ||
      value === ""
    ) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
    router.replace(`${pathname}?${params.toString()}`);
  };
  return {
    pagination,
    sorting,
    globalFilter: search,

    setPagination: (
      updater: PaginationState | ((old: PaginationState) => PaginationState),
    ) => {
      const state =
        typeof updater === "function"
          ? updater({ pageIndex: page - 1, pageSize: limit })
          : updater;

      setParam("page", state.pageIndex + 1);
      setParam("limit", state.pageSize);
    },

    setSorting: (
      updater: SortingState | ((old: SortingState) => SortingState),
    ) => {
      const state = typeof updater === "function" ? updater([]) : updater;
      const sortState = state[0];
      if (sortState) {
        const sortString = `${sortState.id} ${sortState.desc ? "desc" : "asc"}`;
        setParam("sort", sortString);
      } else {
        setParam("sort", undefined);
      }
      return state;
    },

    setGlobalFilter: (value: string) => {
      (setParam("search", value), setParam("page", 1));
    },
    supplierId,
    warehouseId,
    categoryId,
    roles,
    setParam,
  };
}
