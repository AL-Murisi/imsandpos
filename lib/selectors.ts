// import { RootState } from "./store";

// export const selectActiveCartItems = (state: RootState) => {
//   const cart = state.cart.carts.find((c) => c.id === state.cart.activeCartId);
//   return cart?.items || [];
// };

// export const selectCartTotals = (state: RootState) => {
//   const items = selectActiveCartItems(state);
//   const totalBefore = items.reduce((acc, item) => {
//     const price =
//       item.sellingUnit === "unit"
//         ? (item.pricePerUnit ?? 0)
//         : item.sellingUnit === "packet"
//           ? (item.pricePerPacket ?? 0)
//           : (item.pricePerCarton ?? 0);
//     return acc + price * item.selectedQty;
//   }, 0);
//   const discount =
//     state.cart.discountType === "percentage"
//       ? (totalBefore * state.cart.discountValue) / 100
//       : state.cart.discountValue;
//   return { totalBefore, discount, totalAfter: totalBefore - discount };
// };
// export const selectCartItems = (state: RootState) => state.cart.carts;
// // export const selectCartTotals = (state: RootState) => {
// //   const totalBefore = state.cart.items.reduce((acc, item) => {
// //     const price =
// //       item.sellingUnit === "unit"
// //         ? item.pricePerUnit ?? 0
// //         : item.sellingUnit === "packet"
// //         ? item.pricePerPacket ?? 0
// //         : item.pricePerCarton ?? 0;
// //     return acc + price * item.selectedQty;
// //   }, 0);

// //   const discount =
// //     state.cart.discountType === "percentage"
// //       ? (totalBefore * state.cart.discountValue) / 100
// //       : state.cart.discountValue;
// //   const totalAfter = totalBefore - discount;
// //   return { totalBefore, discount, totalAfter };
// // };
// export const selectAvailableStock = (state: RootState) => {
//   return state.products.products.map((p) => {
//     const { unitsPerPacket, packetsPerCarton } = p;

//     // 🔹 Step 1: Calculate total items in base units (units)
//     const totalBaseUnits = state.cart.carts.reduce((sum, cart) => {
//       return (
//         sum +
//         cart.items
//           .filter((i) => i.id === p.id)
//           .reduce((subSum, item) => {
//             if (item.sellingUnit === "carton")
//               return (
//                 subSum + item.selectedQty * packetsPerCarton * unitsPerPacket
//               );
//             if (item.sellingUnit === "packet")
//               return subSum + item.selectedQty * unitsPerPacket;
//             return subSum + item.selectedQty; // unit
//           }, 0)
//       );
//     }, 0);

//     // 🔹 Step 2: Convert product’s available stock to base units
//     const availableBaseUnits =
//       p.availableUnits +
//       p.availablePackets * unitsPerPacket +
//       p.availableCartons * packetsPerCarton * unitsPerPacket;

//     // 🔹 Step 3: Subtract cart totals
//     const remainingBaseUnits = Math.max(0, availableBaseUnits - totalBaseUnits);

//     // 🔹 Step 4: Convert remaining base units back to structured quantities
//     const remainingCartons = Math.floor(
//       remainingBaseUnits / (packetsPerCarton * unitsPerPacket),
//     );
//     const remainingAfterCartons =
//       remainingBaseUnits % (packetsPerCarton * unitsPerPacket);

//     const remainingPackets = Math.floor(remainingAfterCartons / unitsPerPacket);
//     const remainingUnits = remainingAfterCartons % unitsPerPacket;

//     // ✅ Step 5: Return unified structure
//     return {
//       ...p,
//       cartons: remainingCartons,
//       packets: remainingPackets,
//       units: remainingUnits,
//     };
//   });
// };
import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "./store";

