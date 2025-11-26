// app/actions/cashier.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { logActivity } from "./activitylogs";
import { Prisma } from "@prisma/client";
import { getActiveFiscalYears } from "./fiscalYear";

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
          sale_type: "sale",
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
          movementType: "صادر",
          quantity: quantityInUnits,
          reason: "بيع",
          quantityBefore: inventory.stockQuantity,
          quantityAfter: newStock,
          referenceType: "بيع",
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
            data: {
              outstandingBalance: { increment: amountDue },
            },
          }),
        );
      }

      if (customerId && receivedAmount > totalAfterDiscount) {
        const change = receivedAmount - totalAfterDiscount;
        customerUpdates.push(
          tx.customer.update({
            where: { id: customerId, companyId },
            data: { balance: { increment: change } },
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
              payment_type: "sale_payment",
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
        "أمين الصندوق", // cashier
        "قام ببيع منتج", // sells a product
        "889", // (keep as is, transaction or code)
        "وكيل المستخدم",
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
  if (result.sale) {
    try {
      await createSaleJournalEntries({
        companyId,
        sale: result.sale,
        customerId: customerId,
        saleItems: cart,
        cashierId,
      });

      console.log(`Journal entry created for saleId=${result.sale.id}`);
    } catch (err) {
      console.error("Background journal creation failed:", err);
    }
  }

  return result;
}

export async function createSaleJournalEntries({
  companyId,
  sale,
  saleItems,
  customerId,
  cashierId,
}: {
  companyId: string;
  sale: any;
  customerId: string;
  saleItems: any[];
  cashierId: string;
}) {
  try {
    // ============================================
    // 1️⃣ Skip if not sale / not completed
    // ============================================
    if (sale.sale_type !== "sale") return;
    if (sale.status !== "completed") return;

    // ============================================
    // 2️⃣ Avoid duplicate journal entries
    // ============================================
    const exists = await prisma.journal_entries.findFirst({
      where: { reference_id: sale.id, reference_type: "sale" },
    });
    const fy = await getActiveFiscalYears();
    if (exists && !fy) return;

    // ============================================
    // 3️⃣ Compute COGS exactly like the trigger
    // ============================================
    let totalCOGS = 0;

    for (const item of saleItems) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
        select: {
          costPrice: true,
          unitsPerPacket: true,
          packetsPerCarton: true,
        },
      });

      const qty = item.selectedQty;
      if (!product) return null;
      // Determine units per carton
      const unitsPerCarton =
        (product.unitsPerPacket || 1) * (product.packetsPerCarton || 1);

      // Determine cost based on selling unit
      let costPerUnit = Number(product.costPrice);
      if (item.sellingUnit === "packet")
        costPerUnit =
          Number(product.costPrice) / (product.packetsPerCarton || 1);
      if (item.sellingUnit === "unit")
        costPerUnit = Number(product.costPrice) / unitsPerCarton;

      totalCOGS += qty * Number(costPerUnit);
    }

    // ============================================
    // 4️⃣ Create JE number (same format as SQL)
    // ============================================
    // Generate JE number safely
    const year = new Date().getFullYear().toString();
    const nextSeqRaw: { next_number: string }[] = await prisma.$queryRawUnsafe(`
  SELECT COALESCE(
    MAX(CAST(SPLIT_PART(entry_number, '-', 3) AS INT)),
    0
  ) + 1 AS next_number
  FROM journal_entries
  WHERE entry_number LIKE 'JE-${year}-%'
    AND entry_number ~ '^JE-${year}-[0-9]+$'
`);

    const nextNumber = Number(nextSeqRaw[0]?.next_number || 1);
    const seqFormatted = String(nextNumber).padStart(7, "0");
    const randomSuffix = Math.floor(Math.random() * 1000);
    const entryBase = `JE-${year}-${seqFormatted}-${randomSuffix}`;

    // ============================================
    // 5️⃣ Fetch account mappings
    // ============================================
    const mappings = await prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
    });

    const getAcc = (type: string) =>
      mappings.find((m) => m.mapping_type === type)?.account_id;

    const cash = getAcc("cash");
    const ar = getAcc("accounts_receivable");
    const revenue = getAcc("sales_revenue");
    const inventory = getAcc("inventory");
    const cogs = getAcc("cogs");
    const payable = getAcc("accounts_payable");

    const total = Number(sale.totalAmount);
    const paid = Number(sale.amountPaid);
    const due = Number(sale.amountDue);

    const desc = `قيد بيع رقم ${sale.saleNumber}${
      sale.customerId ? " - " + sale.customer?.name : ""
    }`;

    const entries: any[] = [];

    // ============================================
    // 6️⃣ Payment Status Logic
    // ============================================

    if (sale.paymentStatus === "paid") {
      // ----------------------------
      // A: Customer paid extra (change)
      // ----------------------------
      if (paid > total) {
        const change = paid - total;

        // Payable (credit)
        entries.push({
          company_id: companyId,
          account_id: payable,
          description: desc + " - فائض عميل",
          debit: 0,
          credit: change,
          entry_date: new Date(),
          reference_id: customerId,
          reference_type: "فاتورة مبيعات",
          entry_number: `${entryBase}-C`,
          created_by: cashierId,
          is_automated: true,
        });

        // Cash (debit total)
        entries.push({
          company_id: companyId,
          account_id: cash,
          description: desc,
          debit: total,
          entry_date: new Date(),
          credit: 0,
          fiscal_period: fy?.period_name,
          reference_id: customerId,
          reference_type: "فاتورة مبيعات",
          entry_number: `${entryBase}-D`,
          created_by: cashierId,
          is_automated: true,
        });

        // Revenue (credit total)
        entries.push({
          company_id: companyId,
          account_id: revenue,
          description: desc,
          debit: 0,
          credit: total,
          fiscal_period: fy?.period_name,
          entry_date: new Date(),
          reference_id: sale.id,
          reference_type: "دفوعة نقداً",
          entry_number: `${entryBase}-R`,
          created_by: cashierId,
          is_automated: true,
        });
      }

      // ----------------------------
      // B: Exact payment
      // ----------------------------
      else if (paid === total) {
        entries.push({
          company_id: companyId,
          account_id: cash,
          description: desc,
          debit: paid,
          credit: 0,
          fiscal_period: fy?.period_name,
          entry_date: new Date(),
          reference_id: customerId,
          entry_number: `${entryBase}-D1`,
          created_by: cashierId,
          reference_type: " نقداً",
          is_automated: true,
        });

        entries.push({
          company_id: companyId,
          account_id: revenue,
          description: desc,
          debit: 0,
          credit: total,
          fiscal_period: fy?.period_name,
          entry_date: new Date(),
          reference_id: customerId,
          entry_number: `${entryBase}-C1`,
          created_by: cashierId,
          reference_type: "دفع نقداً",
          is_automated: true,
        });
      }
    }

    // ----------------------------
    // PARTIAL PAYMENT
    // ----------------------------
    // ============================================
    // PARTIAL PAYMENT (Revised Logic)
    // ============================================
    else if (sale.paymentStatus === "partial") {
      // 1. Record the FULL sale amount as Accounts Receivable (AR)
      // Debit AR (Customer Debt Increases)
      entries.push({
        company_id: companyId,
        account_id: ar,
        description: desc + " فاتورة بيع اجل",
        fiscal_period: fy?.period_name,
        debit: total, // <--- Debit FULL TOTAL
        credit: 0,
        entry_date: new Date(),
        reference_id: customerId,
        reference_type: "فاتورة مبيعات",
        entry_number: `${entryBase}-PS-DR`,
        created_by: cashierId,
        is_automated: true,
      });

      // Credit Revenue (Revenue Recognized)
      entries.push({
        company_id: companyId,
        account_id: revenue,
        description: desc + " - فاتورة بيع",
        debit: 0,
        fiscal_period: fy?.period_name,
        entry_date: new Date(),
        credit: total, // <--- Credit FULL TOTAL
        reference_id: sale.id,
        reference_type: "فاتورة مبيعات",
        entry_number: `${entryBase}-PS-CR`,
        created_by: cashierId,
        is_automated: true,
      });

      // 2. Record the Payment Received (Only if amountPaid > 0)
      if (paid > 0) {
        // Debit Cash (Company Cash Increases)
        entries.push({
          company_id: companyId,
          account_id: cash,
          description: desc + " - دفعة فورية",
          fiscal_period: fy?.period_name,
          debit: paid, // <--- Debit PAID amount
          credit: 0,
          entry_date: new Date(),
          reference_id: sale.id, // Use customerId for the payment reference
          reference_type: "دفعة من عميل", // New type for payments
          entry_number: `${entryBase}-PP-DR`,
          created_by: cashierId,
          is_automated: true,
        });

        // Credit AR (Customer Debt Decreases)
        entries.push({
          company_id: companyId,
          account_id: ar,
          description: desc + " المدفوع من المبلغ",
          debit: 0,
          fiscal_period: fy?.period_name,
          entry_date: new Date(),
          credit: paid, // <--- Credit PAID amount
          reference_id: customerId, // Use customerId for the payment reference
          reference_type: "دفعة من عميل", // New type for payments
          entry_number: `${entryBase}-PP-CR`,
          created_by: cashierId,
          is_automated: true,
        });
      }
    }
    // ----------------------------
    // UNPAID (full AR)
    // ----------------------------
    else {
      entries.push({
        company_id: companyId,
        account_id: ar,
        description: desc + " غير مدفوع",
        entry_date: new Date(),
        debit: total,
        credit: 0,
        fiscal_period: fy?.period_name,
        reference_id: customerId,
        entry_number: `${entryBase}-U1`,
        reference_type: "فاتورة مبيعات",

        created_by: cashierId,
        is_automated: true,
      });

      entries.push({
        company_id: companyId,
        account_id: revenue,
        description: desc + " غير مدفوع",
        entry_date: new Date(),
        debit: 0,
        credit: total,
        fiscal_period: fy?.period_name,
        reference_id: sale.id,
        reference_type: "فاتورة مبيعات",
        entry_number: `${entryBase}-U2`,
        created_by: cashierId,
        is_automated: true,
      });
    }

    // ============================================
    // 7️⃣ COGS + Inventory
    // ============================================
    if (totalCOGS > 0 && cogs && inventory) {
      entries.push({
        company_id: companyId,
        account_id: cogs,
        description: desc,
        fiscal_period: fy?.period_name,
        entry_date: new Date(),
        debit: totalCOGS,
        credit: 0,
        reference_id: sale.id,
        reference_type: "  تكلفة البضاعة المباعة",
        entry_number: `${entryBase}-CG1`,
        created_by: cashierId,
        is_automated: true,
      });

      entries.push({
        company_id: companyId,
        account_id: inventory,
        description: desc,
        entry_date: new Date(),
        debit: 0,
        credit: totalCOGS,
        fiscal_period: fy?.period_name,
        reference_id: sale.id,
        reference_type: "  تكلفة البضاعة المباعة",
        entry_number: `${entryBase}-CG2`,
        created_by: cashierId,
        is_automated: true,
      });
    }

    // ============================================
    // 8️⃣ Insert all entries
    // ============================================
    await prisma.journal_entries.createMany({ data: entries });

    // ============================================
    // 9️⃣ Update account balances
    // ============================================
    const balanceOps = entries.map((e) =>
      prisma.accounts.update({
        where: { id: e.account_id },
        data: {
          balance: { increment: Number(e.debit) - Number(e.credit) },
        },
      }),
    );

    await Promise.all(balanceOps);

    console.log("Journal entries created for sale", sale.id);
  } catch (err) {
    console.error("Error in createSaleJournalEntries:", err);
  }
}

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
        type: true,
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

  return activeProducts.map((product) => {
    const availableUnits = product.inventory[0]?.availableQuantity ?? 0;
    const { availablePackets, availableCartons } = convertFromBaseUnit(
      product,
      availableUnits,
    );

    // ✅ Only return quantities that are actually sold
    let finalAvailableUnits = 0;
    let finalAvailablePackets = 0;
    let finalAvailableCartons = 0;

    if (product.type === "full") {
      // Sell all three levels
      finalAvailableUnits = availableUnits;
      finalAvailablePackets = availablePackets;
      finalAvailableCartons = availableCartons;
    } else if (product.type === "cartonUnit") {
      // Only sell units and cartons, hide packets
      finalAvailableUnits = availableUnits;
      finalAvailableCartons = availableCartons;
      finalAvailablePackets = 0; // ✅ Don't show packets
    } else if (product.type === "cartonOnly") {
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
      sellingMode: product.type ?? "", // ✅ Optional: helpful for debugging
    };
  });
}
export async function processReturn(data: any, companyId: string) {
  const {
    saleId,
    cashierId,
    customerId,
    returnNumber,
    reason,
    items,
    returnToCustomer,
    paymentMethod,
  } = data;

  // Filter only items with quantity > 0
  const returnItems = items.filter((item: any) => item.quantity > 0);

  if (returnItems.length === 0) {
    return { success: false, message: "لا توجد منتجات للإرجاع" };
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // 1. Get original sale
      const originalSale = await tx.sale.findUnique({
        where: { id: saleId },
        include: {
          saleItems: {
            include: {
              product: true,
            },
          },
        },
      });

      if (!originalSale) {
        throw new Error("عملية البيع غير موجودة");
      }

      // *** CAPTURE AMOUNT DUE HERE ***
      const originalSaleAmountDue = originalSale.amountDue?.toNumber() || 0;

      // 2. Calculate return totals
      let returnSubtotal = 0;
      let returnTotalCOGS = 0;

      const saleItemsMap = new Map(
        originalSale.saleItems.map((item) => [item.productId, item]),
      );

      // Helper function to convert to base units
      function convertToBaseUnits(
        qty: number,
        sellingUnit: string,
        unitsPerPacket: number,
        packetsPerCarton: number,
      ): number {
        if (sellingUnit === "unit") return qty;
        if (sellingUnit === "packet") return qty * (unitsPerPacket || 1);
        if (sellingUnit === "carton")
          return qty * (unitsPerPacket || 1) * (packetsPerCarton || 1);
        return qty;
      }

      // Calculate return amount and COGS
      for (const returnItem of returnItems) {
        const saleItem = saleItemsMap.get(returnItem.productId);
        if (!saleItem) {
          throw new Error(
            `المنتج ${returnItem.name} غير موجود في البيع الأصلي`,
          );
        }

        // Validate return quantity
        if (returnItem.quantity > saleItem.quantity) {
          throw new Error(
            `كمية الإرجاع للمنتج ${returnItem.name} أكبر من الكمية المباعة`,
          );
        }

        // Calculate return value (based on unit price from original sale)
        const itemReturnValue =
          saleItem.unitPrice.toNumber() * returnItem.quantity;
        returnSubtotal += itemReturnValue;
        console.log(returnToCustomer);
        // Calculate COGS for this return
        const product = saleItem.product;
        const totalUnitsPerCarton =
          product.unitsPerPacket === 0 && product.packetsPerCarton === 0
            ? 1
            : product.packetsPerCarton === 0
              ? Math.max(product.unitsPerPacket, 1)
              : Math.max(product.unitsPerPacket, 1) *
                Math.max(product.packetsPerCarton, 1);

        let costPerSellingUnit = 0;
        if (returnItem.sellingUnit === "carton") {
          costPerSellingUnit = product.costPrice.toNumber();
        } else if (returnItem.sellingUnit === "packet") {
          costPerSellingUnit =
            product.costPrice.toNumber() /
            Math.max(product.packetsPerCarton, 1);
        } else if (returnItem.sellingUnit === "unit") {
          costPerSellingUnit =
            product.costPrice.toNumber() / totalUnitsPerCarton;
        }

        const itemCOGS = returnItem.quantity * costPerSellingUnit;
        returnTotalCOGS += itemCOGS;
      }

      // 3. Create return sale record
      const returnSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          companyId,
          saleNumber: returnNumber,
          customerId: originalSale.customerId,
          cashierId,
          sale_type: "return",
          status: "completed",
          subtotal: returnSubtotal, // Negative for return
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: originalSale.amountPaid,
          amountPaid: returnToCustomer, // Will be refunded
          amountDue: originalSale.amountDue,
          paymentStatus: "paid",
          originalSaleId: saleId,
        },
      });

      // 4. Create return sale items and restock inventory
      const returnSaleItemsData = [];
      const stockMovementsData = [];
      const inventoryUpdates = [];

      for (const returnItem of returnItems) {
        const saleItem = saleItemsMap.get(returnItem.productId);
        const product = saleItem!.product;

        // Convert to base units for inventory
        const quantityInUnits = convertToBaseUnits(
          returnItem.quantity,
          returnItem.sellingUnit,
          product.unitsPerPacket || 1,
          product.packetsPerCarton || 1,
        );

        // Get inventory
        const inventory = await tx.inventory.findUnique({
          where: {
            companyId_productId_warehouseId: {
              companyId,
              productId: returnItem.productId,
              warehouseId: returnItem.warehouseId,
            },
          },
        });

        if (!inventory) {
          throw new Error(`المخزون غير موجود للمنتج ${returnItem.name}`);
        }

        const newStock = inventory.stockQuantity + quantityInUnits;
        const newAvailable = inventory.availableQuantity + quantityInUnits;

        // Prepare return sale item
        returnSaleItemsData.push({
          companyId,
          saleId: returnSale.id,
          productId: returnItem.productId,
          quantity: returnItem.quantity,
          sellingUnit: returnItem.sellingUnit,
          unitPrice: saleItem!.unitPrice,
          totalPrice: saleItem!.unitPrice.toNumber() * returnItem.quantity,
        });

        // Prepare stock movement
        stockMovementsData.push({
          companyId,
          productId: returnItem.productId,
          warehouseId: returnItem.warehouseId,
          userId: cashierId,
          movementType: "وارد",
          quantity: quantityInUnits,
          reason: reason ?? "إرجاع بيع",
          quantityBefore: inventory.stockQuantity,
          quantityAfter: newStock,
          reference_type: "إرجاع",
          reference_id: returnSale.id,
          notes: reason || undefined,
        });

        // Prepare inventory update
        inventoryUpdates.push(
          tx.inventory.update({
            where: {
              companyId_productId_warehouseId: {
                companyId,
                productId: returnItem.productId,
                warehouseId: returnItem.warehouseId,
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
          }),
        );
      }

      // Execute all operations in parallel
      await Promise.all([
        tx.saleItem.createMany({ data: returnSaleItemsData }),
        tx.stockMovement.createMany({ data: stockMovementsData }),
        ...inventoryUpdates,
      ]);

      // 5. Handle customer balance and refund
      const customerUpdates = [];

      if (customerId) {
        // Check original sale payment status
        if (
          originalSale.paymentStatus === "unpaid" ||
          originalSale.paymentStatus === "partial"
        ) {
          // If original sale was unpaid/partial, reduce outstanding balance
          const amountToDeduct = Math.min(
            returnSubtotal,
            originalSale.amountDue?.toNumber() || 0,
          );

          if (amountToDeduct > 0) {
            customerUpdates.push(
              tx.customer.update({
                where: { id: customerId, companyId },
                data: {
                  outstandingBalance: { decrement: amountToDeduct },
                },
              }),
            );
          }

          // Remaining amount goes to customer balance (credit)
          // const remainingCredit = returnToCustomer - amountToDeduct;
          // if (remainingCredit > 0) {
          //    customerUpdates.push(
          //       tx.customer.update({
          //          where: { id: customerId, companyId },
          //          data: {
          //             balance: { increment: remainingCredit },
          //          },
          //       }),
          //    );
          // }
        } else {
          // If original sale was paid, add full amount to customer balance
          customerUpdates.push(
            tx.customer.update({
              where: { id: customerId, companyId },
              data: {
                balance: { increment: returnSubtotal },
              },
            }),
          );
        }
      }

      // 6. Create payment record for return
      customerUpdates.push(
        tx.payment.updateMany({
          where: { saleId: saleId }, // Use updateMany for non-unique query fields
          data: {
            companyId,
            saleId: returnSale.id,
            cashierId,
            customerId: originalSale.customerId,
            paymentMethod: paymentMethod,
            payment_type: "return_refund",
            amount: returnToCustomer, // Negative for refund
            status: "completed",
            notes: reason || "إرجاع بيع",
          },
        }),
      );

      if (customerUpdates.length > 0) {
        await Promise.all(customerUpdates);
      }

      return {
        success: true,
        message: "تم إرجاع البيع بنجاح",
        returnSale,
        returnSubtotal,
        returnTotalCOGS, // return the correctly named variable
        originalSaleAmountDue, // *** return the amount due as well ***
      };
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );

  // The 'after' block logic needs to be attached to the result of the transaction
  // and use the properties returned by the transaction.
  if (result.success) {
    try {
      // Determine refund allocation
      // Use the correct variable name: result.returnTotalCOGS
      // Use the correct variable name: result.originalSaleAmountDue
      const refundFromAR = Math.min(
        result.returnSubtotal,
        result.originalSaleAmountDue || 0,
      );
      const refundFromCashBank = result.returnSubtotal - refundFromAR;

      await createReturnJournalEntries(
        companyId,
        cashierId,
        returnNumber,
        result.returnSubtotal,
        result.returnTotalCOGS, // Corrected variable name
        refundFromAR,
        refundFromCashBank,
        result.returnSale.id,
        paymentMethod,
        reason,
      );

      console.log(
        `Journal entries created for returnSaleId=${result.returnSale.id}`,
      );
    } catch (err) {
      console.error("Background journal creation failed:", err);
    }
  }

  revalidatePath("/sells");
  return result;
}

