// fixed_useTablePrams.ts

import type { PaginationState, SortingState } from "@tanstack/react-table";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useMemo } from "react";

export function useTablePrams() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // 1. Get current URL state (with safe defaults)
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const limit = Math.max(Number(searchParams.get("limit") || 10), 1);
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort");

  // Keep other filters as they are
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

  /**
   * Helper function to perform a single URL update safely.
   * @param key The parameter key.
   * @param value The parameter value.
   */
  const setParam = (key: string, value?: string | number) => {
    const params = new URLSearchParams(searchParams.toString());
    const stringValue = String(value);

    // Use a unified check for empty/default values
    if (
      value === undefined ||
      value === null ||
      stringValue === "" ||
      (key === "page" && stringValue === "1") // Special case: remove 'page=1' to clean URL
    ) {
      params.delete(key);
    } else {
      params.set(key, stringValue);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  /**
   * Helper function for batching multiple updates into one router call.
   * This is the critical fix for setGlobalFilter and setPagination.
   * @param updates A function that receives the current params and modifies them.
   */
  const batchUpdateParams = (updates: (params: URLSearchParams) => void) => {
    // Start with the current, accurate search parameters
    const params = new URLSearchParams(searchParams.toString());
    updates(params); // Apply all modifications
    router.replace(`${pathname}?${params.toString()}`);
  };

  return {
    pagination,
    sorting,
    globalFilter: search,

    // 1. FIX: Ensure page and limit updates are batched.
    setPagination: (
      updater: PaginationState | ((old: PaginationState) => PaginationState),
    ) => {
      const oldState: PaginationState = {
        pageIndex: page - 1,
        pageSize: limit,
      };

      const newState =
        typeof updater === "function" ? updater(oldState) : updater;

      if (
        newState.pageIndex !== oldState.pageIndex ||
        newState.pageSize !== oldState.pageSize
      ) {
        batchUpdateParams((params) => {
          if (newState.pageIndex !== oldState.pageIndex) {
            const newPage = newState.pageIndex + 1;
            if (newPage > 1) {
              params.set("page", String(newPage));
            } else {
              // Clean the URL by removing page=1
              params.delete("page");
            }
          }
          if (newState.pageSize !== oldState.pageSize) {
            params.set("limit", String(newState.pageSize));
          }
        });
      }
    },

    // 2. FIX: Ensure search and page=1 reset are batched.
    setGlobalFilter: (value: string) => {
      batchUpdateParams((params) => {
        // Apply new search value
        if (value) {
          params.set("search", value);
        } else {
          params.delete("search");
        }
        // Always reset page to 1 when search changes
        params.delete("page"); // Cleaner than setting to "1"
      });
    },

    // 3. Keep setSorting clean
    setSorting: (
      updater: SortingState | ((old: SortingState) => SortingState),
    ) => {
      const state = typeof updater === "function" ? updater([]) : updater;
      const sortState = state[0];

      batchUpdateParams((params) => {
        if (sortState) {
          const sortString = `${sortState.id}.${
            sortState.desc ? "desc" : "asc"
          }`;
          params.set("sort", sortString);
        } else {
          params.delete("sort");
        }
      });
      return state; // Return the state for TanStack Table internal use
    },

    supplierId,
    warehouseId,
    categoryId,
    roles,
    setParam, // For single-parameter updates (like the select fields)
  };
}
