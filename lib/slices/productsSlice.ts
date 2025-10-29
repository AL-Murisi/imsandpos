import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { CashierItem, ProductForSale } from "@/lib/zod";

import { SellingUnit, updateQty } from "./cartSlice";

type CategoryItem = { label: string; value: string; checked: boolean };
type forsale = ProductForSale & {
  warehousename: string;
  sellingMode: string;
};
export interface CartItem extends CashierItem {
  id: string;
  name: string;
  sellingUnit: SellingUnit;
  selectedQty: number;
  warehouseName?: string;

  originalStockQuantity: number;
  unitsPerPacket: number;
  packetsPerCarton: number;
}
interface ProductsState {
  products: forsale[];
  items: CartItem[];
  categories: CategoryItem[];
  status: "idle" | "loading" | "failed";
  error?: string | null;
}

const initialState: ProductsState = {
  products: [],
  items: [],
  categories: [],
  status: "idle",
  error: null,
};

// export const fetchProducts = createAsyncThunk(
//   "products/fetchProducts",
//   async ({
//     categoryIds,
//     search,
//   }: {
//     categoryIds: string[];
//     search?: string;
//   }) => {
//     // reuse your existing API helper
//     const result = await getAllactiveproductsForSale(categoryIds, search || "");
//     return result as ProductForSale[];
//   }
// );
function convertFromBaseUnit(product: any, availableUnits: number) {
  const unitsPerPacket = product.unitsPerPacket || 1;
  const packetsPerCarton = product.packetsPerCarton || 1;

  const availablePackets = Number((availableUnits / unitsPerPacket).toFixed(2));
  const availableCartons = Number(
    (availablePackets / packetsPerCarton).toFixed(2),
  );

  return { availablePackets, availableCartons };
}
function convertToBaseUnits(
  qty: number,
  sellingUnit: string,
  unitsPerPacket: number,
  packetsPerCarton: number,
): number {
  if (sellingUnit === "unit") return qty;
  if (sellingUnit === "packet") return qty * unitsPerPacket;
  if (sellingUnit === "carton") return qty * unitsPerPacket * packetsPerCarton;
  return qty;
}
const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setCategoryChecked: (
      state,
      action: PayloadAction<{ value: string; checked: boolean }>,
    ) => {
      state.categories = state.categories.map((c) =>
        c.value === action.payload.value
          ? { ...c, checked: action.payload.checked }
          : c,
      );
    },
    clearCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.map((c) =>
        c.value === action.payload ? { ...c, checked: false } : c,
      );
    },

    updateProductSock: (
      state,
      action: PayloadAction<{
        productId: string;
        sellingUnit: SellingUnit;
        selectedQty: number;
        unitsPerPacket: number;
        availableUnits: number;
        packetsPerCarton: number;
      }>,
    ) => {
      const {
        productId,
        sellingUnit,
        selectedQty,
        unitsPerPacket,
        availableUnits,
        packetsPerCarton,
      } = action.payload;
      if (selectedQty === 0) return;

      const productIndex = state.products.findIndex((p) => p.id === productId);
      if (productIndex === -1) return;

      const product = { ...state.products[productIndex] };

      // 1️⃣ Convert selectedQty to base units
      const qtyInBaseUnits = convertToBaseUnits(
        selectedQty,
        sellingUnit,
        unitsPerPacket,
        packetsPerCarton,
      );

      // 2️⃣ Subtract from available units (base units)
      const newAvailableUnits = Math.max(product.availableUnits || 0);

      // 3️⃣ Convert back to all units
      const { availableCartons, availablePackets } = convertFromBaseUnit(
        product,
        availableUnits,
      );

      // 4️⃣ Update product stock
      product.availableUnits = newAvailableUnits;
      product.availablePackets = availablePackets;
      product.availableCartons = availableCartons;

      // 5️⃣ Replace product in state
      state.products = [
        ...state.products.slice(0, productIndex),
        product,
        ...state.products.slice(productIndex + 1),
      ];
    },

    setProductsLocal: (state, action: PayloadAction<forsale[]>) => {
      state.products = action.payload;
    },
  },
  // extraReducers: (builder) => {
  //   builder
  //     .addCase(fetchProducts.pending, (state) => {
  //       state.status = "loading";
  //     })
  //     .addCase(fetchProducts.fulfilled, (state, action) => {
  //       state.status = "idle";
  //       state.products = action.payload;
  //     })
  //     .addCase(fetchProducts.rejected, (state, action) => {
  //       state.status = "failed";
  //       state.error = action.error.message;
  //     })
  //     .addCase(fetchCategories.fulfilled, (state, action) => {
  //       state.categories = action.payload;
  //     });
  // },
});

export const {
  setCategoryChecked,
  clearCategory,
  setProductsLocal,
  updateProductSock,
} = productsSlice.actions;
export default productsSlice.reducer;
