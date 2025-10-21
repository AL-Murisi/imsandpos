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

      // ✅ Helper function to convert selling unit to base units
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

      // 🚀 OPTIMIZATION 1: Batch fetch all inventories at once
      const productIds = cart.map((item: any) => item.id);
      const warehouseIds = cart.map((item: any) => item.warehouseId);

      const inventories = await tx.inventory.findMany({
        where: {
          companyId,
          productId: { in: productIds },
          warehouseId: { in: warehouseIds },
        },
      });

      // Create a map for quick lookup
      const inventoryMap = new Map(
        inventories.map((inv) => [`${inv.productId}-${inv.warehouseId}`, inv]),
      );

      // 🚀 OPTIMIZATION 2: Prepare all operations in parallel arrays
      const saleItemsData = [];
      const stockMovementsData = [];
      const inventoryUpdates = [];

      // Process all items and prepare batch operations
      for (const item of cart) {
        const quantityInUnits = convertToBaseUnits(
          item.selectedQty,
          item.sellingUnit,
          item.unitsPerPacket || 1,
          item.packetsPerCarton || 1,
        );

        const inventoryKey = `${item.id}-${item.warehouseId}`;
        const inventory = inventoryMap.get(inventoryKey);

        if (!inventory || inventory.availableQuantity < quantityInUnits) {
          throw new Error(
            `Insufficient stock for ${item.name}. Available: ${inventory?.availableQuantity || 0}, Requested: ${quantityInUnits}.`,
          );
        }

        const newStock = inventory.stockQuantity - quantityInUnits;
        const newAvailable = inventory.availableQuantity - quantityInUnits;

        // Get the correct unit price
        let unitPrice = 0;
        if (item.sellingUnit === "unit") {
          unitPrice = item.pricePerUnit || 0;
        } else if (item.sellingUnit === "packet") {
          unitPrice = item.pricePerPacket || 0;
        } else if (item.sellingUnit === "carton") {
          unitPrice = item.pricePerCarton || 0;
        }

        const totalPrice = unitPrice * item.selectedQty;

        // Prepare data for batch operations
        saleItemsData.push({
          companyId,
          saleId: sale.id,
          productId: item.id,
          quantity: item.selectedQty,
          sellingUnit: item.sellingUnit,
          unitPrice: unitPrice,
          totalPrice: totalPrice,
        });

        stockMovementsData.push({
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
        });

        inventoryUpdates.push({
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
      }

      // 🚀 OPTIMIZATION 3: Execute all operations in parallel
      await Promise.all([
        // Batch create sale items
        tx.saleItem.createMany({ data: saleItemsData }),

        // Batch create stock movements
        tx.stockMovement.createMany({ data: stockMovementsData }),

        // Batch update inventories
        ...inventoryUpdates.map((update) => tx.inventory.update(update)),
      ]);

      // 7. Update Customer Balance (if applicable)
      const customerUpdates = [];

      if (customerId && totalAfterDiscount > receivedAmount) {
        const amountDue = totalAfterDiscount - receivedAmount;
        customerUpdates.push(
          tx.customer.update({
            where: { id: customerId, companyId },
            data: { outstandingBalance: amountDue },
          }),
        );
      }

      if (customerId && receivedAmount > totalAfterDiscount) {
        const change = receivedAmount - totalAfterDiscount;
        customerUpdates.push(
          tx.customer.update({
            where: { id: customerId, companyId },
            data: { balance: change },
          }),
        );
      }

      // 8. Create Payment record (if amount received)
      if (receivedAmount > 0) {
        customerUpdates.push(
          tx.payment.create({
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
          }),
        );
      }

      // Execute customer updates and payment in parallel
      if (customerUpdates.length > 0) {
        await Promise.all(customerUpdates);
      }

      // 9. Log Activity (don't await - fire and forget for speed)
      logActivity(
        cashierId,
        companyId,
        "cashier",
        "sells a product",
        "889",
        "user agent",
      ).catch(console.error); // Handle errors silently

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

      return { message: "Sale processed successfully", sale: saleForClient };
    },
    {
      timeout: 20000,
      maxWait: 5000, // Add maxWait to prevent long queue times
    },
  );

  revalidatePath("/cashiercontrol");

  return result;
}
// export async function processSale(data: any, companyId: string) {
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

