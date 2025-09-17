export function FormatPrice(price: number): string {
  if (price >= 1000) {
    const formattedPrice = (price / 1000).toFixed(1).replace(/\.0$/, "");
    return `${formattedPrice}k`;
  }
  return price.toString();
}
export function FormatQty(price: number): string {
  if (price >= 1000) {
    const formattedPrice = (price / 1000).toFixed(1).replace(/\.0$/, "");
    return `${formattedPrice}k`;
  }
  return price.toString();
}
