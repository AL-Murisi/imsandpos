import { Button } from "@/components/ui/button";
import { Column, SortingState, Updater } from "@tanstack/react-table";
import { ArrowDown, ArrowUpDown, ArrowUp } from "lucide-react";
import { ParsedSort } from "./sort";
type searchParams = {};
interface SortableHeaderProps<T> {
  column: Column<T, unknown>;
  label: string;
  sort?: string;
}

export function SortableHeader<T>({
  column,
  label,
  sort,
}: SortableHeaderProps<T>) {
  const isSorted = column.getIsSorted();
  // function handleSorting(updater: Updater<SortingState>,
  //     setParam: (key: string, value?: string) => void) {
  //     const newstats = typeof updater === 'function' ? updater([]) : updater;
  //     const sortstate = newstats[0];
  //     if (sortstate) {
  //         const sortString = `${sortstate.id}${sortstate.desc ? "desc" : "asc"}`;
  //         setParam('sort', sortString);
  //     } else (setParam('sort', undefined))
  //     return newstats
  // }

  return (
    <Button variant="ghost" onClick={() => column.toggleSorting()}>
      {label}
      {isSorted === "asc" ? (
        <ArrowUp className="ml-2 h-4 w-4" />
      ) : isSorted === "desc" ? (
        <ArrowDown className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDown className="ml-2 h-4 w-4" />
      )}
    </Button>
  );
}
