// slices/tableSlice.ts
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ColumnFiltersState, VisibilityState } from "@tanstack/react-table";

interface TableState {
  columnFilters: ColumnFiltersState;
  columnVisibility: VisibilityState;
  rowSelection: Record<string, boolean>;
}

const initialState: TableState = {
  columnFilters: [],
  columnVisibility: {},
  rowSelection: {},
};

const tableSlice = createSlice({
  name: "table",
  initialState,
  reducers: {
    setColumnFilters(state, action: PayloadAction<ColumnFiltersState>) {
      state.columnFilters = action.payload;
    },
    setColumnVisibility(state, action: PayloadAction<VisibilityState>) {
      state.columnVisibility = action.payload;
    },
    setRowSelection(state, action: PayloadAction<Record<string, boolean>>) {
      state.rowSelection = action.payload;
    },
    resetTable(state) {
      state.columnFilters = [];
      state.columnVisibility = {};
      state.rowSelection = {};
    },
  },
});

export const {
  setColumnFilters,
  setColumnVisibility,
  setRowSelection,
  resetTable,
} = tableSlice.actions;

export default tableSlice.reducer;
