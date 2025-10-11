import { RootState } from "./store";

export const selectActiveCartItems = (state: RootState) => {
  const cart = state.cart.carts.find((c) => c.id === state.cart.activeCartId);
  return cart?.items || [];
};

export const selectCartTotals = (state: RootState) => {
  const items = selectActiveCartItems(state);
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
    state.cart.discountType === "percentage"
      ? (totalBefore * state.cart.discountValue) / 100
      : state.cart.discountValue;
  return { totalBefore, discount, totalAfter: totalBefore - discount };
};
export const selectCartItems = (state: RootState) => state.cart.carts;
// export const selectCartTotals = (state: RootState) => {
//   const totalBefore = state.cart.items.reduce((acc, item) => {
//     const price =
//       item.sellingUnit === "unit"
//         ? item.pricePerUnit ?? 0
//         : item.sellingUnit === "packet"
//         ? item.pricePerPacket ?? 0
//         : item.pricePerCarton ?? 0;
//     return acc + price * item.selectedQty;
//   }, 0);

//   const discount =
//     state.cart.discountType === "percentage"
//       ? (totalBefore * state.cart.discountValue) / 100
//       : state.cart.discountValue;
//   const totalAfter = totalBefore - discount;
//   return { totalBefore, discount, totalAfter };
// };
export const selectAvailableStock = (state: RootState) => {
  return state.products.products.map((p) => {
    const { unitsPerPacket, packetsPerCarton } = p;

    // 🔹 Step 1: Calculate total items in base units (units)
    const totalBaseUnits = state.cart.carts.reduce((sum, cart) => {
      return (
        sum +
        cart.items
          .filter((i) => i.id === p.id)
          .reduce((subSum, item) => {
            if (item.sellingUnit === "carton")
              return (
                subSum + item.selectedQty * packetsPerCarton * unitsPerPacket
              );
            if (item.sellingUnit === "packet")
              return subSum + item.selectedQty * unitsPerPacket;
            return subSum + item.selectedQty; // unit
          }, 0)
      );
    }, 0);

    // 🔹 Step 2: Convert product’s available stock to base units
    const availableBaseUnits =
      p.availableUnits +
      p.availablePackets * unitsPerPacket +
      p.availableCartons * packetsPerCarton * unitsPerPacket;

    // 🔹 Step 3: Subtract cart totals
    const remainingBaseUnits = Math.max(0, availableBaseUnits - totalBaseUnits);

    // 🔹 Step 4: Convert remaining base units back to structured quantities
    const remainingCartons = Math.floor(
      remainingBaseUnits / (packetsPerCarton * unitsPerPacket),
    );
    const remainingAfterCartons =
      remainingBaseUnits % (packetsPerCarton * unitsPerPacket);

    const remainingPackets = Math.floor(remainingAfterCartons / unitsPerPacket);
    const remainingUnits = remainingAfterCartons % unitsPerPacket;

    // ✅ Step 5: Return unified structure
    return {
      ...p,
      cartons: remainingCartons,
      packets: remainingPackets,
      units: remainingUnits,
    };
  });
};
