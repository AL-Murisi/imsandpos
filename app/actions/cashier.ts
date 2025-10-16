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

  // 💡 FIX 1: Increase the transaction timeout to 20 seconds (20000ms).
  // This directly addresses the P2028 error for long-running loops.
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

      // Arrays to collect SaleItem and StockMovement operations for later batch execution
      const saleItemCreates = [];
      const stockMovementCreates = [];

      // 2. Process Cart Items (Must be sequential for inventory check/update)
      for (const item of cart) {
        const quantityInUnits =
          item.sellingUnit === "unit"
            ? item.selectedQty
            : item.sellingUnit === "packet"
              ? item.selectedQty * item.unitsPerPacket
              : item.selectedQty * item.unitsPerPacket * item.packetsPerCarton;

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
          // If stock is insufficient, the transaction rolls back
          throw new Error(
            `Insufficient stock for ${item.name}. Available: ${inventory?.availableQuantity || 0}, Requested: ${quantityInUnits}.`,
          );
        }

        const newStock = inventory.stockQuantity - quantityInUnits;
        const newAvailable = inventory.availableQuantity - quantityInUnits;

        // 3. Update Inventory (Must be sequential)
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

        // Calculate prices once
        const unitPrice =
          item.sellingUnit === "unit"
            ? item.pricePerUnit || 0
            : item.sellingUnit === "packet"
              ? item.pricePerPacket || 0
              : item.pricePerCarton || 0;

        const totalPrice = unitPrice * item.selectedQty;

        // 4. Collect SaleItem creation promise
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

        // 5. Collect StockMovement creation promise
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
      // This reduces the number of sequential database calls
      await Promise.all([...saleItemCreates, ...stockMovementCreates]);

      // 7. Update Customer Outstanding Balance (if applicable)
      if (customerId && totalAfterDiscount > receivedAmount) {
        const amountDue = totalAfterDiscount - receivedAmount;

        await tx.customer.update({
          // Using both id and companyId for multi-tenancy check on update
          where: { id: customerId, companyId },
          data: {
            outstandingBalance: {
              increment: amountDue, // increase debt
            },
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

      // 10. Prepare response (convert Decimals to string for Next.js API safety)
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
    },
    {
      timeout: 20000, // 💡 FIX 1: Explicitly set timeout to 20 seconds (20000ms)
    },
  );

  // Ensure these functions are imported from 'next/cache' if using Next.js App Router

  revalidatePath("/cashiercontrol");

  return result;
}

// export async function processSale(data: any) {
//   const {
//     cart,
//     totalBeforeDiscount,
//     totalDiscount,
//     totalAfterDiscount,
//     cashierId,
//     customerId,
//     saleNumber,
//     receivedAmount,
//   } = data;

//   const result = await prisma.$transaction(async (tx) => {
//     // 1️⃣ Fetch customer info (for balance check)
//     let customerBalance = 0;
//     if (customerId) {
//       const customer = await tx.customer.findUnique({
//         where: { id: customerId },
//         select: { outstandingBalance: true, balance: true }, // assume you have `balance` field for stored money
//       });
//       customerBalance = customer?.balance || 0;
//     }

//     // 2️⃣ Use customer balance first, then receivedAmount
//     let totalPaid = receivedAmount;
//     let balanceUsed = 0;

//     if (customerBalance > 0 && totalAfterDiscount > 0) {
//       const useBalance = Math.min(customerBalance, totalAfterDiscount - totalPaid);
//       totalPaid += useBalance;
//       balanceUsed = useBalance;
//     }

//     const amountDue = Math.max(0, totalAfterDiscount - totalPaid);

//     // 3️⃣ Create Sale
//     const sale = await tx.sale.create({
//       data: {
//         saleNumber,
//         customerId,
//         cashierId,
//         taxAmount: 0,
//         saleType: "sale",
//         status: "completed",
//         subtotal: totalBeforeDiscount,
//         discountAmount: totalDiscount,
//         totalAmount: totalAfterDiscount,
//         amountPaid: totalPaid,
//         amountDue,
//         paymentStatus: amountDue === 0 ? "paid" : "partial",
//       },
//     });

//     // 4️⃣ Inventory updates per item
//     for (const item of cart) {
//       const quantityInUnits =
//         item.sellingUnit === "unit"
//           ? item.selectedQty
//           : item.sellingUnit === "packet"
//             ? item.selectedQty * item.unitsPerPacket
//             : item.selectedQty * item.unitsPerPacket * item.packetsPerCarton;

//       const inventory = await tx.inventory.findUnique({
//         where: {
//           productId_warehouseId: {
//             productId: item.id,
//             warehouseId: item.warehouseId,
//           },
//         },
//       });

//       if (!inventory || inventory.availableQuantity < quantityInUnits) {
//         throw new Error(`Insufficient stock for ${item.name}`);
//       }

//       const newStock = inventory.stockQuantity - quantityInUnits;
//       const newAvailable = inventory.availableQuantity - quantityInUnits;

//       await tx.inventory.update({
//         where: {
//           productId_warehouseId: {
//             productId: item.id,
//             warehouseId: item.warehouseId,
//           },
//         },
//         data: {
//           stockQuantity: newStock,
//           availableQuantity: newAvailable,
//           status:
//             newAvailable <= inventory.reorderLevel
//               ? "low"
//               : newAvailable === 0
//                 ? "out_of_stock"
//                 : "available",
//         },
//       });

//       await tx.saleItem.create({
//         data: {
//           saleId: sale.id,
//           productId: item.id,
//           quantity: item.selectedQty,
//           sellingUnit: item.sellingUnit,
//           unitPrice:
//             item.sellingUnit === "unit"
//               ? item.pricePerUnit || 0
//               : item.sellingUnit === "packet"
//                 ? item.pricePerPacket || 0
//                 : item.pricePerCarton || 0,
//           totalPrice:
//             (item.sellingUnit === "unit"
//               ? item.pricePerUnit || 0
//               : item.sellingUnit === "packet"
//                 ? item.pricePerPacket || 0
//                 : item.pricePerCarton || 0) * item.selectedQty,
//         },
//       });

//       await tx.stockMovement.create({
//         data: {
//           productId: item.id,
//           warehouseId: item.warehouseId,
//           userId: cashierId,
//           movementType: "out",
//           quantity: quantityInUnits,
//           reason: "sale",
//           quantityBefore: inventory.stockQuantity,
//           quantityAfter: newStock,
//           referenceType: "Sale",
//           referenceId: sale.id,
//         },
//       });
//     }

//     // 5️⃣ Deduct used balance from customer
//     if (customerId && balanceUsed > 0) {
//       await tx.customer.update({
//         where: { id: customerId },
//         data: {
//           balance: { decrement: balanceUsed },
//         },
//       });
//     }

//     // 6️⃣ If still due, increase debt
//     if (customerId && amountDue > 0) {
//       await tx.customer.update({
//         where: { id: customerId },
//         data: {
//           outstandingBalance: { increment: amountDue },
//         },
//       });
//     }

//     // 7️⃣ Record payments
//     if (receivedAmount > 0) {
//       await tx.payment.create({
//         data: {
//           saleId: sale.id,
//           cashierId,
//           customerId,
//           paymentMethod: "cash",
//           paymentType: "sale_payment",
//           amount: receivedAmount,
//           status: "completed",
//         },
//       });
//     }

//     if (balanceUsed > 0) {
//       await tx.payment.create({
//         data: {
//           saleId: sale.id,
//           cashierId,
//           customerId,
//           paymentMethod: "balance",
//           paymentType: "balance_used",
//           amount: balanceUsed,
//           status: "completed",
//         },
//       });
//     }

//     await logActivity(cashierId, "cashier", "sells a product");

//     const saleForClient = {
//       ...sale,
//       taxAmount: sale.taxAmount.toString(),
//       subtotal: sale.subtotal.toString(),
//       discountAmount: sale.discountAmount.toString(),
//       totalAmount: sale.totalAmount.toString(),
//       amountPaid: sale.amountPaid.toString(),
//       amountDue: sale.amountDue.toString(),
//     };

//     return {
//       message: "Sale processed successfully",
//       sale: saleForClient,
//       usedBalance: balanceUsed,
//       remainingDue: amountDue,
//     };
//   });

//   revalidateTag("products-for-sale");
//   revalidatePath("/cashiercontrol");

//   return result;
// }