// ✅ Basic selectors
const selectCarts = (state: RootState) => state.cart.carts;
const selectActiveCartId = (state: RootState) => state.cart.activeCartId;
const selectProducts = (state: RootState) => state.products.products;
const selectDiscountType = (state: RootState) => state.cart.discountType;
const selectDiscountValue = (state: RootState) => state.cart.discountValue;

// 🚀 Memoized selector for active cart items
export const selectActiveCartItems = createSelector(
  [selectCarts, selectActiveCartId],
  (carts, activeCartId) => {
    const cart = carts.find((c) => c.id === activeCartId);
    return cart?.items || [];
  },
);

// 🚀 Memoized selector for cart totals
export const selectCartTotals = createSelector(
  [selectActiveCartItems, selectDiscountType, selectDiscountValue],
  (items, discountType, discountValue) => {
    const totalBefore = items.reduce((acc, item) => {
      const price =
        item.sellingUnit === "unit"
          ? (item.pricePerUnit ?? 0)
          : item.sellingUnit === "packet"
            ? (item.pricePerPacket ?? 0)
            : (item.pricePerCarton ?? 0);
      return acc + price * item.selectedQty;
    }, 0);

    const discount =
      discountType === "percentage"
        ? (totalBefore * discountValue) / 100
        : discountValue;

    return {
      totalBefore,
      discount,
      totalAfter: totalBefore - discount,
    };
  },
);

// 🚀 Memoized selector for available stock with cart items deducted
// export const selectAvailableStock = createSelector(
//   [selectProducts, selectCarts],
//   (products, carts) => {
//     return products.map((p) => {
//       const { unitsPerPacket, packetsPerCarton } = p;

//       // Calculate total items in cart for this product (in base units)
//       const totalBaseUnits = carts.reduce((sum, cart) => {
//         return (
//           sum +
//           cart.items
//             .filter((i) => i.id === p.id)
//             .reduce((subSum, item) => {
//               if (item.sellingUnit === "carton")
//                 return (
//                   subSum + item.selectedQty * packetsPerCarton * unitsPerPacket
//                 );
//               if (item.sellingUnit === "packet")
//                 return subSum + item.selectedQty * unitsPerPacket;
//               return subSum + item.selectedQty; // unit
//             }, 0)
//         );
//       }, 0);

//       // Convert product's available stock to base units
//       const availableBaseUnits =
//         p.availableUnits +
//         p.availablePackets * unitsPerPacket +
//         p.availableCartons * packetsPerCarton * unitsPerPacket;

//       // Subtract cart totals
//       const remainingBaseUnits = Math.max(
//         0,
//         availableBaseUnits - totalBaseUnits,
//       );

//       // Convert back to structured quantities
//       const remainingCartons = Math.floor(
//         remainingBaseUnits / (packetsPerCarton * unitsPerPacket),
//       );
//       const remainingAfterCartons =
//         remainingBaseUnits % (packetsPerCarton * unitsPerPacket);

//       const remainingPackets = Math.floor(
//         remainingAfterCartons / unitsPerPacket,
//       );
//       const remainingUnits = remainingAfterCartons % unitsPerPacket;

//       return {
//         ...p,
//         availableCartons: remainingCartons,
//         availablePackets: remainingPackets,
//         availableUnits: remainingUnits,
//       };
//     });
//   },
// );

// ✅ Selector to dynamically compute remaining stock
// export const selectAvailableStock = createSelector(
//   [selectProducts, selectCarts],
//   (products, carts) => {
//     function convertToBaseUnits(
//       qty: number,
//       sellingUnit: string,
//       unitsPerPacket: number,
//       packetsPerCarton: number,
//     ): number {
//       if (sellingUnit === "carton")
//         return qty * unitsPerPacket * packetsPerCarton;
//       if (sellingUnit === "packet") return qty * unitsPerPacket;
//       if (sellingUnit === "unit") return qty;
//       return qty;
//     }

//     function convertFromBaseUnit(product: any, availableUnits: number) {
//       const unitsPerPacket = product.unitsPerPacket || 1;
//       const packetsPerCarton = product.packetsPerCarton || 1;

