// app/api/cashier/route.ts - Fixed with proper product updates
import { logActivity } from "@/app/actions/activitylogs";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const {
      cart,
      discountValue,
      discountType,
      totalBeforeDiscount,
      totalDiscount,
      totalAfterDiscount,
      cashierId,
      customerId,
      saleNumber,
      receivedAmount,
      change,
    } = data;

    // Start transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the sale record
      const sale = await tx.sale.create({
        data: {
          saleNumber: saleNumber,
          customerId: customerId,
          cashierId: cashierId, // Replace with actual user ID
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

      // 2. Process each cart item and collect updated inventory
      const updatedInventory = [];
      const updatedProducts = [];

      for (const item of cart) {
        // Convert selling quantity to base units (cartons)

        const quantityInCartons = convertToCartons(
          item.selectedQty,
          item.sellingUnit,
          item.unitsPerPacket,
          item.packetsPerCarton,
        );

        // Get current inventory
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId: item.id,
              warehouseId: item.warehouseId, // Replace with actual warehouse
            },
          },
          include: {
            product: true, // Include product details
          },
        });

        if (!inventory) {
          throw new Error(`Inventory not found for product ${item.name}`);
        }

        // Check if enough stock available
        if (inventory.availableQuantity < quantityInCartons) {
          throw new Error(
            `Insufficient stock for ${item.name}. Available: ${inventory.availableQuantity}, Required: ${quantityInCartons}`,
          );
        }

        // Calculate new quantities
        const newStockQuantity = inventory.stockQuantity - quantityInCartons;
        const newAvailableQuantity =
          inventory.availableQuantity - quantityInCartons;

        // Update inventory
        const updatedInv = await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId: item.id,
              warehouseId: item.warehouseId,
            },
          },
          data: {
            stockQuantity: newStockQuantity,
            availableQuantity: newAvailableQuantity,
            status:
              newAvailableQuantity <= inventory.reorderLevel
                ? "low"
                : newAvailableQuantity === 0
                  ? "out_of_stock"
                  : "available",
          },
          include: {
            product: true,
          },
        });

        updatedInventory.push(updatedInv);

        // Create updated product object for frontend
        updatedProducts.push({
          id: item.id,
          name: item.name,
          sku: item.sku,
          pricePerUnit: item.pricePerUnit,
          pricePerPacket: item.pricePerPacket,
          pricePerCarton: item.pricePerCarton,
          unitsPerPacket: item.unitsPerPacket,
          packetsPerCarton: item.packetsPerCarton,
          quantity: newAvailableQuantity, // Updated stock quantity
        });

        // Create sale item record
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId: item.id,
            quantity: item.selectedQty,
            sellingUnit: item.sellingUnit,
            unitPrice: getUnitPrice(item),
            totalPrice: getUnitPrice(item) * item.selectedQty,
          },
        });

        // Create stock movement record
        await tx.stockMovement.create({
          data: {
            productId: item.id,
            warehouseId: item.warehouseId,
            userId: cashierId, // Replace with actual user ID
            movementType: "out",
            quantity: quantityInCartons,
            reason: "sale",
            quantityBefore: inventory.stockQuantity,
            quantityAfter: newStockQuantity,
            referenceType: "Sale",
            referenceId: sale.id,
            notes: `Sale to customer - ${item.selectedQty} ${item.sellingUnit}(s)`,
          },
        });
      }

      // 3. Create payment record if cash payment
      if (receivedAmount > 0) {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            cashierId: cashierId,
            customerId: customerId,
            paymentMethod: "cash",
            paymentType: "sale_payment",
            amount: receivedAmount,
            status: "completed",
          },
        });
      }
      await logActivity(cashierId, "cashier", "sells a product");
      return {
        sale,
        updatedInventory,
        updatedProducts, // Add this for frontend updates
        message: "Sale processed successfully",
      };
    });
    revalidatePath("/api/fetch");
    return NextResponse.json(result);
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Sale processing error:", err);
    return NextResponse.json(
      { message: err.message || "Failed to process sale" },
      { status: 500 },
    );
  }
}

// Helper functions
function convertToCartons(
  quantity: number,
  sellingUnit: "unit" | "packet" | "carton",
  unitsPerPacket: number,
  packetsPerCarton: number,
): number {
  switch (sellingUnit) {
    case "unit":
      return quantity / (unitsPerPacket * packetsPerCarton);
    case "packet":
      return quantity / packetsPerCarton;
    case "carton":
      return quantity;
    default:
      throw new Error(`Invalid selling unit: ${sellingUnit}`);
  }
}

function getUnitPrice(item: any): number {
  switch (item.sellingUnit) {
    case "unit":
      return item.pricePerUnit || 0;
    case "packet":
      return item.pricePerPacket || 0;
    case "carton":
      return item.pricePerCarton || 0;
    default:
      return 0;
  }
}