//   const result = await prisma.$transaction(
//     async (tx) => {
//       // 1. Create the main Sale record
//       const sale = await tx.sale.create({
//         data: {
//           companyId,
//           saleNumber,
//           customerId,
//           cashierId,
//           taxAmount: 0,
//           saleType: "sale",
//           status: "completed",
//           subtotal: totalBeforeDiscount,
//           discountAmount: totalDiscount,
//           totalAmount: totalAfterDiscount,
//           amountPaid: receivedAmount,
//           amountDue: Math.max(0, totalAfterDiscount - receivedAmount),
//           paymentStatus:
//             receivedAmount >= totalAfterDiscount ? "paid" : "partial",
//         },
//       });

//       const saleItemCreates = [];
//       const stockMovementCreates = [];

//       // ✅ Helper function to convert selling unit to base units
//       function convertToBaseUnits(
//         qty: number,
//         sellingUnit: string,
//         unitsPerPacket: number,
//         packetsPerCarton: number,
//       ): number {
//         if (sellingUnit === "unit") {
//           return qty;
//         } else if (sellingUnit === "packet") {
//           return qty * unitsPerPacket;
//         } else if (sellingUnit === "carton") {
//           return qty * unitsPerPacket * packetsPerCarton;
//         }
//         return qty;
//       }

//       // 2. Process Cart Items (Must be sequential for inventory check/update)
//       for (const item of cart) {
//         // ✅ FIX: Properly convert to base units based on selling unit and product structure

//         const quantityInUnits = convertToBaseUnits(
//           item.selectedQty,
//           item.sellingUnit,
//           item.unitsPerPacket || 1,
//           item.packetsPerCarton || 1,
//         );

//         const inventory = await tx.inventory.findUnique({
//           where: {
//             companyId_productId_warehouseId: {
//               companyId: companyId,
//               productId: item.id,
//               warehouseId: item.warehouseId,
//             },
//           },
//         });

//         if (!inventory || inventory.availableQuantity < quantityInUnits) {
//           throw new Error(
//             `Insufficient stock for ${item.name}. Available: ${inventory?.availableQuantity || 0}, Requested: ${quantityInUnits}.`,
//           );
//         }

//         const newStock = inventory.stockQuantity - quantityInUnits;
//         const newAvailable = inventory.availableQuantity - quantityInUnits;

//         // 3. Update Inventory
//         await tx.inventory.update({
//           where: {
//             companyId_productId_warehouseId: {
//               companyId,
//               productId: item.id,
//               warehouseId: item.warehouseId,
//             },
//           },
//           data: {
//             stockQuantity: newStock,
//             availableQuantity: newAvailable,
//             status:
//               newAvailable <= inventory.reorderLevel
//                 ? "low"
//                 : newAvailable === 0
//                   ? "out_of_stock"
//                   : "available",
//           },
//         });

//         // ✅ FIX: Get the correct unit price based on selling unit
//         let unitPrice = 0;
//         if (item.sellingUnit === "unit") {
//           unitPrice = item.pricePerUnit || 0;
//         } else if (item.sellingUnit === "packet") {
//           unitPrice = item.pricePerPacket || 0;
//         } else if (item.sellingUnit === "carton") {
//           unitPrice = item.pricePerCarton || 0;
//         }

//         const totalPrice = unitPrice * item.selectedQty;

//         // 4. Create SaleItem
//         saleItemCreates.push(
//           tx.saleItem.create({
//             data: {
//               companyId,
//               saleId: sale.id,
//               productId: item.id,
//               quantity: item.selectedQty,
//               sellingUnit: item.sellingUnit,
//               unitPrice: unitPrice,
//               totalPrice: totalPrice,
//             },
//           }),
//         );

//         // 5. Create StockMovement
//         stockMovementCreates.push(
//           tx.stockMovement.create({
//             data: {
//               companyId,
//               productId: item.id,
//               warehouseId: item.warehouseId,
//               userId: cashierId,
//               movementType: "out",
//               quantity: quantityInUnits,
//               reason: "sale",
//               quantityBefore: inventory.stockQuantity,
//               quantityAfter: newStock,
//               referenceType: "Sale",
//               referenceId: sale.id,
//             },
//           }),
//         );
//       }

//       // 6. Execute all SaleItem and StockMovement creations in parallel
//       await Promise.all([...saleItemCreates, ...stockMovementCreates]);

//       // 7. Update Customer Outstanding Balance (if applicable)
//       if (customerId && totalAfterDiscount > receivedAmount) {
//         const amountDue = totalAfterDiscount - receivedAmount;

