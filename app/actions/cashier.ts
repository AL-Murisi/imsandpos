// app/actions/cashier.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { logActivity } from "./activitylogs";
import { Prisma } from "@prisma/client";

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

export async function processSale(data: any, companyId: string) {
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

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Create the main Sale record
      const sale = await tx.sale.create({
        data: {
          companyId,
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

      const saleItemCreates = [];
      const stockMovementCreates = [];

      // ✅ Helper function to convert selling unit to base units
      function convertToBaseUnits(
        qty: number,
        sellingUnit: string,
        unitsPerPacket: number,
        packetsPerCarton: number,
      ): number {
        if (sellingUnit === "unit") {
          return qty;
        } else if (sellingUnit === "packet") {
          return qty * unitsPerPacket;
        } else if (sellingUnit === "carton") {
          return qty * unitsPerPacket * packetsPerCarton;
        }
        return qty;
      }

      // 2. Process Cart Items (Must be sequential for inventory check/update)
      for (const item of cart) {
        // ✅ FIX: Properly convert to base units based on selling unit and product structure
        const quantityInUnits = convertToBaseUnits(
          item.selectedQty,
          item.sellingUnit,
          item.unitsPerPacket || 1,
          item.packetsPerCarton || 1,
        );

        // Check inventory within the transaction
        const inventory = await tx.inventory.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId: companyId,
              productId: item.id,
              warehouseId: item.warehouseId,
            },
          },
        });

        if (!inventory || inventory.availableQuantity < quantityInUnits) {
          throw new Error(
            `Insufficient stock for ${item.name}. Available: ${inventory?.availableQuantity || 0}, Requested: ${quantityInUnits}.`,
          );
        }

        const newStock = inventory.stockQuantity - quantityInUnits;
        const newAvailable = inventory.availableQuantity - quantityInUnits;

        // 3. Update Inventory
        await tx.inventory.update({
          where: {
            companyId_productId_warehouseId: {
              companyId,
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

        // ✅ FIX: Get the correct unit price based on selling unit
        let unitPrice = 0;
        if (item.sellingUnit === "unit") {
          unitPrice = item.pricePerUnit || 0;
        } else if (item.sellingUnit === "packet") {
          unitPrice = item.pricePerPacket || 0;
        } else if (item.sellingUnit === "carton") {
          unitPrice = item.pricePerCarton || 0;
        }

        const totalPrice = unitPrice * item.selectedQty;

        // 4. Create SaleItem
        saleItemCreates.push(
          tx.saleItem.create({
            data: {
              companyId,
              saleId: sale.id,
              productId: item.id,
              quantity: item.selectedQty,
              sellingUnit: item.sellingUnit,
              unitPrice: unitPrice,
              totalPrice: totalPrice,
            },
          }),
        );

        // 5. Create StockMovement
        stockMovementCreates.push(
          tx.stockMovement.create({
            data: {
              companyId,
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
          }),
        );
      }

      // 6. Execute all SaleItem and StockMovement creations in parallel
      await Promise.all([...saleItemCreates, ...stockMovementCreates]);

      // 7. Update Customer Outstanding Balance (if applicable)
      if (customerId && totalAfterDiscount > receivedAmount) {
        const amountDue = totalAfterDiscount - receivedAmount;

        await tx.customer.update({
          where: { id: customerId, companyId },
          data: {
            outstandingBalance: amountDue,
          },
        });
      }
      if (customerId && receivedAmount > totalAfterDiscount) {
        const change = receivedAmount - totalAfterDiscount;
        await tx.customer.update({
          where: { id: customerId, companyId },
          data: {
            balance: change,
          },
        });
      }

      // 8. Create Payment record (if amount received)
      if (receivedAmount > 0) {
        await tx.payment.create({
          data: {
            companyId,
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

      // 9. Log Activity
      await logActivity(
        cashierId,
        companyId,
        "cashier",
        "sells a product",
        "889",
        "user agent",
      );

      // 10. Prepare response
      const saleForClient = {
        ...sale,
        taxAmount: sale.taxAmount.toString(),
        subtotal: sale.subtotal.toString(),
        discountAmount: sale.discountAmount.toString(),
        totalAmount: sale.totalAmount.toString(),
        amountPaid: sale.amountPaid.toString(),
        amountDue: sale.amountDue.toString(),
      };
      console.log(saleForClient);
      return { message: "Sale processed successfully", sale: saleForClient };
    },
    {
      timeout: 20000,
    },
  );

  revalidatePath("/cashiercontrol");

  return result;
}
