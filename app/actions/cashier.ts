// app/actions/cashier.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag } from "next/cache";
import { logActivity } from "./activitylogs";

type CartItem = {
  id: string;
  sku: string;
  name: string;
  selectedQty: number;
  sellingUnit: "unit" | "packet" | "carton";
  unitsPerPacket: number;
  packetsPerCarton: number;
  pricePerUnit?: number;
  pricePerPacket?: number;
  pricePerCarton?: number;
  warehouseId: string;
};

type SaleData = {
  cart: CartItem[];
  totalBeforeDiscount: number;
  totalDiscount: number;
  totalAfterDiscount: number;
  cashierId: string;
  customerId?: string;
  saleNumber: string;
  receivedAmount: number;
};

export async function processSale(data: any) {
  const {
    cart,
    totalBeforeDiscount,
    totalDiscount,
    totalAfterDiscount,
    cashierId,
    customerId,
    saleNumber,
    receivedAmount,
  } = data;

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.create({
      data: {
        saleNumber,
        customerId,
        cashierId,
        taxAmount: 0,
        saleType: "sale",
        status: "completed",
        subtotal: totalBeforeDiscount,
        discountAmount: totalDiscount,
        totalAmount: totalAfterDiscount,
        amountPaid: receivedAmount,
        amountDue: Math.max(0, totalAfterDiscount - receivedAmount),
        paymentStatus:
          receivedAmount >= totalAfterDiscount ? "paid" : "partial",
      },
    });

    for (const item of cart) {
      const quantityInUnits =
        item.sellingUnit === "unit"
          ? item.selectedQty
          : item.sellingUnit === "packet"
            ? item.selectedQty * item.unitsPerPacket
            : item.selectedQty * item.unitsPerPacket * item.packetsPerCarton;

      const inventory = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: {
            productId: item.id,
            warehouseId: item.warehouseId,
          },
        },
      });

      if (!inventory || inventory.availableQuantity < quantityInUnits) {
        throw new Error(`Insufficient stock for ${item.name}`);
      }

      const newStock = inventory.stockQuantity - quantityInUnits;
      const newAvailable = inventory.availableQuantity - quantityInUnits;

      await tx.inventory.update({
        where: {
          productId_warehouseId: {
            productId: item.id,
            warehouseId: item.warehouseId,
          },
        },
        data: {
          stockQuantity: newStock,
          availableQuantity: newAvailable,
          status:
            newAvailable <= inventory.reorderLevel
              ? "low"
              : newAvailable === 0
                ? "out_of_stock"
                : "available",
        },
      });

      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: item.id,
          quantity: item.selectedQty,
          sellingUnit: item.sellingUnit,
          unitPrice:
            item.sellingUnit === "unit"
              ? item.pricePerUnit || 0
              : item.sellingUnit === "packet"
                ? item.pricePerPacket || 0
                : item.pricePerCarton || 0,
          totalPrice:
            (item.sellingUnit === "unit"
              ? item.pricePerUnit || 0
              : item.sellingUnit === "packet"
                ? item.pricePerPacket || 0
                : item.pricePerCarton || 0) * item.selectedQty,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: item.id,
          warehouseId: item.warehouseId,
          userId: cashierId,
          movementType: "out",
          quantity: quantityInUnits,
          reason: "sale",
          quantityBefore: inventory.stockQuantity,
          quantityAfter: newStock,
          referenceType: "Sale",
          referenceId: sale.id,
        },
      });
    }

    if (receivedAmount > 0) {
      await tx.payment.create({
        data: {
          saleId: sale.id,
          cashierId,
          customerId,
          paymentMethod: "cash",
          paymentType: "sale_payment",
          amount: receivedAmount,
          status: "completed",
        },
      });
    }

    await logActivity(cashierId, "cashier", "sells a product");

    // ✅ Convert Decimal fields to string before returning
    const saleForClient = {
      ...sale,
      taxAmount: sale.taxAmount.toString(),
      subtotal: sale.subtotal.toString(),
      discountAmount: sale.discountAmount.toString(),
      totalAmount: sale.totalAmount.toString(),
      amountPaid: sale.amountPaid.toString(),
      amountDue: sale.amountDue.toString(),
    };

    return { message: "Sale processed successfully", sale: saleForClient };
  });

  // ✅ Refresh pages that rely on products
  revalidateTag("products-for-sale");
  revalidatePath("/cashiercontrol"); // replace with your cashier page path

  return result;
}