//         await tx.customer.update({
//           where: { id: customerId, companyId },
//           data: {
//             outstandingBalance: amountDue,
//           },
//         });
//       }
//       if (customerId && receivedAmount > totalAfterDiscount) {
//         const change = receivedAmount - totalAfterDiscount;
//         await tx.customer.update({
//           where: { id: customerId, companyId },
//           data: {
//             balance: change,
//           },
//         });
//       }

//       // 8. Create Payment record (if amount received)
//       if (receivedAmount > 0) {
//         await tx.payment.create({
//           data: {
//             companyId,
//             saleId: sale.id,
//             cashierId,
//             customerId,
//             paymentMethod: "cash",
//             paymentType: "sale_payment",
//             amount: receivedAmount,
//             status: "completed",
//           },
//         });
//       }

//       // 9. Log Activity
//       await logActivity(
//         cashierId,
//         companyId,
//         "cashier",
//         "sells a product",
//         "889",
//         "user agent",
//       );

//       // 10. Prepare response
//       const saleForClient = {
//         ...sale,
//         taxAmount: sale.taxAmount.toString(),
//         subtotal: sale.subtotal.toString(),
//         discountAmount: sale.discountAmount.toString(),
//         totalAmount: sale.totalAmount.toString(),
//         amountPaid: sale.amountPaid.toString(),
//         amountDue: sale.amountDue.toString(),
//       };

//       return { message: "Sale processed successfully", sale: saleForClient };
//     },
//     {
//       timeout: 20000,
//     },
//   );

//   revalidatePath("/cashiercontrol");

//   return result;
// }
// Assuming 'prisma' and 'logActivity' are defined/imported globally
// and that 'revalidatePath' is from 'next/cache' or similar.

// export async function processSale(data: any, companyId: string) {
//   const {
//     cart, // CartItem[]
//     totalBeforeDiscount,
//     totalDiscount,
//     totalAfterDiscount,
//     cashierId,
//     customerId,
//     saleNumber,
//     receivedAmount,
//   } = data;

//   // --- 1. Pre-validation and Batch Preparation ---

//   // Helper to convert selling unit quantity to base units (as before)
//   function convertToBaseUnits(
//     qty: number,
//     sellingUnit: string,
//     unitsPerPacket: number,
//     packetsPerCarton: number,
//   ): number {
//     if (sellingUnit === "unit") return qty;
//     if (sellingUnit === "packet") return qty * (unitsPerPacket || 1);
//     if (sellingUnit === "carton")
//       return qty * (unitsPerPacket || 1) * (packetsPerCarton || 1);
//     return qty;
//   }

//   // Helper to get the correct unit price based on selling unit (as before)
//   function getItemPrice(item: any): number {
//     if (item.sellingUnit === "unit") return item.pricePerUnit || 0;
//     if (item.sellingUnit === "packet") return item.pricePerPacket || 0;
//     if (item.sellingUnit === "carton") return item.pricePerCarton || 0;
//     return 0;
//   }

//   // Calculate quantities and prepare payloads outside of the transaction.
//   const itemPayloads = [];
//   const requiredStockUpdates = []; // To store data for concurrent inventory updates

//   for (const item of cart) {
//     const quantityInUnits = convertToBaseUnits(
//       item.selectedQty,
//       item.sellingUnit,
//       item.unitsPerPacket,
//       item.packetsPerCarton,
//     );

//     // Check if item has enough inventory data (preliminary check)
//     if (!item.warehouseId || !item.id) {
//       throw new Error("Cart item is missing required IDs.");
//     }

//     // 💡 OPTIMIZATION: Prepare Inventory updates as an object array for later batch processing
//     // NOTE: The actual atomic inventory check/update must still happen inside the transaction.
//     // We store the *required* base unit quantity here.
//     requiredStockUpdates.push({
//       productId: item.id,
//       warehouseId: item.warehouseId,
//       quantityInUnits,
//     });

//     const unitPrice = getItemPrice(item);
//     const totalPrice = unitPrice * item.selectedQty;

//     // 💡 OPTIMIZATION: Prepare SaleItem payload for batch insert (createMany)
//     itemPayloads.push({
//       companyId,
//       productId: item.id,
//       quantity: item.selectedQty,
//       sellingUnit: item.sellingUnit,
//       unitPrice: unitPrice,
//       totalPrice: totalPrice,
//       // saleId will be added after the Sale record is created inside the transaction
//     });
//   }

