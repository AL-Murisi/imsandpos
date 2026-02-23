"use client";
import {
  PaginationState,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { ChevronDown } from "lucide-react";

import {
  setColumnFilters,
  setColumnVisibility,
  setRowSelection,
} from "@/lib/slices/table";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

interface DataTableProps<T> {
  data: T[];
  columns: any[];
  initialPageSize?: number;
  filterColumnId?: string;
  filterOptions?: {
    value: string;
    label: string;
    icon?: React.ReactNode;
    className?: string;
  }[];
  highet?: string;
  /** ✅ The missing prop that caused your error */
  pageCount: number;
  search?: React.ReactNode;
  /** ✅ All these match what you passed from ProductClient */
  totalCount: number;

  onRowSelectionChange?: (selectedRows: T[]) => void;
  pageActiom: (
    updater: PaginationState | ((old: PaginationState) => PaginationState),
  ) => void;
  onSortingChange: (
    updater: SortingState | ((old: SortingState) => SortingState),
  ) => void;
  onGlobalFilterChange: (value: string) => void;
  globalFilter: string;
  sorting: SortingState;
  pagination: PaginationState;
}

export function DataTable<T>({
  data,
  columns,
  initialPageSize,
  filterColumnId,
  filterOptions = [],
  pageCount,
  totalCount,
  search,
  pageActiom,
  onSortingChange,
  onGlobalFilterChange,
  globalFilter,
  sorting,
  pagination,
  highet,
  onRowSelectionChange,
}: DataTableProps<T>) {
  const dispatch = useAppDispatch();
  const t = useTranslations("table");
  const { columnFilters, columnVisibility, rowSelection } = useAppSelector(
    (state) => state.table,
  );
  function resolveUpdater<T>(updater: T | ((old: T) => T), old: T): T {
    return typeof updater === "function"
      ? (updater as (old: T) => T)(old)
      : updater;
  }

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount,
    onSortingChange,
    onGlobalFilterChange,
    onPaginationChange: pageActiom,
    getCoreRowModel: getCoreRowModel(),

    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination,
    },

    onColumnFiltersChange: (updater) =>
      dispatch(setColumnFilters(resolveUpdater(updater, columnFilters))),

    onColumnVisibilityChange: (updater) =>
      dispatch(setColumnVisibility(resolveUpdater(updater, columnVisibility))),
    onRowSelectionChange: (updater) => {
      const updated = resolveUpdater(updater, rowSelection);
      dispatch(setRowSelection(updated));

      if (typeof onRowSelectionChange === "function") {
        // Map the updated selection directly
        const selected = Object.keys(updated).map((rowId) => {
          const row = table.getRow(rowId);
          return row.original;
        });
        onRowSelectionChange(selected);
      }
    },
  });
  const [isPageLoading, setIsPageLoading] = useState(false);

  const handlePageChange = async (
    action: () => void,
    direction: "next" | "prev",
  ) => {
    setIsPageLoading(true);
    try {
      await action();
      // toast.success(direction === "next" ? t("nextPageLoaded") : t("prevPageLoaded"));
    } finally {
      setIsPageLoading(false);
    }
  };

  return (
    <Card className="@container/card border-transparent bg-transparent px-2">
      <div className="flex flex-wrap items-center justify-between gap-2 space-x-2 px-2 py-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="mr-auto">
              {t("columns")}
              <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                // Extract the header from the column definition
                const header = column.columnDef.header;

                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="text-right capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) =>
                      column.toggleVisibility(!!value)
                    }
                  >
                    {/* If header is a string, show it. 
            If it's a function (like in your 'select' column), 
            render it or fallback to the ID 
          */}
                    {typeof header === "string" ? header : column.id}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="text-muted-foreground min-w-[150px] flex-1 text-right text-sm">
          {/* Align text to the right */}
          <p>
            {t("selected", {
              count: table.getFilteredSelectedRowModel().rows.length,
              total: table.getFilteredRowModel().rows.length,
            })}
          </p>
        </div>
        {search}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              className="border-primary mr-auto border-2 shadow-xl/20 shadow-gray-900" // Use mr-auto for right alignment
            >
              {initialPageSize} {t("rowsPerPage")}
              <ChevronDown className="mr-2 h-4 w-4" />{" "}
              {/* Move the icon to the left */}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {/* Align to the start (right) for RTL */}
            {[10, 20, 50, 100, 1000].map((size) => (
              <DropdownMenuItem
                key={size}
                onClick={() => table.setPageSize(size)}
              >
                {size} {t("rows")}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            {/* Custom Input Field */}
            <div className="p-2">
              <label className="text-muted-foreground mb-1 block text-xs">
                {"عدد مخصص"}
              </label>
              <Input
                type="number"
                placeholder="..."
                className="h-8"
                onKeyDown={(e) => {
                  // We only trigger when "Enter" is pressed
                  if (e.key === "Enter") {
                    // Stop the menu from closing immediately if needed
                    e.preventDefault();

                    const inputValue = e.currentTarget.value;
                    const size = parseInt(inputValue, 10);

                    if (!isNaN(size) && size > 0) {
                      // Set exactly what the user typed
                      table.setPageSize(size);
                    }
                  }
                }}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="space-x-2">
          {/* space-x-2 works for RTL, but you might consider space-x-reverse for explicit control */}
          <Button
            className="shadow-xl/20 shadow-gray-900"
            aria-label=""
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            {t("prev")}
          </Button>
          <Button
            className="shadow-xl/20 shadow-gray-900"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            {t("next")}
          </Button>
        </div>
      </div>

      <ScrollArea
        className={` ${highet ?? "h-190"} min-h-[30vh] w-full rounded-2xl pl-3`}
        dir="rtl"
      >
        <Table className="min-w-full">
          <TableHeader className="bg-background sticky top-0 z-10 shadow-xl/20 shadow-gray-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="text-center"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {data.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="text-center">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  {t("noResults")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      {/* </CardContent>
      </Card> */}
    </Card>
  );
}
