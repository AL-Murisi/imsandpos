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
        diff: number;
        qCartons: number;
        qPackets: number;
        qunit: number;
      }>,
    ) => {
      const { productId, sellingUnit, diff, qCartons, qPackets, qunit } =
        action.payload;
      if (diff === 0) return;

      const productIndex = state.products.findIndex((p) => p.id === productId);
      if (productIndex === -1) return;

      // Create a new product object to trigger reactivity
      const product = { ...state.products[productIndex] };

      if (sellingUnit === "carton") {
        product.availableCartons = Math.max(product.availableCartons - diff, 0);
        product.availablePackets = Math.max(
          product.availablePackets - diff * qPackets,
          0,
        );
        product.availableUnits = Math.max(
          product.availableUnits - diff * qPackets * qunit,
          0,
        );
      } else if (sellingUnit === "packet") {
        product.availablePackets = Math.max(product.availablePackets - diff, 0);
        product.availableUnits = Math.max(
          product.availableUnits - diff * qunit,
          0,
        );
        product.availableCartons = Math.floor(
          product.availableUnits / (qPackets * qunit),
        );
      } else if (sellingUnit === "unit") {
        product.availableUnits = Math.max(product.availableUnits - diff, 0);
        product.availablePackets = Math.floor(product.availableUnits / qunit);
        product.availableCartons = Math.floor(
          product.availablePackets / qPackets,
        );
      }

      // Replace the product in the array to update the reference
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
