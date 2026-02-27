import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { CashierItem, SellingUnit } from "@/lib/zod";

export type Cart = {
  id: string; // tab/cart id
  name: string; // e.g. "Cart 1", "Cart 2"
  items: CartItem[];
};
export interface CartItem extends CashierItem {
  id: string;
  name: string;
  selectedUnitId: string;
  selectedUnitName: string; // 🆕
  selectedUnitPrice: number; // 🆕
  selectedQty: number;
  action: string;
  warehousename: string;
  sellingMode: string;
  originalStockQuantity: number;
  sellingUnits: SellingUnit[];
  availableStock: Record<string, number>;
  // unitsPerPacket: number;
  // packetsPerCarton: number;
}
interface CartState {
  carts: Cart[];
  activeCartId?: string | null;
  discountType: "fixed" | "percentage";
  discountValue: number;
}

export type CartStateSnapshot = Pick<
  CartState,
  "carts" | "activeCartId" | "discountType" | "discountValue"
>;

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
    hydrateCartState: (state, action: PayloadAction<CartStateSnapshot>) => {
      state.carts = action.payload.carts || [];
      state.activeCartId = action.payload.activeCartId ?? null;
      state.discountType = action.payload.discountType || "fixed";
      state.discountValue = action.payload.discountValue || 0;
    },
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
    // addItem: (state, action: PayloadAction<CartItem>) => {
    //   const cart = state.carts.find((c) => c.id === state.activeCartId);
    //   if (!cart) return;

    //   // 1️⃣ البحث عن المنتج باستخدام المعرف والوحدة معاً
    //   // هذا يسمح بوجود نفس المنتج بوحدات مختلفة في السلة
    //   const existing = cart.items.find(
    //     (i) =>
    //       i.id === action.payload.id &&
    //       i.selectedUnitId === action.payload.selectedUnitId,
    //   );

    //   // 2️⃣ جلب المخزون المتاح لهذه الوحدة تحديداً من البيانات المرسلة
    //   // ملاحظة: نفترض أن action.payload يحتوي على availableStock المحدث
    //   const availableForThisUnit =
    //     action.payload.availableStock?.[action.payload.selectedUnitId] ?? 0;

    //   if (existing) {
    //     // 3️⃣ التحقق من عدم تجاوز المخزون عند الزيادة
    //     // الكمية الجديدة = الموجود في السلة + 1
    //     if (existing.selectedQty < availableForThisUnit) {
    //       existing.selectedQty += 1;
    //     } else {
    //       // اختياري: يمكنك إضافة تنبيه هنا إذا كنت تستخدم نظام إشعارات داخل الـ Reducer
    //       console.warn("Out of stock for this unit");
    //     }
    //   } else {
    //     // 4️⃣ إضافة المنتج كسطر جديد إذا كانت الوحدة مختلفة أو المنتج جديد
    //     // نتحقق أيضاً من توفر قطعة واحدة على الأقل
    //     if (availableForThisUnit > 0) {
    //       cart.items.push(action.payload);
    //     }
    //   }
    // },
    //     removeFromCart: (
    addItem: (state, action: PayloadAction<CartItem>) => {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (!cart) return;

      // 1️⃣ البحث عن المنتج باستخدام المعرف والوحدة معاً
      // هذا يسمح بوجود نفس المنتج بوحدات مختلفة في السلة
      const existing = cart.items.find(
        (i) =>
          i.id === action.payload.id &&
          i.selectedUnitId === action.payload.selectedUnitId,
      );

      // 2️⃣ جلب المخزون المتاح لهذه الوحدة تحديداً من البيانات المرسلة
      // ملاحظة: نفترض أن action.payload يحتوي على availableStock المحدث
      const availableForThisUnit =
        action.payload.availableStock?.[action.payload.selectedUnitId] ?? 0;

      if (existing) {
        // 3️⃣ التحقق من عدم تجاوز المخزون عند الزيادة
        // الكمية الجديدة = الموجود في السلة + 1
        if (existing.selectedQty < availableForThisUnit) {
          existing.selectedQty += 1;
        } else {
          // اختياري: يمكنك إضافة تنبيه هنا إذا كنت تستخدم نظام إشعارات داخل الـ Reducer
          console.warn("Out of stock for this unit");
        }
      } else {
        // 4️⃣ إضافة المنتج كسطر جديد إذا كانت الوحدة مختلفة أو المنتج جديد
        // نتحقق أيضاً من توفر قطعة واحدة على الأقل
        if (availableForThisUnit > 0) {
          cart.items.push(action.payload);
        }
      }
    },
    removeFromCart: (
      state,
      action: PayloadAction<{ productId: string; unitId: string }>,
    ) => {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (!cart) return;

      // الفلترة بناءً على الشرطين معاً
      // سنحتفظ بكل العناصر التي (لا تملك نفس الـ ID) أو (لا تملك نفس الـ UnitId)
      cart.items = cart.items.filter(
        (i) =>
          !(
            i.id === action.payload.productId &&
            i.selectedUnitId === action.payload.unitId
          ),
      );
    },
    // في cartSlice.ts
    updateQty(
      state,
      action: PayloadAction<{
        id: string;
        quantity: number;
        selectedUnitId: string; // نستخدم ID بدلاً من Name
        action: string;
      }>,
    ) {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (!cart) return;

      const item = cart.items.find(
        (i) =>
          i.id === action.payload.id &&
          i.selectedUnitId === action.payload.selectedUnitId,
      );

      if (item) {
        if (action.payload.action === "plus") {
          item.selectedQty += action.payload.quantity;
        } else {
          item.selectedQty = Math.max(
            1,
            item.selectedQty - action.payload.quantity,
          );
        }
      }
    },

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
        fromUnitId: string;
        toUnitId: string;
      }>,
    ) => {
      const cart = state.carts.find((c) => c.id === state.activeCartId);
      if (!cart) return;

      // البحث عن السطر المحدد باستخدام ID المنتج + ID الوحدة القديمة
      const item = cart.items.find(
        (i) =>
          i.id === action.payload.id &&
          i.selectedUnitId === action.payload.fromUnitId,
      );

      if (item) {
        const newUnit = item.sellingUnits.find(
          (u) => u.id === action.payload.toUnitId,
        );
        if (newUnit) {
          item.selectedUnitId = newUnit.id;
          item.selectedUnitName = newUnit.name;
          item.selectedUnitPrice = newUnit.price;
          item.selectedQty = 1; // تعيين الكمية لـ 1 عند تغيير نوع الوحدة
        }
      }
    },
    // changeSellingUnit: (
    //   state,
    //   action: PayloadAction<{
    //     id: string;
    //     fromUnitId: string;
    //     toUnitId: string;
    //   }>,
    // ) => {
    //   const cart = state.carts.find((c) => c.id === state.activeCartId);
    //   if (!cart) return;

    //   const item = cart.items.find((i) => i.id === action.payload.id);
    //   if (!item) return;

    //   const newUnit = item.sellingUnits.find(
    //     (u) => u.id === action.payload.toUnitId,
    //   );
    //   if (!newUnit) return;

    //   item.selectedUnitId = newUnit.id;
    //   item.selectedUnitName = newUnit.name;
    //   item.selectedUnitPrice = newUnit.price;
    //   item.selectedQty = 1; // إعادة تعيين الكمية
    // },
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
  hydrateCartState,
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
