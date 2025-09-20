// lib/slices/table.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  ColumnFiltersState,
  VisibilityState,
  RowSelectionState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table";

interface TableState {
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  rowSelection: RowSelectionState;
  pagination: PaginationState;
  sorting: SortingState;
}

const initialState: TableState = {
  columnFilters: [],
  columnVisibility: {},
  rowSelection: {},
  pagination: { pageIndex: 0, pageSize: 10 },
  sorting: [],
};

export const tableSlice = createSlice({
  name: "table",
  initialState,
  reducers: {
    setColumnFilters: (state, action: PayloadAction<ColumnFiltersState>) => {
      state.columnFilters = action.payload;
    },
    setColumnVisibility: (state, action: PayloadAction<VisibilityState>) => {
      state.columnVisibility = action.payload;
    },
    setRowSelection: (state, action: PayloadAction<RowSelectionState>) => {
      state.rowSelection = action.payload;
    },
    setPagination: (state, action: PayloadAction<PaginationState>) => {
      state.pagination = action.payload;
    },
    setSorting: (state, action: PayloadAction<SortingState>) => {
      state.sorting = action.payload;
    },
  },
});

export const {
  setColumnFilters,
  setColumnVisibility,
  setRowSelection,
  setPagination,
  setSorting,
} = tableSlice.actions;
export default tableSlice.reducer;
