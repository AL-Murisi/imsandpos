import type { SortingState } from "@tanstack/react-table";
export function ParsedSort(sort?: string): SortingState {
  if (!sort) return [];
  const [id, direction] = sort.split(" ");
  return [{ id, desc: direction === "asc" }];
}
