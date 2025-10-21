import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CashierItem } from "@/lib/zod";

export type SellingUnit = "carton" | "packet" | "unit";

export type Cart = {
  id: string; // tab/cart id
  name: string; // e.g. "Cart 1", "Cart 2"
  items: CartItem[];
};
export interface CartItem extends CashierItem {
  id: string;
  name: string;
  sellingUnit: SellingUnit;
  selectedQty: number;
  action: string;
  warehousename: string;
  sellingMode: string;
  originalStockQuantity: number;
  unitsPerPacket: number;
  packetsPerCarton: number;
}
interface CartState {
  carts: Cart[];
  activeCartId?: string | null;
  discountType: "fixed" | "percentage";
  discountValue: number;
}

const initialState: CartState = {
  carts: [],
  activeCartId: undefined,
  discountType: "fixed",
  discountValue: 0,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    // 🔹 Tab Management
    addCart: (state, action: PayloadAction<{ id: string; name: string }>) => {
      state.carts.push({
        id: action.payload.id,
        name: action.payload.name,
        items: [],
      });
      state.activeCartId = action.payload.id;
    },
    removeCart: (state, action: PayloadAction<string>) => {
      state.carts = state.carts.filter((c) => c.id !== action.payload);
      if (state.activeCartId === action.payload) {
        state.activeCartId = state.carts.length ? state.carts[0].id : null;
      }
    },
    setActiveCart: (state, action: PayloadAction<string>) => {
      state.activeCartId = action.payload;
    },

    // 🔹 Item Management
    addItem: (state, action: PayloadAction<CartItem>) => {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (!cart) return;
      const existing = cart.items.find((i) => i.id === action.payload.id);
      if (existing) {
        existing.selectedQty += action.payload.selectedQty;
      } else {
        cart.items.push(action.payload);
      }
    },
    //     removeFromCart: (

    removeFromCart: (state, action: PayloadAction<string>) => {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (!cart) return;
      cart.items = cart.items.filter((i) => i.id !== action.payload);
    },

    updateQty(
      state,
      action: PayloadAction<{
        id: string;
        quantity: number;
        sellingUnit: SellingUnit;
        action: string;
      }>,
    ) {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (!cart) return;

      const item = cart.items.find(
        (i) =>
          i.id === action.payload.id &&
          i.sellingUnit === action.payload.sellingUnit,
      );
      if (item) {
        if (action.payload.action === "plus") {
          item.selectedQty += action.payload.quantity;
        } else if (action.payload.action === "mins") {
          item.selectedQty -= action.payload.quantity;
        }
      }
    },

    // 🔹 Discounts & Selling Unit
    setDiscount: (
      state,
      action: PayloadAction<{ type: "fixed" | "percentage"; value: number }>,
    ) => {
      state.discountType = action.payload.type;
      state.discountValue = action.payload.value;
    },

    changeSellingUnit: (
      state,
      action: PayloadAction<{
        id: string;
        from: SellingUnit;
        to: SellingUnit;
        product: { packetsPerCarton: number; unitsPerPacket: number };
        qty: number;
      }>,
    ) => {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (!cart) return;

      const item = cart.items.find(
        (i) =>
          i.id === action.payload.id && i.sellingUnit === action.payload.from,
      );

      if (!item) return;

      const { to } = action.payload;

      // Simply set quantity to 1 when changing units
      item.sellingUnit = to;
      item.selectedQty = 1;
    },

    // 🔹 Cart Utilities
    clearCart: (state) => {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (cart) cart.items = [];
    },
    clearAllCart: (state) => {
      state.carts = [];
    },
  },
});

export const {
  setActiveCart,
  addCart,
  removeCart,
  changeSellingUnit,
  setDiscount,
  updateQty,
  clearAllCart,
  addItem,
  removeFromCart,
  clearCart,
} = cartSlice.actions;

export default cartSlice.reducer;
