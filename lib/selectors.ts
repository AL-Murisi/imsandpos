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
        ? item.pricePerUnit ?? 0
        : item.sellingUnit === "packet"
        ? item.pricePerPacket ?? 0
        : item.pricePerCarton ?? 0;
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
    // sum across all carts for this product
    const totalCartons = state.cart.carts.reduce((sum, cart) => {
      const item = cart.items.find(
        (i) => i.id === p.id && i.sellingUnit === "carton"
      );
      return sum + (item?.selectedQty || 0);
    }, 0);

    const totalPackets = state.cart.carts.reduce((sum, cart) => {
      const item = cart.items.find(
        (i) => i.id === p.id && i.sellingUnit === "packet"
      );
      return sum + (item?.selectedQty || 0);
    }, 0);

    const totalUnits = state.cart.carts.reduce((sum, cart) => {
      const item = cart.items.find(
        (i) => i.id === p.id && i.sellingUnit === "unit"
      );
      return sum + (item?.selectedQty || 0);
    }, 0);

    return {
      ...p,
      cartons: Math.max(0, p.availableCartons - totalCartons),
      packets: Math.max(0, p.availablePackets - totalPackets),
      units: Math.max(0, p.availableUnits - totalUnits),
    };
  });
};
