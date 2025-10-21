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
export const selectAvailableStock = createSelector(
  [selectProducts, selectCarts],
  (products, carts) => {
    // 🔹 Convert to base units
    function convertToBaseUnits(
      qty: number,
      sellingUnit: string,
      unitsPerPacket: number,
      packetsPerCarton: number,
    ): number {
      if (sellingUnit === "unit") return qty;
      if (sellingUnit === "packet") return qty * unitsPerPacket;
      if (sellingUnit === "carton")
        return qty * unitsPerPacket * packetsPerCarton;
      return qty;
    }

    return products.map((p) => {
      const { unitsPerPacket, packetsPerCarton } = p;

      // 🔸 Total base units already added to cart for this product
      const totalBaseUnits = carts.reduce((sum, cart) => {
        return (
          sum +
          cart.items
            .filter((i) => i.id === p.id)
            .reduce(
              (subSum, item) =>
                subSum +
                convertToBaseUnits(
                  item.selectedQty,
                  item.sellingUnit,
                  unitsPerPacket,
                  packetsPerCarton,
                ),
              0,
            )
        );
      }, 0);

      // 🔸 Convert product’s full stock to base units
      const availableBaseUnits =
        convertToBaseUnits(
          p.availableUnits,
          "unit",
          unitsPerPacket,
          packetsPerCarton,
        ) +
        convertToBaseUnits(
          p.availablePackets,
          "packet",
          unitsPerPacket,
          packetsPerCarton,
        ) +
        convertToBaseUnits(
          p.availableCartons,
          "carton",
          unitsPerPacket,
          packetsPerCarton,
        );

      // 🔸 Remaining after cart usage
      const remainingBaseUnits = Math.max(
        0,
        availableBaseUnits - totalBaseUnits,
      );

      function convertFromBaseUnit(product: any, availableUnits: number) {
        const unitsPerPacket = product.unitsPerPacket || 1;
        const packetsPerCarton = product.packetsPerCarton || 1;

        const availablePackets = Number(
          (availableUnits / unitsPerPacket).toFixed(2),
        );
        const availableCartons = Number(
          (availablePackets / packetsPerCarton).toFixed(2),
        );

        return { availablePackets, availableCartons };
      }
      // 🔸 Convert back from base units to structured quantities
      const remainingCartons = Math.floor(
        remainingBaseUnits / (packetsPerCarton * unitsPerPacket),
      );
      const remainingAfterCartons =
        remainingBaseUnits % (packetsPerCarton * unitsPerPacket);

      const remainingPackets = Math.floor(
        remainingAfterCartons / unitsPerPacket,
      );
      const remainingUnits = remainingAfterCartons % unitsPerPacket;

      // 🔹 Return updated stock per unit type
      return {
        ...p,
        availableCartons: remainingCartons,
        availablePackets: remainingPackets,
        availableUnits: remainingUnits,
        // Optional: mark which ones are sold out for easy UI disabling
        isCartonAvailable: remainingCartons > 0,
        isPacketAvailable: remainingPackets > 0,
        isUnitAvailable: remainingUnits > 0,
      };
    });
  },
);

export const selectCartItems = (state: RootState) => state.cart.carts;