//       const availablePackets = Math.floor(availableUnits / unitsPerPacket);
//       const availableCartons = Math.floor(availablePackets / packetsPerCarton);

//       return { availablePackets, availableCartons };
//     }

//     return products.map((p) => {
//       const { unitsPerPacket, packetsPerCarton } = p;

//       const totalBaseUnits = carts.reduce((sum, cart) => {
//         return (
//           sum +
//           cart.items
//             .filter((i) => i.id === p.id)
//             .reduce(
//               (subSum, item) =>
//                 subSum +
//                 convertToBaseUnits(
//                   item.selectedQty,
//                   item.sellingUnit,
//                   unitsPerPacket,
//                   packetsPerCarton,
//                 ),
//               0,
//             )
//         );
//       }, 0);

//       const { availablePackets, availableCartons } = convertFromBaseUnit(
//         p,
//         totalBaseUnits,
//       );

//       return {
//         ...p,
//         availableCartons,
//         availablePackets,
//         availableUnits: totalBaseUnits,
//       };
//     });
//   },
// );
export const selectAvailableStock = createSelector(
  [selectProducts, selectCarts],
  (products, carts) => {
    return products.map((p) => {
      // 🔸 Calculate total quantity in cart for this product
      const totalInCart = carts.reduce((sum, cart) => {
        return (
          sum +
          cart.items
            .filter((i) => i.id === p.id)
            .reduce((subSum, item) => subSum + item.selectedQty, 0)
        );
      }, 0);

      // 🔸 Subtract from already available quantities
      const availableUnits = Math.max(p.availableUnits - totalInCart, 0);
      const availablePackets = Math.max(p.availablePackets - totalInCart, 0); // optionally adjust
      const availableCartons = Math.max(p.availableCartons - totalInCart, 0); // optionally adjust

      return {
        ...p,
        availableUnits,
        availablePackets,
        availableCartons,
      };
    });
  },
);

// export const selectAvailableStock = createSelector(
//   [selectProducts, selectCarts],
//   (products, carts) => {
//     return products.map((p) => {
//       const { unitsPerPacket, packetsPerCarton } = p;

//       // Calculate total items in cart for this product (in base units)
//       const totalBaseUnits = carts.reduce((sum, cart) => {
//         return (
//           sum +
//           cart.items
//             .filter((i) => i.id === p.id)
//             .reduce((subSum, item) => {
//               if (item.sellingUnit === "carton")
//                 return (
//                   subSum + item.selectedQty * packetsPerCarton * unitsPerPacket
//                 );
//               if (item.sellingUnit === "packet")
//                 return subSum + item.selectedQty * unitsPerPacket;
//               return subSum + item.selectedQty; // unit
//             }, 0)
//         );
//       }, 0);

//       // Convert product's available stock to base units
//       const availableBaseUnits =
//         p.availableUnits +
//         p.availablePackets * unitsPerPacket +
//         p.availableCartons * packetsPerCarton * unitsPerPacket;

//       // Subtract cart totals
//       const remainingBaseUnits = Math.max(
//         0,
//         availableBaseUnits - totalBaseUnits,
//       );

//       // Convert back to structured quantities
//       const remainingCartons = Math.floor(
//         remainingBaseUnits / (packetsPerCarton * unitsPerPacket),
//       );
//       const remainingAfterCartons =
//         remainingBaseUnits % (packetsPerCarton * unitsPerPacket);

//       const remainingPackets = Math.floor(
//         remainingAfterCartons / unitsPerPacket,
//       );
//       const remainingUnits = remainingAfterCartons % unitsPerPacket;

//       return {
//         ...p,
//         availableCartons: remainingCartons,
//         availablePackets: remainingPackets,
//         availableUnits: remainingUnits,
//       };
//     });
//   },
// );
export const selectCartItems = (state: RootState) => state.cart.carts;
