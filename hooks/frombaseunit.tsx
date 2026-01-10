"use client";
export function toBaseQty(
  qty: number,
  sellingUnitId: string,
  sellingUnits: {
    id: string;
    unitsPerParent: number;
    isBase: boolean;
  }[],
) {
  const unit = sellingUnits.find((u) => u.id === sellingUnitId);
  if (!unit) {
    throw new Error("Selling unit not found");
  }

  return qty * unit.unitsPerParent;
}
