import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { CashierItem, ProductForSale, SellingUnit } from "@/lib/zod";

type CategoryItem = { label: string; value: string; checked: boolean };
type forsale = ProductForSale & {
  warehousename: string;

  sellingUnits: SellingUnit[];
  barcode: string;
  availableStock: Record<string, number>;
};
export interface CartItem extends CashierItem {
  id: string;
  name: string;
  selectedUnitId: string; // 🆕
  selectedUnitName: string;
  selectedUnitPrice: number;
  availableStock: Record<string, number>;
  selectedQty: number;
  warehouseName?: string;
  sellingUnit: SellingUnit[];
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
    // productsSlice.ts
    syncProductStock: (
      state,
      action: PayloadAction<{ productId: string; baseQty: number }>,
    ) => {
      const { productId, baseQty } = action.payload;
      const product = state.products.find((p) => p.id === productId);

      if (product) {
        // Recalculate availableStock for all units (Carton, Packet, etc.)
        const updatedStock: Record<string, number> = {};

        product.sellingUnits.forEach((unit) => {
          if (unit.unitsPerParent > 0) {
            updatedStock[unit.id] = Math.floor(baseQty / unit.unitsPerParent);
          } else {
            updatedStock[unit.id] = unit.isBase ? baseQty : 0;
          }
        });

        product.availableStock = updatedStock;
      }
    },
    // updateProductSock: (
    //   state,
    //   action: PayloadAction<{
    //     productId: string;
    //     sellingUnit: SellingUnit;
    //     selectedQty: number;
    //     unitsPerPacket: number;
    //     availableUnits: number;
    //     packetsPerCarton: number;
    //   }>,
    // ) => {
    //   const {
    //     productId,
    //     sellingUnit,
    //     selectedQty,
    //     unitsPerPacket,
    //     availableUnits,
    //     packetsPerCarton,
    //   } = action.payload;
    //   if (selectedQty === 0) return;

    //   const productIndex = state.products.findIndex((p) => p.id === productId);
    //   if (productIndex === -1) return;

    //   const product = { ...state.products[productIndex] };

    //   // 1️⃣ Convert selectedQty to base units

    //   // 2️⃣ Subtract from available units (base units)
    //   const newAvailableUnits = Math.max(product.availableUnits || 0);

    //   // 3️⃣ Convert back to all units
    //   const { availableCartons, availablePackets } = convertFromBaseUnit(
    //     product,
    //     availableUnits,
    //   );

    //   // 4️⃣ Update product stock
    //   product.availableUnits = newAvailableUnits;
    //   product.availablePackets = availablePackets;
    //   product.availableCartons = availableCartons;

    //   // 5️⃣ Replace product in state
    //   state.products = [
    //     ...state.products.slice(0, productIndex),
    //     product,
    //     ...state.products.slice(productIndex + 1),
    //   ];
    // },
    // updateProductStockLocal(
    //   state,
    //   action: PayloadAction<{
    //     productId: string;
    //     sellingUnit: "unit" | "packet" | "carton";
    //     quantity: number;
    //   }>,
    // ) {
    //   const product = state.products.find(
    //     (p) => p.id === action.payload.productId,
    //   );

    //   if (!product) return;

    //   const { sellingUnit, quantity } = action.payload;

    //   if (sellingUnit === "carton") {
    //     product.availableCartons -= quantity;
    //     product.availablePackets -= quantity * product.packetsPerCarton;
    //     product.availableUnits -=
    //       quantity * product.packetsPerCarton * product.unitsPerPacket;
    //   }

    //   if (sellingUnit === "packet") {
    //     product.availablePackets -= quantity;
    //     product.availableUnits -= quantity * product.unitsPerPacket;
    //   }

    //   if (sellingUnit === "unit") {
    //     product.availableUnits -= quantity;
    //   }

    //   // حماية
    //   product.availableCartons = Math.max(0, product.availableCartons);
    //   product.availablePackets = Math.max(0, product.availablePackets);
    //   product.availableUnits = Math.max(0, product.availableUnits);
    // },
    setProductsLocal: (state, action: PayloadAction<forsale[]>) => {
      state.products = action.payload;
    }, // productsSlice.ts
    updateProductStockOptimistic(
      state,
      action: PayloadAction<{
        productId: string;
        warehouseId?: string;
        sellingUnit: string; // تأكد أنك تمرر الـ ID الخاص بالوحدة هنا
        quantity: number;
        mode: "consume" | "restore";
      }>,
    ) {
      const { productId, warehouseId } = action.payload;
      const p = state.products.find(
        (x) =>
          x.id === productId &&
          (warehouseId ? x.warehouseId === warehouseId : true),
      );
      if (!p || !p.availableStock) return;

      const { sellingUnit, quantity, mode } = action.payload;

      // 🟢 تحديد العملية: خصم (-1) أو استعادة (+1)
      const sign = mode === "consume" ? -1 : 1;

      // التحقق من وجود الوحدة في سجل المخزون
      if (p.availableStock.hasOwnProperty(sellingUnit)) {
        // تحديث القيمة مباشرة
        p.availableStock[sellingUnit] += sign * quantity;
      } else {
        // إذا لم تكن الوحدة موجودة (حالة نادرة)، قم بإنشائها بالكمية المستعادة
        if (mode === "restore") {
          p.availableStock[sellingUnit] = quantity;
        }
      }
    },
  },
});

export const {
  setCategoryChecked,
  clearCategory,
  setProductsLocal,
  // updateProductSock,
  // updateProductStockLocal,
  syncProductStock,
  updateProductStockOptimistic,
} = productsSlice.actions;
export default productsSlice.reducer;
