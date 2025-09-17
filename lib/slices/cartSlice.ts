// import { createSlice, PayloadAction } from "@reduxjs/toolkit";
// import type { CashierItem } from "@/lib/zodType";

// export type SellingUnit = "carton" | "packet" | "unit";
// // type CartItem = {
// //   productId: number
// //   name: string
// //   quantity: number
// //   unit: string
// //   unitPrice: number
// //   maxStock: number
// //   pricePerCarton?: number
// //   packetsPerCarton?: number
// //   unitsPerPacket?: number
// // }

// export interface CartItem extends CashierItem {
//   id: string;
//   name: string;
//   sellingUnit: SellingUnit;
//   selectedQty: number;
//   action: string;
//   warehousename: string;
//   originalStockQuantity: number;
//   unitsPerPacket: number;
//   packetsPerCarton: number;
// }

// interface Payment extends CartItem {
//   discountType: "fixed" | "percentage";
//   discountValue: number;
// }
// interface CartState {
//   items: CartItem[];
//   discountType: "fixed" | "percentage";
//   discountValue: number;
// }

// const initialState: CartState = {
//   items: [],
//   discountType: "fixed",
//   discountValue: 0,
// };

// const cartSlice = createSlice({
//   name: "cart",
//   initialState,
//   reducers: {
//     addToCart: (state, action: PayloadAction<CartItem>) => {
//       const existing = state.items.find(
//         (i) =>
//           i.id === action.payload.id &&
//           i.sellingUnit === action.payload.sellingUnit
//       );
//       if (!existing) state.items.push(action.payload);
//     },
//     removeFromCart: (
//       state,
//       action: PayloadAction<{ id: string; sellingUnit: SellingUnit }>
//     ) => {
//       state.items = state.items.filter(
//         (i) =>
//           !(
//             i.id === action.payload.id &&
//             i.sellingUnit === action.payload.sellingUnit
//           )
//       );
//     },

//     updateQty: (
//       state,
//       action: PayloadAction<{
//         id: string;
//         sellingUnit: SellingUnit;
//         qty: number;
//         action: string;
//       }>
//     ) => {
//       const item = state.items.find(
//         (i) =>
//           i.id === action.payload.id &&
//           i.sellingUnit === action.payload.sellingUnit
//       );
//       if (action.payload.action === "plus") {
//         if (item) item.selectedQty += Math.max(0, action.payload.qty);
//       } else if (action.payload.action === "mins") {
//         if (item) item.selectedQty -= Math.max(0, action.payload.qty);
//       } else {
//       }
//     },
//     changeSellingUnit: (
//       state,
//       action: PayloadAction<{
//         id: string;
//         from: SellingUnit;
//         to: SellingUnit;
//         product: { packetsPerCarton: number; unitsPerPacket: number };
//         qty: number;
//       }>
//     ) => {
//       const item = state.items.find(
//         (i) =>
//           i.id === action.payload.id && i.sellingUnit === action.payload.from
//       );
//       if (!item) return;
//       const { from, to, product, qty } = action.payload;
//       let newQty = qty;
//       if (from === "carton" && to === "packet")
//         newQty = qty * product.packetsPerCarton;
//       else if (from === "carton" && to === "unit")
//         newQty = qty * product.packetsPerCarton * product.unitsPerPacket;
//       else if (from === "packet" && to === "carton")
//         newQty = Math.floor(qty / product.packetsPerCarton);
//       else if (from === "packet" && to === "unit")
//         newQty = qty * product.unitsPerPacket;
//       else if (from === "unit" && to === "packet")
//         newQty = Math.floor(qty / product.unitsPerPacket);
//       else if (from === "unit" && to === "carton")
//         newQty = Math.floor(
//           qty / (product.unitsPerPacket * product.packetsPerCarton)
//         );

//       item.sellingUnit = to;
//       item.selectedQty = newQty;
//     },
//     setDiscount: (
//       state,
//       action: PayloadAction<{ type: "fixed" | "percentage"; value: number }>
//     ) => {
//       state.discountType = action.payload.type;
//       state.discountValue = action.payload.value;
//     },
//     addtoPayment: (state, action: PayloadAction<Payment>) => {
//       const existing = state.items.find(
//         (i) =>
//           i.id === action.payload.id &&
//           i.sellingUnit === action.payload.sellingUnit
//       );
//       if (!existing) state.items.push(action.payload);
//     },
//     clearCart: (state) => {
//       state.items = [];
//       state.discountValue = 0;
//       state.discountType = "fixed";
//     },
//   },
// });

// export const {
//   addToCart,
//   removeFromCart,
//   updateQty,
//   changeSellingUnit,
//   setDiscount,
//   clearCart,
// } = cartSlice.actions;
// export default cartSlice.reducer;
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CashierItem, ProductForSale } from "@/lib/zodType";

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
    //       state,
    //       action: PayloadAction<{ id: string; sellingUnit: SellingUnit }>
    //     ) => {
    //       state.items = state.items.filter(
    //         (i) =>
    //           !(
    //             i.id === action.payload.id &&
    //             i.sellingUnit === action.payload.sellingUnit
    //           )
    //       );
    //     },
    removeFromCart: (state, action: PayloadAction<string>) => {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (!cart) return;
      cart.items = cart.items.filter((i) => i.id !== action.payload);
    },
    //updateQty: (
    //       state,
    //       action: PayloadAction<{
    //         id: string;
    //         sellingUnit: SellingUnit;
    //         qty: number;
    //         action: string;
    //       }>
    //     ) => {
    //       const item = state.items.find(
    //         (i) =>
    //           i.id === action.payload.id &&
    //           i.sellingUnit === action.payload.sellingUnit
    //       );
    //       if (action.payload.action === "plus") {
    //         if (item) item.selectedQty += Math.max(0, action.payload.qty);
    //       } else if (action.payload.action === "mins") {
    //         if (item) item.selectedQty -= Math.max(0, action.payload.qty);
    //       } else {
    //       }
    //     },
    updateQty(
      state,
      action: PayloadAction<{
        id: string;
        quantity: number;
        sellingUnit: SellingUnit;
        action: string;
      }>
    ) {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (!cart) return;

      const item = cart.items.find(
        (i) =>
          i.id === action.payload.id &&
          i.sellingUnit === action.payload.sellingUnit
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
      action: PayloadAction<{ type: "fixed" | "percentage"; value: number }>
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
      }>
    ) => {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (!cart) return;

      const item = cart.items.find(
        (i) =>
          i.id === action.payload.id && i.sellingUnit === action.payload.from
      );

      if (!item) return;
      const { from, to, product, qty } = action.payload;
      let newQty = qty;
      if (from === "carton" && to === "packet")
        newQty = qty * product.packetsPerCarton;
      else if (from === "carton" && to === "unit")
        newQty = qty * product.packetsPerCarton * product.unitsPerPacket;
      else if (from === "packet" && to === "carton")
        newQty = Math.floor(qty / product.packetsPerCarton);
      else if (from === "packet" && to === "unit")
        newQty = qty * product.unitsPerPacket;
      else if (from === "unit" && to === "packet")
        newQty = Math.floor(qty / product.unitsPerPacket);
      else if (from === "unit" && to === "carton")
        newQty = Math.floor(
          qty / (product.unitsPerPacket * product.packetsPerCarton)
        );

      item.sellingUnit = to;
      item.selectedQty = newQty;
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