//   // --- 2. Prisma Transaction (Atomic Operations) ---

//   const result = await prisma.$transaction(
//     async (tx) => {
//       // 2.1. Create the main Sale record
//       const sale = await tx.sale.create({
//         data: {
//           companyId,
//           saleNumber,
//           customerId,
//           cashierId,
//           taxAmount: 0,
//           saleType: "sale",
//           status: "completed",
//           subtotal: totalBeforeDiscount,
//           discountAmount: totalDiscount,
//           totalAmount: totalAfterDiscount,
//           amountPaid: receivedAmount,
//           amountDue: Math.max(0, totalAfterDiscount - receivedAmount),
//           paymentStatus:
//             receivedAmount >= totalAfterDiscount ? "paid" : "partial",
//         },
//       });

//       // 2.2. Batch create SaleItems
//       const saleItemCreates = itemPayloads.map((payload) => ({
//         ...payload,
//         saleId: sale.id, // Add the generated sale ID
//       }));
//       await tx.saleItem.createMany({ data: saleItemCreates });

//       // 2.3. Process Inventory and Stock Movements (Must be sequential if using 'findUnique' + 'update')
//       const stockMovementCreates = [];
//       const inventoryUpdates = [];

//       for (const update of requiredStockUpdates) {
//         const { productId, warehouseId, quantityInUnits } = update;

//         // Must fetch and validate stock sequentially inside the transaction for safety
//         const inventory = await tx.inventory.findUnique({
//           where: {
//             companyId_productId_warehouseId: {
//               companyId,
//               productId,
//               warehouseId,
//             },
//           },
//         });

//         if (!inventory || inventory.availableQuantity < quantityInUnits) {
//           throw new Error(
//             `Insufficient stock for product ${productId}. Available: ${inventory?.availableQuantity || 0}, Requested: ${quantityInUnits}.`,
//           );
//         }

//         const newAvailable = inventory.availableQuantity - quantityInUnits;

//         // Prepare the Inventory update (using decrement)
//         inventoryUpdates.push(
//           tx.inventory.update({
//             where: {
//               companyId_productId_warehouseId: {
//                 companyId,
//                 productId,
//                 warehouseId,
//               },
//             },
//             data: {
//               stockQuantity: { decrement: quantityInUnits },
//               availableQuantity: { decrement: quantityInUnits },
//               status:
//                 newAvailable <= inventory.reorderLevel
//                   ? "low"
//                   : newAvailable === 0
//                     ? "out_of_stock"
//                     : "available",
//             },
//           }),
//         );

//         // Prepare the StockMovement record
//         stockMovementCreates.push(
//           tx.stockMovement.create({
//             data: {
//               companyId,
//               productId,
//               warehouseId,
//               userId: cashierId,
//               movementType: "out",
//               quantity: quantityInUnits,
//               reason: "sale",
//               quantityBefore: inventory.stockQuantity,
//               quantityAfter: inventory.stockQuantity - quantityInUnits, // Calculate expected new stock
//               referenceType: "Sale",
//               referenceId: sale.id,
//             },
//           }),
//         );
//       }

//       // 2.4. Execute all Inventory updates and Stock Movements in parallel
//       await Promise.all([...inventoryUpdates, ...stockMovementCreates]);

//       // 2.5. Update Customer Outstanding Balance/Credit
//       if (customerId) {
//         const amountDue = Math.max(0, totalAfterDiscount - receivedAmount);
//         const change = Math.max(0, receivedAmount - totalAfterDiscount);

//         // 💡 FIX: Use Prisma 'increment' for atomic balance updates.
//         if (amountDue > 0) {
//           // Add new debt to outstandingBalance
//           await tx.customer.update({
//             where: { id: customerId, companyId },
//             data: {
//               outstandingBalance: { increment: amountDue },
//             },
//           });
//         } else if (change > 0) {
//           // Add change to customer credit/balance
//           await tx.customer.update({
//             where: { id: customerId, companyId },
//             data: {
//               balance: { increment: change },
//             },
//           });
//         }
//       }

//       // 2.6. Create Payment record
//       if (receivedAmount > 0) {
//         await tx.payment.create({
//           data: {
//             companyId,
//             saleId: sale.id,
//             cashierId,
//             customerId,
//             paymentMethod: "cash",
//             paymentType: "sale_payment",
//             amount: receivedAmount,
//             status: "completed",
//           },
//         });
//       }

