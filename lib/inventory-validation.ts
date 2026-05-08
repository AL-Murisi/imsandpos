// lib/utils/inventory-validation.ts

import { SellingUnit } from "./zod/product";

export const checkPriceMismatch = (
  currentUnitCost: number,
  sellingUnits: SellingUnit[],
  selectedUnitId: string,
) => {
  // 1. Find the base unit price from the product's official unit list
  const baseUnit = sellingUnits.find((u) => u.isBase);
  const selectedUnit = sellingUnits.find((u) => u.id === selectedUnitId);

  if (!baseUnit || !selectedUnit) return { mismatch: false };

  // 2. Calculate what the cost "should" be based on the sellingUnits JSON
  // If selected unit is base, expected is base price.
  // If it's a larger unit, it's (base price * unitsPerParent)
  const expectedCost = selectedUnit.isBase
    ? baseUnit.price
    : baseUnit.price * selectedUnit.unitsPerParent;

  const isMismatch = Number(currentUnitCost) !== Number(expectedCost);

  return {
    mismatch: isMismatch,
    expectedCost,
    basePrice: baseUnit.price,
  };
};