// ... createReturnJournalEntries remains the same

export async function createReturnJournalEntries(
  companyId: string,
  cashierId: string,
  returnNumber: string,
  returnSubtotal: number,
  returnTotalCOGS: number,
  refundFromAR: number,
  refundFromCashBank: number,
  returnSaleId: string,
  refundAccountMethod: "cash" | "bank" = "cash",
  reason?: string,
) {
  // Use a transaction only for the journal entries and related account lookups
  const result = await prisma.$transaction(async (tx) => {
    // 1) Load Account Mappings
    const mappings = await tx.account_mappings.findMany({
      where: { company_id: companyId },
    });
    const fy = await getActiveFiscalYears();
    if (!fy) return;
    const getAccountId = (type: string) =>
      mappings.find((m: any) => m.mapping_type === type)?.account_id;

    const revenueAccount = getAccountId("sales_revenue");
    const cogsAccount = getAccountId("cogs");
    const inventoryAccount = getAccountId("inventory");
    const cashAccount = getAccountId("cash");
    const bankAccount = getAccountId("bank");
    const arAccount = getAccountId("accounts_receivable");

    // Check for essential accounts
    if (!revenueAccount || !cogsAccount || !inventoryAccount) {
      throw new Error(
        "Missing essential GL account mappings (Sales, COGS, Inventory).",
      );
    }

    // 2) Prepare Journal Entry Number
    // The base entry number for the transaction (will be suffixed for line items)
    const v_year = new Date().getFullYear();

    // Generate a highly unique base number using a timestamp
    // This is safer than using a hardcoded sequence or just hhmmss.
    const uniqueTimeSuffix = `${Date.now()}`;
    const baseEntryNumber = `JE-${v_year}-${returnNumber}-${uniqueTimeSuffix}-RET`;
    // -------------------------------------------------------------------

    const journalData: any[] = [];
    let entryCounter = 1;

    // --- Journal Entry Components ---
    // The `entry_number` is now suffixed (e.g., -1, -2, -3) to ensure uniqueness
    // for each line item, mirroring your trigger logic (-D1, -C1, etc.).

    // 1. Reverse Revenue: Debit Sales Revenue (decrease revenue/equity)
    journalData.push({
      company_id: companyId,
      entry_number: `${baseEntryNumber}-${entryCounter++}`, // Unique suffix
      account_id: revenueAccount,
      description: `إرجاع بيع ${returnNumber}`,
      entry_date: new Date(),
      debit: returnSubtotal,
      credit: 0,
      is_automated: true,
      fiscal_period: fy?.period_name,
      reference_type: "sale_return",
      reference_id: returnSaleId,
      created_by: cashierId,
    });

    // 2. Reverse COGS: Credit COGS (decrease expense/equity)
    journalData.push({
      company_id: companyId,
      entry_number: `${baseEntryNumber}-${entryCounter++}`, // Unique suffix
      account_id: cogsAccount,
      description: `عكس تكلفة البضاعة المباعة (إرجاع) ${returnNumber}`,
      entry_date: new Date(),
      debit: 0,
      fiscal_period: fy?.period_name,
      credit: returnTotalCOGS,
      is_automated: true,
      reference_type: "sale_return",
      reference_id: returnSaleId,
      created_by: cashierId,
    });

    // 3. Reverse COGS: Debit Inventory (increase asset)
    journalData.push({
      company_id: companyId,
      entry_number: `${baseEntryNumber}-${entryCounter++}`, // Unique suffix
      account_id: inventoryAccount,
      description: `زيادة مخزون (إرجاع) ${returnNumber}`,
      entry_date: new Date(),
      debit: returnTotalCOGS, // Inventory is returned at cost (COGS)
      credit: 0,
      fiscal_period: fy?.period_name,
      is_automated: true,
      reference_type: "sale_return",
      reference_id: returnSaleId,
      created_by: cashierId,
    });

    // 4. Refund Handling: Credit Accounts Receivable (decrease asset)
    if (refundFromAR > 0 && arAccount) {
      // Used to clear/reduce the customer's outstanding balance
      journalData.push({
        company_id: companyId,
        entry_number: `${baseEntryNumber}-${entryCounter++}`, // Unique suffix
        account_id: arAccount,
        description: `تخفيض مديونية العميل بسبب إرجاع ${returnNumber}`,
        entry_date: new Date(),
        // Note: Credit to decrease the AR asset balance
        debit: 0,
        fiscal_period: fy?.period_name,
        credit: refundFromAR,
        is_automated: true,
        reference_type: "sale_return",
        reference_id: returnSaleId,
        created_by: cashierId,
      });
    }

    // 5. Refund Handling: Credit Cash/Bank (decrease asset)
    if (refundFromCashBank > 0) {
      const refundAccountId =
        refundAccountMethod === "bank" ? bankAccount : cashAccount;

      if (!refundAccountId) {
        throw new Error(
          `Missing GL account mapping for refund method: ${refundAccountMethod}`,
        );
      }

      // Money going out to customer -> Credit cash/bank (decrease asset)
      journalData.push({
        company_id: companyId,
        entry_number: `${baseEntryNumber}-${entryCounter++}`, // Unique suffix
        account_id: refundAccountId,
        description: `صرف مبلغ مسترجع للعميل (إرجاع) ${returnNumber}`,
        entry_date: new Date(),
        debit: 0,
        credit: refundFromCashBank,
        is_automated: true,
        fiscal_period: fy?.period_name,
        reference_type: "sale_return",
        reference_id: returnSaleId,
        created_by: cashierId,
      });
    }

    // Double-check the total Debit and Credit columns for balance
    const totalDebit = journalData.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = journalData.reduce((sum, item) => sum + item.credit, 0);

    // The sum of Debits should equal the sum of Credits for the entry to be balanced
    if (totalDebit !== totalCredit) {
      throw new Error(
        `Journal entry is unbalanced: Debit ${totalDebit} vs Credit ${totalCredit}`,
      );
    }

    // 3) Write journal entries
    if (journalData.length > 0) {
      // Using createMany for bulk insert
      await tx.journal_entries.createMany({ data: journalData });
    }
    // 3) Write journal entries
    if (journalData.length > 0) {
      await tx.journal_entries.createMany({ data: journalData });
    }

    // 4) Update account balances (exactly like trigger)
    for (const entry of journalData) {
      if (entry.debit > 0) {
        await tx.accounts.update({
          where: { id: entry.account_id },
          data: { balance: { increment: entry.debit } },
        });
      }
      if (entry.credit > 0) {
        await tx.accounts.update({
          where: { id: entry.account_id },
          data: { balance: { decrement: entry.credit } },
        });
      }
    }

    // Return success
    return {
      success: true,
      message: "تم إنشاء قيود اليومية للإرجاع بنجاح",
      entry_number: baseEntryNumber, // Return the base number for reference
    };
  });

  return result;
}
