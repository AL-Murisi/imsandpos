import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { CashierItem, ProductForSale } from "@/lib/zodType";
import { getAllactiveproductsForSale } from "@/app/actions/createProduct";
import { fetchCategoriesForSelect } from "@/app/actions/roles";
import { SellingUnit, updateQty } from "./cartSlice";

type CategoryItem = { label: string; value: string; checked: boolean };
type forsale = ProductForSale & {
  warehousename: string;
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

export const fetchCategories = createAsyncThunk(
  "products/fetchCategories",
  async () => {
    const raw = await fetchCategoriesForSelect();
    return raw.map((cat: any) => ({
      label: cat.name,
      value: cat.id,
      checked: false,
    }));
  }
);

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    setCategoryChecked: (
      state,
      action: PayloadAction<{ value: string; checked: boolean }>
    ) => {
      state.categories = state.categories.map((c) =>
        c.value === action.payload.value
          ? { ...c, checked: action.payload.checked }
          : c
      );
    },
    clearCategory: (state, action: PayloadAction<string>) => {
      state.categories = state.categories.map((c) =>
        c.value === action.payload ? { ...c, checked: false } : c
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
      }>
    ) => {
      const { productId, sellingUnit, diff, qCartons, qPackets, qunit } =
        action.payload;
      const item = state.items.find(
        (p) => p.id === productId && p.sellingUnit === sellingUnit
      );

      const product = state.products.find((p) => p.id === productId);
      if (!product || diff === 0) return;
      if (sellingUnit === "carton") {
        product.availableCartons -= diff;
        product.availablePackets -= diff * qPackets;
        product.availableUnits -= diff * qPackets * qunit;
      } else if (sellingUnit === "packet") {
        product.availablePackets -= diff;
        (product.availableUnits -= diff * qunit),
          (product.availableCartons = Math.floor(
            product.availableUnits / qPackets
          ));
      } else if (sellingUnit === "unit") {
        product.availableUnits -= diff;
        product.availablePackets = Math.floor(product.availableUnits / qunit);
        product.availableCartons = Math.floor(
          product.availablePackets / qPackets
        );
      }
      product.availableCartons = Math.max(product.availableCartons, 0);
      product.availablePackets = Math.max(product.availablePackets, 0);

      product.availableUnits = Math.max(product.availableUnits, 0);
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