//       // 2.7. Log Activity
//       await logActivity(
//         cashierId,
//         companyId,
//         "cashier",
//         "sells a product",
//         "889", // Assuming a fixed log reference ID
//         "user agent", // Assuming a fixed user agent
//       );

//       // 2.8. Prepare response (Keep as is)
//       const saleForClient = {
//         ...sale,
//         taxAmount: sale.taxAmount.toString(),
//         subtotal: sale.subtotal.toString(),
//         discountAmount: sale.discountAmount.toString(),
//         totalAmount: sale.totalAmount.toString(),
//         amountPaid: sale.amountPaid.toString(),
//         amountDue: sale.amountDue.toString(),
//       };

//       return { message: "Sale processed successfully", sale: saleForClient };
//     },
//     {
//       timeout: 20000,
//     },
//   );

//   revalidatePath("/cashiercontrol");

//   return result;
// }
export async function getAllActiveProductsForSale(
  where: Prisma.ProductWhereInput,
  companyId: string,
  searchQuery?: string,
) {
  const combinedWhere: Prisma.ProductWhereInput = {
    ...where,
    companyId,
    isActive: true,
    inventory: {
      some: { availableQuantity: { gt: 0 } },
    },
  };

  if (searchQuery) {
    combinedWhere.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { sku: { contains: searchQuery, mode: "insensitive" } },
      { barcode: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  const [activeProducts, warehouses] = await Promise.all([
    prisma.product.findMany({
      where: combinedWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        sku: true,
        pricePerUnit: true,
        pricePerPacket: true,
        pricePerCarton: true,
        packetsPerCarton: true,
        unitsPerPacket: true,
        warehouseId: true,
        inventory: { select: { availableQuantity: true } },
      },
      take: 100,
    }),
    prisma.warehouse.findMany({ select: { id: true, name: true } }),
  ]);

  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

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

  // ✅ Determine product selling mode
  function getSellingMode(product: any) {
    const hasUnit = product.pricePerUnit && product.pricePerUnit > 0;
    const hasPacket = product.pricePerPacket && product.pricePerPacket > 0;
    const hasCarton = product.pricePerCarton && product.pricePerCarton > 0;

    // full: unit + packet + carton
    if (hasUnit && hasPacket && hasCarton) return "full";
    // cartonUnit: unit + carton (no packet)
    if (hasUnit && !hasPacket && hasCarton) return "cartonUnit";
    // cartonOnly: carton only
    if (!hasUnit && !hasPacket && hasCarton) return "cartonOnly";
    // fallback
    return "full";
  }

  return activeProducts.map((product) => {
    const availableUnits = product.inventory[0]?.availableQuantity ?? 0;
    const { availablePackets, availableCartons } = convertFromBaseUnit(
      product,
      availableUnits,
    );

    const sellingMode = getSellingMode(product);

    // ✅ Only return quantities that are actually sold
    let finalAvailableUnits = 0;
    let finalAvailablePackets = 0;
    let finalAvailableCartons = 0;

    if (sellingMode === "full") {
      // Sell all three levels
      finalAvailableUnits = availableUnits;
      finalAvailablePackets = availablePackets;
      finalAvailableCartons = availableCartons;
    } else if (sellingMode === "cartonUnit") {
      // Only sell units and cartons, hide packets
      finalAvailableUnits = availableUnits;
      finalAvailableCartons = availableCartons;
      finalAvailablePackets = 0; // ✅ Don't show packets
    } else if (sellingMode === "cartonOnly") {
      // Only sell cartons, hide units and packets
      finalAvailableCartons = availableCartons;
      finalAvailableUnits = 0; // ✅ Don't show units
      finalAvailablePackets = 0; // ✅ Don't show packets
    }

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      warehouseId: product.warehouseId,
      warehousename: warehouseMap.get(product.warehouseId) ?? "",
      pricePerUnit: Number(product.pricePerUnit) || 0,
      pricePerPacket: Number(product.pricePerPacket) || 0,
      pricePerCarton: Number(product.pricePerCarton) || 0,
      unitsPerPacket: product.unitsPerPacket,
      packetsPerCarton: product.packetsPerCarton,
      availableUnits: finalAvailableUnits,
      availablePackets: finalAvailablePackets,
      availableCartons: finalAvailableCartons,
      sellingMode, // ✅ Optional: helpful for debugging
    };
  });
}
