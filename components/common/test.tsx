"use client";
import {
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  PaginationState,
  getCoreRowModel,
  useReactTable,
  flexRender,
} from "@tanstack/react-table";

import { ChevronDown } from "lucide-react";

import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import { useTablePrams } from "@/hooks/useTableParams";
import { Card } from "../ui/card";
import { useAppDispatch, useAppSelector } from "@/lib/store";
import {
  setColumnFilters,
  setColumnVisibility,
  setRowSelection,
} from "@/lib/slices/table";

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

  /** ✅ All these match what you passed from ProductClient */
  totalCount: number;
  pageActiom: (
    updater: PaginationState | ((old: PaginationState) => PaginationState)
  ) => void;
  onSortingChange: (
    updater: SortingState | ((old: SortingState) => SortingState)
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
  pageActiom,
  onSortingChange,
  onGlobalFilterChange,
  globalFilter,
  sorting,
  pagination,
  highet,
}: DataTableProps<T>) {
  const dispatch = useAppDispatch();

  const { columnFilters, columnVisibility, rowSelection } = useAppSelector(
    (state) => state.table
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

    onRowSelectionChange: (updater) =>
      dispatch(setRowSelection(resolveUpdater(updater, rowSelection))),
  });

  const {
    setPagination,
    setSorting,
    setGlobalFilter,
    warehouseId,
    supplierId,
    categoryId,
    setParam,
  } = useTablePrams();
  return (
    <Card className="@container/card  border-0   px-2  bg-transparent">
      <div className="flex items-center justify-between space-x-2 py-4 px-2 flex-wrap gap-2 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="mr-auto">
              {" "}
              {/* Use mr-auto for right alignment in RTL */}
              الأعمدة <ChevronDown />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {" "}
            {/* Align to the start (right) for RTL */}
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize text-right" // Align text to the right
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {/* You might want to map column.id to Arabic names if possible */}
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="text-muted-foreground flex-1 text-sm min-w-[150px] text-right">
          {" "}
          {/* Align text to the right */}
          تم اختيار {table.getFilteredSelectedRowModel().rows.length} من{" "}
          {table.getFilteredRowModel().rows.length} صف.
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              className="mr-auto border-2 border-primary" // Use mr-auto for right alignment
            >
              {initialPageSize} صفوف لكل صفحة{" "}
              <ChevronDown className="mr-2 h-4 w-4" />{" "}
              {/* Move the icon to the left */}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {" "}
            {/* Align to the start (right) for RTL */}
            {[5, 10, 20, 50].map((size) => (
              <DropdownMenuItem
                key={size}
                onClick={() => table.setPageSize(size)}
              >
                {size} صفوف
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => table.setPageSize(5)}>
              إعادة ضبط
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="space-x-2">
          {" "}
          {/* space-x-2 works for RTL, but you might consider space-x-reverse for explicit control */}
          <Button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            السابق
          </Button>
          <Button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            التالي
          </Button>
        </div>
      </div>

      <ScrollArea
        className={` ${
          highet ?? "h-190"
        }  min-h-[30vh]  w-full  border rounded-2xl pl-1`}
        dir="rtl"
      >
        <Table className="min-w-full ">
          <TableHeader className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className=" text-center"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
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
                    <TableCell key={cell.id} className=" text-center">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
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
                  No results.
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
