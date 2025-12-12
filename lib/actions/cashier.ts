// app/actions/cashier.ts
"use server";

import prisma from "@/lib/prisma";
import {
  revalidatePath,
  revalidateTag,
  unstable_cache,
  unstable_noStore,
} from "next/cache";
import { logActivity } from "./activitylogs";
import { Prisma } from "@prisma/client";
import { getActiveFiscalYears } from "./fiscalYear";
import { serialize } from "v8";

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
      // 1️⃣ Create main Sale record
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

      // ===== Helper functions =====
      const convertToBaseUnits = (
        qty: number,
        sellingUnit: string,
        unitsPerPacket: number = 1,
        packetsPerCarton: number = 1,
      ) => {
        if (sellingUnit === "unit") return qty;
        if (sellingUnit === "packet") return qty * unitsPerPacket;
        if (sellingUnit === "carton")
          return qty * unitsPerPacket * packetsPerCarton;
        return qty;
      };

      const getUnitPrice = (item: any) =>
        item.sellingUnit === "unit"
          ? item.pricePerUnit || 0
          : item.sellingUnit === "packet"
            ? item.pricePerPacket || 0
            : item.sellingUnit === "carton"
              ? item.pricePerCarton || 0
              : 0;

      const getInventoryStatus = (available: number, reorderLevel: number) => {
        if (available === 0) return "out_of_stock";
        if (available <= reorderLevel) return "low";
        return "available";
      };

      // ===== Fetch all inventories once =====
      const productIds = cart.map((item: any) => item.id);
      const warehouseIds = cart.map((item: any) => item.warehouseId);

      const inventories = await tx.inventory.findMany({
        where: {
          companyId,
          productId: { in: productIds },
          warehouseId: { in: warehouseIds },
        },
        select: {
          id: true,
          productId: true,
          warehouseId: true,
          stockQuantity: true,
          reservedQuantity: true,
          availableQuantity: true,
          reorderLevel: true,
        },
      });

      const inventoryMap = new Map(
        inventories.map((inv) => [`${inv.productId}-${inv.warehouseId}`, inv]),
      );

      // ===== Prepare batch operations =====
      const saleItemsData: any[] = [];
      const stockMovementsData: any[] = [];
      const inventoryUpdates: any[] = [];

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
        const unitPrice = getUnitPrice(item);
        const totalPrice = unitPrice * item.selectedQty;

        saleItemsData.push({
          companyId,
          saleId: sale.id,
          productId: item.id,
          quantity: item.selectedQty,
          sellingUnit: item.sellingUnit,
          unitPrice,
          totalPrice,
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
          companyId,
          productId: item.id,
          warehouseId: item.warehouseId,
          stockQuantity: newStock,
          availableQuantity: newAvailable,
          status: getInventoryStatus(newAvailable, inventory.reorderLevel),
        });
      }

      // ===== Execute sale items and stock movements in parallel =====
      await Promise.all([
        tx.saleItem.createMany({ data: saleItemsData }),
        tx.stockMovement.createMany({ data: stockMovementsData }),
      ]);

      // ===== Optimized batch inventory update using updateMany =====
      if (inventoryUpdates.length > 0) {
        await Promise.all(
          inventoryUpdates.map((inv) =>
            tx.inventory.updateMany({
              where: {
                companyId: inv.companyId,
                productId: inv.productId,
                warehouseId: inv.warehouseId,
              },
              data: {
                stockQuantity: inv.stockQuantity,
                availableQuantity: inv.availableQuantity,
                status: inv.status,
              },
            }),
          ),
        );
      }

      // ===== Customer updates & payment =====
      const customerUpdatePromises: Promise<any>[] = [];

      if (customerId) {
        const customerData: any = {};
        if (totalAfterDiscount > receivedAmount)
          customerData.outstandingBalance = {
            increment: totalAfterDiscount - receivedAmount,
          };
        if (receivedAmount > totalAfterDiscount)
          customerData.balance = {
            increment: receivedAmount - totalAfterDiscount,
          };
        if (Object.keys(customerData).length)
          customerUpdatePromises.push(
            tx.customer.update({
              where: { id: customerId, companyId },
              data: customerData,
            }),
          );
      }

      if (receivedAmount > 0) {
        customerUpdatePromises.push(
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

      // Execute customer updates in parallel
      if (customerUpdatePromises.length > 0) {
        await Promise.all(customerUpdatePromises);
      }

      // 🆕 CREATE JOURNAL EVENT (instead of direct creation)
      await tx.journalEvent.create({
        data: {
          companyId: companyId,
          eventType: "sale",
          status: "pending",
          entityType: "sale",
          payload: {
            companyId,
            sale: {
              id: sale.id,
              saleNumber: sale.saleNumber,
              sale_type: sale.sale_type,
              status: sale.status,
              totalAmount: sale.totalAmount.toString(),
              amountPaid: sale.amountPaid.toString(),
              paymentStatus: sale.paymentStatus,
            },
            customerId,
            saleItems: cart,
            cashierId,
          },
          processed: false,
        },
      });

      // ===== Prepare response =====
      const saleForClient = {
        ...sale,
        taxAmount: sale.taxAmount.toString(),
        subtotal: sale.subtotal.toString(),
        discountAmount: sale.discountAmount.toString(),
        totalAmount: sale.totalAmount.toString(),
        amountPaid: sale.amountPaid.toString(),
        amountDue: sale.amountDue.toString(),
        refunded: sale.refunded.toString(),
      };

      return { message: "Sale processed successfully", sale: saleForClient };
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );

  // ===== Fire non-blocking operations =====
  Promise.all([
    revalidatePath("/cashiercontrol"),
    logActivity(
      cashierId,
      companyId,
      "أمين الصندوق",
      "قام ببيع منتج",
      "889",
      "وكيل المستخدم",
    ).catch(console.error),
  ]).catch(console.error);

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
//       // 1️⃣ Create main Sale record
//       const sale = await tx.sale.create({
//         data: {
//           companyId,
//           saleNumber,
//           customerId,
//           cashierId,
//           taxAmount: 0,
//           sale_type: "sale",
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

//       // ===== Helper functions =====
//       const convertToBaseUnits = (
//         qty: number,
//         sellingUnit: string,
//         unitsPerPacket: number = 1,
//         packetsPerCarton: number = 1,
//       ) => {
//         if (sellingUnit === "unit") return qty;
//         if (sellingUnit === "packet") return qty * unitsPerPacket;
//         if (sellingUnit === "carton")
//           return qty * unitsPerPacket * packetsPerCarton;
//         return qty;
//       };

//       const getUnitPrice = (item: any) =>
//         item.sellingUnit === "unit"
//           ? item.pricePerUnit || 0
//           : item.sellingUnit === "packet"
//             ? item.pricePerPacket || 0
//             : item.sellingUnit === "carton"
//               ? item.pricePerCarton || 0
//               : 0;

//       const getInventoryStatus = (available: number, reorderLevel: number) => {
//         if (available === 0) return "out_of_stock";
//         if (available <= reorderLevel) return "low";
//         return "available";
//       };

//       // ===== Fetch all inventories once =====
//       const productIds = cart.map((item: any) => item.id);
//       const warehouseIds = cart.map((item: any) => item.warehouseId);

//       const inventories = await tx.inventory.findMany({
//         where: {
//           companyId,
//           productId: { in: productIds },
//           warehouseId: { in: warehouseIds },
//         },
//         select: {
//           id: true,
//           productId: true,
//           warehouseId: true,
//           stockQuantity: true,
//           reservedQuantity: true,
//           availableQuantity: true,
//           reorderLevel: true,
//         },
//       });

//       const inventoryMap = new Map(
//         inventories.map((inv) => [`${inv.productId}-${inv.warehouseId}`, inv]),
//       );

//       // ===== Prepare batch operations =====
//       const saleItemsData: any[] = [];
//       const stockMovementsData: any[] = [];
//       const inventoryUpdates: any[] = [];

//       for (const item of cart) {
//         const quantityInUnits = convertToBaseUnits(
//           item.selectedQty,
//           item.sellingUnit,
//           item.unitsPerPacket || 1,
//           item.packetsPerCarton || 1,
//         );

//         const inventoryKey = `${item.id}-${item.warehouseId}`;
//         const inventory = inventoryMap.get(inventoryKey);

//         if (!inventory || inventory.availableQuantity < quantityInUnits) {
//           throw new Error(
//             `Insufficient stock for ${item.name}. Available: ${inventory?.availableQuantity || 0}, Requested: ${quantityInUnits}.`,
//           );
//         }

//         const newStock = inventory.stockQuantity - quantityInUnits;
//         const newAvailable = inventory.availableQuantity - quantityInUnits;
//         const unitPrice = getUnitPrice(item);
//         const totalPrice = unitPrice * item.selectedQty;

//         saleItemsData.push({
//           companyId,
//           saleId: sale.id,
//           productId: item.id,
//           quantity: item.selectedQty,
//           sellingUnit: item.sellingUnit,
//           unitPrice,
//           totalPrice,
//         });

//         stockMovementsData.push({
//           companyId,
//           productId: item.id,
//           warehouseId: item.warehouseId,
//           userId: cashierId,
//           movementType: "صادر",
//           quantity: quantityInUnits,
//           reason: "بيع",
//           quantityBefore: inventory.stockQuantity,
//           quantityAfter: newStock,
//           referenceType: "بيع",
//           referenceId: sale.id,
//         });

//         inventoryUpdates.push({
//           companyId,
//           productId: item.id,
//           warehouseId: item.warehouseId,
//           stockQuantity: newStock,
//           availableQuantity: newAvailable,
//           status: getInventoryStatus(newAvailable, inventory.reorderLevel),
//         });
//       }

//       // ===== Execute sale items and stock movements in parallel =====
//       await Promise.all([
//         tx.saleItem.createMany({ data: saleItemsData }),
//         tx.stockMovement.createMany({ data: stockMovementsData }),
//       ]);

//       // ===== Optimized batch inventory update using updateMany =====
//       if (inventoryUpdates.length > 0) {
//         // Execute all updates in parallel instead of raw SQL
//         await Promise.all(
//           inventoryUpdates.map((inv) =>
//             tx.inventory.updateMany({
//               where: {
//                 companyId: inv.companyId,
//                 productId: inv.productId,
//                 warehouseId: inv.warehouseId,
//               },
//               data: {
//                 stockQuantity: inv.stockQuantity,
//                 availableQuantity: inv.availableQuantity,
//                 status: inv.status,
//               },
//             }),
//           ),
//         );
//       }

//       // ===== Customer updates & payment =====
//       const customerUpdatePromises: Promise<any>[] = [];

//       if (customerId) {
//         const customerData: any = {};
//         if (totalAfterDiscount > receivedAmount)
//           customerData.outstandingBalance = {
//             increment: totalAfterDiscount - receivedAmount,
//           };
//         if (receivedAmount > totalAfterDiscount)
//           customerData.balance = {
//             increment: receivedAmount - totalAfterDiscount,
//           };
//         if (Object.keys(customerData).length)
//           customerUpdatePromises.push(
//             tx.customer.update({
//               where: { id: customerId, companyId },
//               data: customerData,
//             }),
//           );
//       }

//       if (receivedAmount > 0) {
//         customerUpdatePromises.push(
//           tx.payment.create({
//             data: {
//               companyId,
//               saleId: sale.id,
//               cashierId,
//               customerId,
//               paymentMethod: "cash",
//               payment_type: "sale_payment",
//               amount: receivedAmount,
//               status: "completed",
//             },
//           }),
//         );
//       }

//       // Execute customer updates in parallel
//       if (customerUpdatePromises.length > 0) {
//         await Promise.all(customerUpdatePromises);
//       }

//       // ===== Prepare response =====
//       const saleForClient = {
//         ...sale,
//         taxAmount: sale.taxAmount.toString(),
//         subtotal: sale.subtotal.toString(),
//         discountAmount: sale.discountAmount.toString(),
//         totalAmount: sale.totalAmount.toString(),
//         amountPaid: sale.amountPaid.toString(),
//         amountDue: sale.amountDue.toString(),
//         refunded: sale.refunded.toString(),
//       };

//       return { message: "Sale processed successfully", sale: saleForClient };
//     },
//     {
//       timeout: 20000,
//       maxWait: 5000,
//     },
//   );

//   // ===== Fire non-blocking operations =====
//   Promise.all([
//     revalidatePath("/cashiercontrol"),
//     logActivity(
//       cashierId,
//       companyId,
//       "أمين الصندوق",
//       "قام ببيع منتج",
//       "889",
//       "وكيل المستخدم",
//     ).catch(console.error),
//   ]).catch(console.error);

//   // ===== Create journal entries with retry logic (non-blocking) =====
//   createSaleJournalEntriesWithRetry({
//     companyId,
//     sale: result.sale,
//     customerId,
//     saleItems: cart,
//     cashierId,
//   }).catch((err) =>
//     console.error("❌ Journal entries failed after all retries:", err),
//   );

//   return result;
// }

// ============================================
// 🔄 Journal Entries with Automatic Retry
// ============================================
async function createSaleJournalEntriesWithRetry(
  data: {
    companyId: string;
    sale: any;
    customerId: string;
    saleItems: any[];
    cashierId: string;
  },
  maxRetries = 3,
  retryDelay = 200,
) {
  const exists = await prisma.journal_entries.findFirst({
    where: {
      reference_id: data.sale.id,
      reference_type: "sale",
    },
    select: { id: true },
  });

  if (exists) {
    console.log(
      "🟨 Journal entries already exist — skipping retry + creation.",
    );
    return; // 👍 Prevents retrying & prevents duplicates
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `📝 Creating journal entries (attempt ${attempt}/${maxRetries})...`,
      );
      await createSaleJournalEntries(data);
      console.log(
        `✅ Journal entries created successfully on attempt ${attempt}`,
      );
      return; // Success, exit
    } catch (error: any) {
      lastError = error;
      console.error(
        `❌ Journal entries attempt ${attempt}/${maxRetries} failed:`,
        error.message,
      );

      if (attempt < maxRetries) {
        // Exponential backoff: wait longer between each retry
        const waitTime = retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  // If we got here, all retries failed
  throw new Error(
    `Failed to create journal entries after ${maxRetries} attempts. Last error: ${lastError?.message}`,
  );
}

// ============================================
// 📊 Optimized Journal Entries Creation
// ============================================
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
  // 1️⃣ Early exits
  if (sale.sale_type !== "sale" || sale.status !== "completed") return;

  // 2️⃣ Check for duplicates and fetch fiscal year in parallel
  const [exists, fy] = await Promise.all([
    prisma.journal_entries.findFirst({
      where: { reference_id: sale.id, reference_type: "sale" },
      select: { id: true },
    }),
    getActiveFiscalYears(),
  ]);

  if (exists) return;

  // 3️⃣ Calculate COGS - Optimized
  const productIds = saleItems.map((item) => item.id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      costPrice: true,
      unitsPerPacket: true,
      packetsPerCarton: true,
    },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));
  let totalCOGS = 0;

  for (const item of saleItems) {
    const product = productMap.get(item.id);
    if (!product) continue;

    const unitsPerCarton =
      (product.unitsPerPacket || 1) * (product.packetsPerCarton || 1);

    let costPerUnit = Number(product.costPrice);
    if (item.sellingUnit === "packet")
      costPerUnit = costPerUnit / (product.packetsPerCarton || 1);
    else if (item.sellingUnit === "unit")
      costPerUnit = costPerUnit / unitsPerCarton;

    totalCOGS += item.selectedQty * costPerUnit;
  }

  // 4️⃣ Generate JE number
  // const year = new Date().getFullYear();
  // const nextSeqRaw: { next_number: string }[] = await prisma.$queryRawUnsafe(`
  //   SELECT COALESCE(
  //     MAX(CAST(SPLIT_PART(entry_number, '-', 3) AS INT)),
  //     0
  //   ) + 1 AS next_number
  //   FROM journal_entries
  //   WHERE entry_number LIKE 'JE-${year}-%'
  //     AND entry_number ~ '^JE-${year}-[0-9]+$'
  // `);

  // const nextNumber = Number(nextSeqRaw[0]?.next_number || 1);
  // const entryBase = `JE-${year}-${String(nextNumber).padStart(7, "0")}`;
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
  // 5️⃣ Fetch account mappings
  const mappings = await prisma.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
    select: { mapping_type: true, account_id: true },
  });

  const accountMap = new Map(
    mappings.map((m) => [m.mapping_type, m.account_id]),
  );

  const cash = accountMap.get("cash");
  const ar = accountMap.get("accounts_receivable");
  const revenue = accountMap.get("sales_revenue");
  const inventory = accountMap.get("inventory");
  const cogs = accountMap.get("cogs");
  const payable = accountMap.get("accounts_payable");

  const total = Number(sale.totalAmount);
  const paid = Number(sale.amountPaid);
  const desc = `قيد بيع رقم ${sale.saleNumber}`;

  const entries: any[] = [];
  const baseEntry = {
    company_id: companyId,
    entry_date: new Date(),
    fiscal_period: fy?.period_name,
    created_by: cashierId,
    is_automated: true,
  };

  // 6️⃣ Payment Status Logic - Simplified
  if (sale.paymentStatus === "paid") {
    if (paid > total) {
      // Overpayment
      const change = paid - total;
      entries.push(
        {
          ...baseEntry,
          account_id: payable,
          description: desc + " - فائض عميل",
          debit: 0,
          credit: change,
          reference_id: customerId,
          reference_type: "فاتورة مبيعات",
          entry_number: `${entryBase}-C`,
        },
        {
          ...baseEntry,
          account_id: cash,
          description: desc,
          debit: total,
          credit: 0,
          reference_id: customerId,
          reference_type: "فاتورة مبيعات",
          entry_number: `${entryBase}-D`,
        },
        {
          ...baseEntry,
          account_id: revenue,
          description: desc,
          debit: 0,
          credit: total,
          reference_id: sale.id,
          reference_type: "دفوعة نقداً",
          entry_number: `${entryBase}-R`,
        },
      );
    } else {
      // Exact payment
      entries.push(
        {
          ...baseEntry,
          account_id: cash,
          description: desc,
          debit: paid,
          credit: 0,
          reference_id: customerId,
          reference_type: "فاتورة مبيعات نقداً",
          entry_number: `${entryBase}-D1`,
        },
        {
          ...baseEntry,
          account_id: revenue,
          description: desc,
          debit: 0,
          credit: total,
          reference_id: customerId,
          reference_type: "دفع نقداً",
          entry_number: `${entryBase}-C1`,
        },
      );
    }
  } else if (sale.paymentStatus === "partial") {
    // Partial payment
    entries.push(
      {
        ...baseEntry,
        account_id: ar,
        description: desc + " فاتورة بيع اجل",
        debit: total,
        credit: 0,
        reference_id: customerId,
        reference_type: "فاتورة مبيعات",
        entry_number: `${entryBase}-PS-DR`,
      },
      {
        ...baseEntry,
        account_id: revenue,
        description: desc + " - فاتورة بيع",
        debit: 0,
        credit: total,
        reference_id: sale.id,
        reference_type: "فاتورة مبيعات",
        entry_number: `${entryBase}-PS-CR`,
      },
    );

    if (paid > 0) {
      entries.push(
        {
          ...baseEntry,
          account_id: cash,
          description: desc + " - دفعة فورية",
          debit: paid,
          credit: 0,
          reference_id: sale.id,
          reference_type: "دفعة من عميل",
          entry_number: `${entryBase}-PP-DR`,
        },
        {
          ...baseEntry,
          account_id: ar,
          description: desc + " المدفوع من المبلغ",
          debit: 0,
          credit: paid,
          reference_id: customerId,
          reference_type: "دفعة من عميل",
          entry_number: `${entryBase}-PP-CR`,
        },
      );
    }
  } else {
    // Unpaid
    entries.push(
      {
        ...baseEntry,
        account_id: ar,
        description: desc + " غير مدفوع",
        debit: total,
        credit: 0,
        reference_id: customerId,
        reference_type: "فاتورة مبيعات اجل",
        entry_number: `${entryBase}-U1`,
      },
      {
        ...baseEntry,
        account_id: revenue,
        description: desc + " غير مدفوع",
        debit: 0,
        credit: total,
        reference_id: sale.id,
        reference_type: "فاتورة مبيعات",
        entry_number: `${entryBase}-U2`,
      },
    );
  }

  // 7️⃣ COGS + Inventory
  if (totalCOGS > 0 && cogs && inventory) {
    entries.push(
      {
        ...baseEntry,
        account_id: cogs,
        description: desc,
        debit: totalCOGS,
        credit: 0,
        reference_id: sale.id,
        reference_type: "تكلفة البضاعة المباعة",
        entry_number: `${entryBase}-CG1`,
      },
      {
        ...baseEntry,
        account_id: inventory,
        description: desc,
        debit: 0,
        credit: totalCOGS,
        reference_id: sale.id,
        reference_type: "خرج من المخزن",
        entry_number: `${entryBase}-CG2`,
      },
    );
  }

  // 8️⃣ Insert entries and update balances in a transaction
  await prisma.$transaction(async (tx) => {
    // Insert all journal entries
    await tx.journal_entries.createMany({ data: entries });

    // Calculate account balance deltas
    const accountDeltas = new Map<string, number>();
    for (const e of entries) {
      const delta = Number(e.debit) - Number(e.credit);
      accountDeltas.set(
        e.account_id,
        (accountDeltas.get(e.account_id) || 0) + delta,
      );
    }

    // Update all account balances in parallel
    await Promise.all(
      Array.from(accountDeltas.entries()).map(([accountId, delta]) =>
        tx.accounts.update({
          where: { id: accountId },
          data: { balance: { increment: delta } },
        }),
      ),
    );
  });
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
      // 1. Get original sale with all needed data
      const originalSale = await tx.sale.findUnique({
        where: { id: saleId },
        select: {
          amountDue: true,
          customerId: true,
          paymentStatus: true,
          saleItems: {
            select: {
              productId: true,
              quantity: true,
              unitPrice: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  costPrice: true,
                  unitsPerPacket: true,
                  packetsPerCarton: true,
                },
              },
            },
          },
        },
      });

      if (!originalSale) {
        throw new Error("عملية البيع غير موجودة");
      }

      const originalSaleAmountDue = originalSale.amountDue?.toNumber() || 0;

      // 2. Create maps and helper functions
      const saleItemsMap = new Map(
        originalSale.saleItems.map((item) => [item.productId, item]),
      );

      const convertToBaseUnits = (
        qty: number,
        sellingUnit: string,
        unitsPerPacket: number,
        packetsPerCarton: number,
      ): number => {
        if (sellingUnit === "unit") return qty;
        if (sellingUnit === "packet") return qty * (unitsPerPacket || 1);
        if (sellingUnit === "carton")
          return qty * (unitsPerPacket || 1) * (packetsPerCarton || 1);
        return qty;
      };

      const calculateCostPerUnit = (
        product: any,
        sellingUnit: string,
      ): number => {
        const totalUnitsPerCarton =
          Math.max(product.unitsPerPacket || 1, 1) *
          Math.max(product.packetsPerCarton || 1, 1);

        const costPrice = product.costPrice.toNumber();

        if (sellingUnit === "carton") return costPrice;
        if (sellingUnit === "packet")
          return costPrice / Math.max(product.packetsPerCarton, 1);
        if (sellingUnit === "unit") return costPrice / totalUnitsPerCarton;
        return costPrice;
      };

      // 3. Validate and calculate totals
      let returnSubtotal = 0;
      let returnTotalCOGS = 0;

      for (const returnItem of returnItems) {
        const saleItem = saleItemsMap.get(returnItem.productId);
        if (!saleItem) {
          throw new Error(
            `المنتج ${returnItem.name} غير موجود في البيع الأصلي`,
          );
        }

        if (returnItem.quantity > saleItem.quantity) {
          throw new Error(
            `كمية الإرجاع للمنتج ${returnItem.name} أكبر من الكمية المباعة`,
          );
        }

        // Calculate return value
        const itemReturnValue =
          saleItem.unitPrice.toNumber() * returnItem.quantity;
        returnSubtotal += itemReturnValue;

        // Calculate COGS
        const costPerUnit = calculateCostPerUnit(
          saleItem.product,
          returnItem.sellingUnit,
        );
        returnTotalCOGS += returnItem.quantity * costPerUnit;
      }

      // 4. Fetch all inventories in one query
      const warehouseIds = returnItems.map((item: any) => item.warehouseId);

      const productIds = returnItems.map((item: any) => item.productId);

      const inventories = await tx.inventory.findMany({
        where: {
          companyId,
          productId: { in: productIds },
          warehouseId: { in: warehouseIds },
        },
      });

      const inventoryMap = new Map(
        inventories.map((inv) => [`${inv.productId}-${inv.warehouseId}`, inv]),
      );

      // 5. Create return sale record
      const returnSale = await tx.sale.create({
        data: {
          companyId,
          saleNumber: returnNumber,
          customerId: originalSale.customerId,
          cashierId,
          sale_type: "return",
          status: "completed",
          subtotal: returnSubtotal,
          taxAmount: 0,
          discountAmount: 0,
          totalAmount: returnSubtotal,
          amountPaid: returnToCustomer,
          amountDue: 0,
          paymentStatus: "paid",
          originalSaleId: saleId,
        },
      });

      // 6. Prepare batch operations
      const returnSaleItemsData = [];
      const stockMovementsData = [];
      const inventoryUpdatesPromises = [];

      for (const returnItem of returnItems) {
        const saleItem = saleItemsMap.get(returnItem.productId)!;
        const product = saleItem.product;

        const quantityInUnits = convertToBaseUnits(
          returnItem.quantity,
          returnItem.sellingUnit,
          product.unitsPerPacket || 1,
          product.packetsPerCarton || 1,
        );

        const inventoryKey = `${returnItem.productId}-${returnItem.warehouseId}`;
        const inventory = inventoryMap.get(inventoryKey);

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
          unitPrice: saleItem.unitPrice,
          totalPrice: saleItem.unitPrice.toNumber() * returnItem.quantity,
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
          referenceType: "إرجاع",
          referenceId: returnSale.id,
          notes: reason || undefined,
        });

        // Prepare inventory update
        inventoryUpdatesPromises.push(
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
                newAvailable === 0
                  ? "out_of_stock"
                  : newAvailable <= inventory.reorderLevel
                    ? "low"
                    : "available",
            },
          }),
        );
      }
      await Promise.all([
        tx.saleItem.createMany({ data: returnSaleItemsData }),
        tx.stockMovement.createMany({ data: stockMovementsData }),
        ...inventoryUpdatesPromises,
      ]);
      // 7. Handle customer balance updates
      const customerUpdatePromises = [];

      if (customerId) {
        if (
          originalSale.paymentStatus === "unpaid" ||
          originalSale.paymentStatus === "partial"
        ) {
          // Reduce outstanding balance
          const amountToDeduct = Math.min(
            returnSubtotal,
            originalSale.amountDue?.toNumber() || 0,
          );

          if (amountToDeduct > 0) {
            customerUpdatePromises.push(
              tx.customer.update({
                where: { id: customerId, companyId },
                data: {
                  outstandingBalance: { decrement: amountToDeduct },
                },
              }),
            );
          }
        } else {
          // Full paid sale - add to balance
          customerUpdatePromises.push(
            tx.customer.update({
              where: { id: customerId, companyId },
              data: {
                balance: { increment: returnSubtotal },
              },
            }),
          );
        }
      }

      // 8. Create payment record
      if (returnToCustomer > 0) {
        customerUpdatePromises.push(
          tx.payment.create({
            data: {
              companyId,
              saleId: returnSale.id,
              cashierId,
              customerId: originalSale.customerId,
              paymentMethod: paymentMethod || "cash",
              payment_type: "return_refund",
              amount: returnToCustomer,
              status: "completed",
              notes: reason || "إرجاع بيع",
            },
          }),
        );
      }

      // 9. Execute all operations in parallel

      // Execute customer updates in parallel
      if (customerUpdatePromises.length > 0) {
        await Promise.all(customerUpdatePromises);
      }

      // 10. Update original sale refunded amount
      await tx.sale.update({
        where: { id: saleId },
        data: {
          refunded: { increment: returnSubtotal },
          totalAmount: 0,
          sale_type: "return",
        },
      });
      const cleanReturnSale = JSON.parse(JSON.stringify(returnSale));
      return {
        success: true,
        message: "تم إرجاع البيع بنجاح",
        cleanReturnSale,
        returnSubtotal,
        returnTotalCOGS,
        originalSaleAmountDue,
      };
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );
  // unstable_noStore();
  // // Fire non-blocking operations
  // revalidatePath("/sells");

  // Create journal entries with retry
  const refundFromAR = Math.min(
    result.returnSubtotal,
    result.originalSaleAmountDue || 0,
  );
  const refundFromCashBank = result.returnSubtotal - refundFromAR;

  createReturnJournalEntriesWithRetry({
    companyId,
    customerId,
    cashierId,
    returnNumber,
    returnSubtotal: result.returnSubtotal,
    returnTotalCOGS: result.returnTotalCOGS,
    refundFromAR,
    refundFromCashBank,
    returnSaleId: result.cleanReturnSale.id,
    paymentMethod: paymentMethod || "cash",
    reason,
  }).catch((err) =>
    console.error("❌ Return journal entries failed after all retries:", err),
  );

  return result;
}

// ============================================
// 🔄 Return Journal Entries with Retry
// ============================================
async function createReturnJournalEntriesWithRetry(
  data: {
    companyId: string;
    customerId: string;
    cashierId: string;
    returnNumber: string;
    returnSubtotal: number;
    returnTotalCOGS: number;
    refundFromAR: number;
    refundFromCashBank: number;
    returnSaleId: string;
    paymentMethod: "cash" | "bank";
    reason?: string;
  },
  maxRetries = 3,
  retryDelay = 200,
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `📝 Creating return journal entries (attempt ${attempt}/${maxRetries})...`,
      );
      await createReturnJournalEntries(data);
      console.log(
        `✅ Return journal entries created successfully on attempt ${attempt}`,
      );
      return;
    } catch (error: any) {
      lastError = error;
      console.error(
        `❌ Return journal entries attempt ${attempt}/${maxRetries} failed:`,
        error.message,
      );

      if (attempt < maxRetries) {
        const waitTime = retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw new Error(
    `Failed to create return journal entries after ${maxRetries} attempts. Last error: ${lastError?.message}`,
  );
}

// ============================================
// 📊 Optimized Return Journal Entries
// ============================================
export async function createReturnJournalEntries({
  companyId,
  customerId,
  cashierId,
  returnNumber,
  returnSubtotal,
  returnTotalCOGS,
  refundFromAR,
  refundFromCashBank,
  returnSaleId,
  paymentMethod = "cash",
  reason,
}: {
  companyId: string;
  customerId: string;
  cashierId: string;
  returnNumber: string;
  returnSubtotal: number;
  returnTotalCOGS: number;
  refundFromAR: number;
  refundFromCashBank: number;
  returnSaleId: string;
  paymentMethod?: "cash" | "bank";
  reason?: string;
}) {
  // 1️⃣ Fetch mappings and fiscal year in parallel
  const [mappings, fy] = await Promise.all([
    prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
      select: { mapping_type: true, account_id: true },
    }),
    getActiveFiscalYears(),
  ]);

  if (!fy) throw new Error("No active fiscal year");

  // 2️⃣ Create account map
  const accountMap = new Map(
    mappings.map((m) => [m.mapping_type, m.account_id]),
  );

  const getAccountId = (type: string) => {
    const id = accountMap.get(type);
    if (!id && ["sales_revenue", "cogs", "inventory"].includes(type)) {
      throw new Error(`Missing essential GL account mapping: ${type}`);
    }
    return id;
  };

  const revenueAccount = getAccountId("sales_revenue")!;
  const cogsAccount = getAccountId("cogs")!;
  const inventoryAccount = getAccountId("inventory")!;
  const cashAccount = getAccountId("cash");
  const bankAccount = getAccountId("bank");
  const arAccount = getAccountId("accounts_receivable");

  // 3️⃣ Generate entry numbers
  // const year = new Date().getFullYear();
  // const timestamp = Date.now();
  // const entryBase = `JE-${year}-${returnNumber}-${timestamp}-RET`;
  const v_year = new Date().getFullYear();
  let entryCounter = 0;
  const entryBase = () => {
    entryCounter++;
    const ts = Date.now();
    return `JE-${v_year}-${returnNumber}-${ts}-${entryCounter}-RET`;
  };
  // 4️⃣ Build journal entries with base template
  const baseEntry = {
    company_id: companyId,
    entry_date: new Date(),
    is_automated: true,
    fiscal_period: fy.period_name,
    reference_type: "sale_return",
    reference_id: returnSaleId,
    created_by: cashierId,
  };

  const entries: any[] = [
    // Reverse Revenue (Debit)
    {
      ...baseEntry,
      entry_number: entryBase(),
      account_id: revenueAccount,
      description: `إرجاع بيع ${returnNumber}`,
      debit: 0,
      credit: returnSubtotal,
    },
    // Reverse COGS (Credit)
    {
      ...baseEntry,
      entry_number: entryBase(),
      account_id: cogsAccount,
      description: `عكس تكلفة البضاعة المباعة (إرجاع) ${returnNumber}`,
      debit: 0,
      credit: returnTotalCOGS,
    },
    // Increase Inventory (Debit)
    {
      ...baseEntry,
      entry_number: entryBase(),
      account_id: inventoryAccount,
      description: `زيادة مخزون (إرجاع) ${returnNumber}`,
      debit: returnTotalCOGS,
      credit: 0,
    },
  ];

  // 5️⃣ Add refund entries
  if (refundFromAR > 0 && arAccount) {
    entries.push({
      ...baseEntry,
      entry_number: entryBase(),
      account_id: arAccount,
      description: `تخفيض مديونية العميل بسبب إرجاع ${returnNumber}`,
      debit: 0,
      credit: refundFromAR,
      reference_id: customerId || returnSaleId,
      reference_type: "إرجاع",
    });
  }

  if (refundFromCashBank > 0) {
    const refundAccountId =
      paymentMethod === "bank" ? bankAccount : cashAccount;

    if (!refundAccountId) {
      throw new Error(
        `Missing GL account mapping for refund method: ${paymentMethod}`,
      );
    }

    entries.push({
      ...baseEntry,
      entry_number: entryBase(),
      account_id: refundAccountId,
      description: `صرف مبلغ مسترجع للعميل (إرجاع) ${returnNumber}`,
      debit: 0,
      credit: refundFromCashBank,
    });
  }

  // 6️⃣ Insert entries and update balances in transaction
  await prisma.$transaction(async (tx) => {
    // Insert all journal entries
    await tx.journal_entries.createMany({ data: entries });

    // Calculate account balance deltas
    const accountDeltas = new Map<string, number>();
    for (const entry of entries) {
      const delta = (entry.debit || 0) - (entry.credit || 0);
      accountDeltas.set(
        entry.account_id,
        (accountDeltas.get(entry.account_id) || 0) + delta,
      );
    }

    // Update all account balances in parallel
    await Promise.all(
      Array.from(accountDeltas.entries()).map(([accountId, delta]) =>
        tx.accounts.update({
          where: { id: accountId },
          data: { balance: { increment: delta } },
        }),
      ),
    );
  });

  return {
    success: true,
    message: "تم إنشاء قيود اليومية للإرجاع بنجاح",
    entry_number: entries[0]?.entry_number,
  };
}

export async function processCustomerPayment(data: {
  companyId: string;
  customerId: string;
  cashierId: string;
  amount: number;
  paymentMethod: string;
  paymentDate?: Date;
  notes?: string;
  saleIds?: string[]; // Optional: specific sales to apply payment to
}) {
  const {
    companyId,
    customerId,
    cashierId,
    amount,
    paymentMethod,
    paymentDate = new Date(),
    notes,
    saleIds,
  } = data;

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // 1️⃣ Fetch customer and their unpaid/partial sales in parallel
      const [customer, unpaidSales] = await Promise.all([
        tx.customer.findUnique({
          where: { id: customerId, companyId },
          select: {
            id: true,
            name: true,
            outstandingBalance: true,
            balance: true,
          },
        }),
        // Fetch specific sales or all unpaid sales
        tx.sale.findMany({
          where: {
            companyId,
            customerId,
            paymentStatus: { in: ["unpaid", "partial"] },
            ...(saleIds && saleIds.length > 0 && { id: { in: saleIds } }),
          },
          select: {
            id: true,
            saleNumber: true,
            totalAmount: true,
            amountPaid: true,
            amountDue: true,
            paymentStatus: true,
          },
          orderBy: { saleDate: "asc" }, // Pay oldest first
        }),
      ]);

      if (!customer) {
        throw new Error("Customer not found");
      }

      // 2️⃣ Calculate payment allocation
      let remainingPayment = amount;
      const paymentAllocations: Array<{
        saleId: string;
        saleNumber: string;
        amountApplied: number;
        previousDue: number;
        newDue: number;
        newStatus: string;
      }> = [];

      // Allocate payment to sales
      for (const sale of unpaidSales) {
        if (remainingPayment <= 0) break;

        const saleAmountDue = sale.amountDue.toNumber();
        const amountToApply = Math.min(remainingPayment, saleAmountDue);

        if (amountToApply > 0) {
          const newAmountDue = saleAmountDue - amountToApply;
          const newAmountPaid = sale.amountPaid.toNumber() + amountToApply;
          const newStatus =
            newAmountDue <= 0
              ? "paid"
              : newAmountPaid > 0
                ? "partial"
                : "unpaid";

          paymentAllocations.push({
            saleId: sale.id,
            saleNumber: sale.saleNumber,
            amountApplied: amountToApply,
            previousDue: saleAmountDue,
            newDue: newAmountDue,
            newStatus,
          });

          remainingPayment -= amountToApply;
        }
      }

      // 3️⃣ Determine excess payment (goes to customer credit)
      const totalAppliedToSales = amount - remainingPayment;
      const excessAmount = remainingPayment;

      // 4️⃣ Create main payment record
      const payment = await tx.payment.create({
        data: {
          companyId,
          customerId,
          cashierId,
          paymentMethod,
          payment_type: "customer_payment",
          amount,
          status: "completed",
          notes:
            notes ||
            `دفعة من العميل - تطبيق: ${totalAppliedToSales.toFixed(2)}`,
          createdAt: paymentDate,
        },
      });

      // 5️⃣ Update all affected sales in parallel
      const saleUpdatePromises = paymentAllocations.map((allocation) =>
        tx.sale.update({
          where: { id: allocation.saleId },
          data: {
            amountPaid: { increment: allocation.amountApplied },
            amountDue: { decrement: allocation.amountApplied },
            paymentStatus: allocation.newStatus,
          },
        }),
      );

      // 6️⃣ Update customer balance
      const customerUpdateData: any = {};

      if (totalAppliedToSales > 0) {
        customerUpdateData.outstandingBalance = {
          decrement: totalAppliedToSales,
        };
      }

      if (excessAmount > 0) {
        customerUpdateData.balance = { increment: excessAmount };
      }

      const customerUpdatePromise =
        Object.keys(customerUpdateData).length > 0
          ? tx.customer.update({
              where: { id: customerId, companyId },
              data: customerUpdateData,
            })
          : Promise.resolve(null);

      // Execute all updates in parallel
      await Promise.all([...saleUpdatePromises, customerUpdatePromise]);

      return {
        success: true,
        payment,
        paymentAllocations,
        totalAppliedToSales,
        excessAmount,
        customer,
      };
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );

  // 🔄 Create journal entries with retry (non-blocking)
  createPaymentJournalEntriesWithRetry({
    companyId,
    customerId,
    cashierId,
    paymentId: result.payment.id,
    amount,
    paymentMethod,
    totalAppliedToSales: result.totalAppliedToSales,
    excessAmount: result.excessAmount,
    paymentAllocations: result.paymentAllocations,
  }).catch((err) =>
    console.error("❌ Payment journal entries failed after all retries:", err),
  );

  return result;
}

// ============================================
// 🔄 Payment Journal Entries with Retry
// ============================================
async function createPaymentJournalEntriesWithRetry(
  data: {
    companyId: string;
    customerId: string;
    cashierId: string;
    paymentId: string;
    amount: number;
    paymentMethod: string;
    totalAppliedToSales: number;
    excessAmount: number;
    paymentAllocations: any[];
  },
  maxRetries = 3,
  retryDelay = 200,
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `📝 Creating payment journal entries (attempt ${attempt}/${maxRetries})...`,
      );
      await createPaymentJournalEntries(data);
      console.log(
        `✅ Payment journal entries created successfully on attempt ${attempt}`,
      );
      return;
    } catch (error: any) {
      lastError = error;
      console.error(
        `❌ Payment journal entries attempt ${attempt}/${maxRetries} failed:`,
        error.message,
      );

      if (attempt < maxRetries) {
        const waitTime = retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw new Error(
    `Failed to create payment journal entries after ${maxRetries} attempts. Last error: ${lastError?.message}`,
  );
}

// ============================================
// 📊 Optimized Payment Journal Entries
// ============================================
async function createPaymentJournalEntries({
  companyId,
  customerId,
  cashierId,
  paymentId,
  amount,
  paymentMethod,
  totalAppliedToSales,
  excessAmount,
  paymentAllocations,
}: {
  companyId: string;
  customerId: string;
  cashierId: string;
  paymentId: string;
  amount: number;
  paymentMethod: string;
  totalAppliedToSales: number;
  excessAmount: number;
  paymentAllocations: any[];
}) {
  // 1️⃣ Fetch mappings and fiscal year in parallel
  const [mappings, fy] = await Promise.all([
    prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
      select: { mapping_type: true, account_id: true },
    }),
    getActiveFiscalYears(),
  ]);

  if (!fy) {
    console.warn("No active fiscal year - skipping journal entries");
    return;
  }

  // 2️⃣ Create account map
  const accountMap = new Map(
    mappings.map((m) => [m.mapping_type, m.account_id]),
  );

  const getAccountId = (type: string) => accountMap.get(type);

  const cashAccount = getAccountId("cash");
  const bankAccount = getAccountId("bank");
  const arAccount = getAccountId("accounts_receivable");
  const customerCreditAccount = getAccountId("customer_credit"); // For excess

  // Determine payment account (cash or bank)
  const paymentAccountId =
    paymentMethod.toLowerCase() === "bank" ? bankAccount : cashAccount;

  if (!paymentAccountId) {
    throw new Error(
      `Missing GL account mapping for payment method: ${paymentMethod}`,
    );
  }

  if (!arAccount) {
    throw new Error("Missing accounts receivable GL account mapping");
  }

  // 3️⃣ Generate entry number
  const year = new Date().getFullYear();
  const timestamp = Date.now();
  const entryBase = `JE-${year}-PAY-${paymentId.slice(0, 8)}-${timestamp}`;

  // 4️⃣ Build journal entries
  const baseEntry = {
    company_id: companyId,
    entry_date: new Date(),
    is_automated: true,
    fiscal_period: fy.period_name,
    reference_type: "customer_payment",
    reference_id: paymentId,
    created_by: cashierId,
  };

  const entries: any[] = [];

  // Entry 1: Debit Cash/Bank (Money received)
  entries.push({
    ...baseEntry,
    entry_number: `${entryBase}-1`,
    account_id: paymentAccountId,
    description: `استلام دفعة من العميل - ${paymentMethod}`,
    debit: amount,
    credit: 0,
  });

  // Entry 2: Credit AR for amount applied to sales
  if (totalAppliedToSales > 0) {
    entries.push({
      ...baseEntry,
      entry_number: `${entryBase}-2`,
      account_id: arAccount,
      description: `تخفيض المديونية - دفعة عميل`,
      debit: 0,
      credit: totalAppliedToSales,
      reference_id: customerId,
    });
  }

  // Entry 3: Credit Customer Credit for excess amount
  if (excessAmount > 0 && customerCreditAccount) {
    entries.push({
      ...baseEntry,
      entry_number: `${entryBase}-3`,
      account_id: customerCreditAccount,
      description: `رصيد زائد للعميل`,
      debit: 0,
      credit: excessAmount,
      reference_id: customerId,
    });
  }

  // 5️⃣ Insert entries and update balances in transaction
  await prisma.$transaction(async (tx) => {
    // Insert all journal entries
    if (entries.length > 0) {
      await tx.journal_entries.createMany({ data: entries });
    }

    // Calculate account balance deltas
    const accountDeltas = new Map<string, number>();
    for (const entry of entries) {
      const delta = (entry.debit || 0) - (entry.credit || 0);
      accountDeltas.set(
        entry.account_id,
        (accountDeltas.get(entry.account_id) || 0) + delta,
      );
    }

    // Update all account balances in parallel
    if (accountDeltas.size > 0) {
      await Promise.all(
        Array.from(accountDeltas.entries()).map(([accountId, delta]) =>
          tx.accounts.update({
            where: { id: accountId },
            data: { balance: { increment: delta } },
          }),
        ),
      );
    }
  });

  console.log(`✅ Payment journal entries created for payment ${paymentId}`);
}

// ============================================
// 🔄 OPTIMIZED SUPPLIER PAYMENT PROCESSING
// ============================================

/**
 * Process supplier payment with automatic retry for journal entries
 */
export async function processSupplierPayment(data: {
  companyId: string;
  supplierId: string;
  cashierId: string;
  amount: number;
  paymentMethod: string;
  paymentDate?: Date;
  notes?: string;
  purchaseId?: string; // Optional: specific purchase to apply payment to
}) {
  const {
    companyId,
    supplierId,
    cashierId,
    amount,
    paymentMethod,
    paymentDate = new Date(),
    notes,
    purchaseId,
  } = data;

  if (amount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  const result = await prisma.$transaction(
    async (tx) => {
      // 1️⃣ Fetch supplier and optionally specific purchase
      const [supplier, purchases] = await Promise.all([
        tx.supplier.findUnique({
          where: { id: supplierId, companyId },
          select: {
            id: true,
            name: true,
            outstandingBalance: true,
            totalPaid: true,
          },
        }),
        // Fetch specific purchase or all unpaid purchases
        purchaseId
          ? tx.purchase.findMany({
              where: { id: purchaseId, companyId, supplierId },
              select: {
                id: true,
                totalAmount: true,
                amountPaid: true,
                amountDue: true,
                status: true,
              },
            })
          : tx.purchase.findMany({
              where: {
                companyId,
                supplierId,
                status: { in: ["pending", "partial"] },
              },
              select: {
                id: true,
                totalAmount: true,
                amountPaid: true,
                amountDue: true,
                status: true,
              },
              orderBy: { createdAt: "asc" },
            }),
      ]);

      if (!supplier) {
        throw new Error("Supplier not found");
      }

      // 2️⃣ Calculate payment allocation
      let remainingPayment = amount;
      const paymentAllocations: Array<{
        purchaseId: string;
        amountApplied: number;
        previousDue: number;
        newDue: number;
        newStatus: string;
      }> = [];

      for (const purchase of purchases) {
        if (remainingPayment <= 0) break;

        const purchaseAmountDue = purchase.amountDue.toNumber();
        const amountToApply = Math.min(remainingPayment, purchaseAmountDue);

        if (amountToApply > 0) {
          const newAmountDue = purchaseAmountDue - amountToApply;
          const newStatus = newAmountDue <= 0 ? "paid" : "partial";

          paymentAllocations.push({
            purchaseId: purchase.id,
            amountApplied: amountToApply,
            previousDue: purchaseAmountDue,
            newDue: newAmountDue,
            newStatus,
          });

          remainingPayment -= amountToApply;
        }
      }

      const totalAppliedToPurchases = amount - remainingPayment;
      const excessAmount = remainingPayment;

      // 3️⃣ Create supplier payment record
      const payment = await tx.supplierPayment.create({
        data: {
          companyId,
          supplierId,
          purchaseId: purchaseId || null,
          createdBy: cashierId,
          amount,
          paymentMethod,
          paymentDate,
          note:
            notes ||
            `دفعة لمورد - تطبيق: ${totalAppliedToPurchases.toFixed(2)}`,
        },
      });

      // 4️⃣ Update all affected purchases in parallel
      const purchaseUpdatePromises = paymentAllocations.map((allocation) =>
        tx.purchase.update({
          where: { id: allocation.purchaseId },
          data: {
            amountPaid: { increment: allocation.amountApplied },
            amountDue: { decrement: allocation.amountApplied },
            status: allocation.newStatus,
          },
        }),
      );

      // 5️⃣ Update supplier balance
      const supplierUpdatePromise = tx.supplier.update({
        where: { id: supplierId, companyId },
        data: {
          totalPaid: { increment: amount },
          outstandingBalance: { decrement: totalAppliedToPurchases },
        },
      });

      await Promise.all([...purchaseUpdatePromises, supplierUpdatePromise]);

      return {
        success: true,
        payment,
        paymentAllocations,
        totalAppliedToPurchases,
        excessAmount,
        supplier,
      };
    },
    {
      timeout: 20000,
      maxWait: 5000,
    },
  );

  // 🔄 Create journal entries with retry (non-blocking)
  createSupplierPaymentJournalEntriesWithRetry({
    companyId,
    supplierId,
    cashierId,
    paymentId: result.payment.id,
    amount,
    paymentMethod,
    totalAppliedToPurchases: result.totalAppliedToPurchases,
  }).catch((err) =>
    console.error(
      "❌ Supplier payment journal entries failed after all retries:",
      err,
    ),
  );

  return result;
}

// ============================================
// 🔄 Supplier Payment Journal Entries with Retry
// ============================================
async function createSupplierPaymentJournalEntriesWithRetry(
  data: {
    companyId: string;
    supplierId: string;
    cashierId: string;
    paymentId: string;
    amount: number;
    paymentMethod: string;
    totalAppliedToPurchases: number;
  },
  maxRetries = 3,
  retryDelay = 200,
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `📝 Creating supplier payment journal entries (attempt ${attempt}/${maxRetries})...`,
      );
      await createSupplierPaymentJournalEntries(data);
      console.log(
        `✅ Supplier payment journal entries created successfully on attempt ${attempt}`,
      );
      return;
    } catch (error: any) {
      lastError = error;
      console.error(
        `❌ Supplier payment journal entries attempt ${attempt}/${maxRetries} failed:`,
        error.message,
      );

      if (attempt < maxRetries) {
        const waitTime = retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  throw new Error(
    `Failed to create supplier payment journal entries after ${maxRetries} attempts. Last error: ${lastError?.message}`,
  );
}

// ============================================
// 📊 Supplier Payment Journal Entries
// ============================================
async function createSupplierPaymentJournalEntries({
  companyId,
  supplierId,
  cashierId,
  paymentId,
  amount,
  paymentMethod,
  totalAppliedToPurchases,
}: {
  companyId: string;
  supplierId: string;
  cashierId: string;
  paymentId: string;
  amount: number;
  paymentMethod: string;
  totalAppliedToPurchases: number;
}) {
  // 1️⃣ Fetch mappings and fiscal year in parallel
  const [mappings, fy] = await Promise.all([
    prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
      select: { mapping_type: true, account_id: true },
    }),
    getActiveFiscalYears(),
  ]);

  if (!fy) {
    console.warn("No active fiscal year - skipping journal entries");
    return;
  }

  // 2️⃣ Create account map
  const accountMap = new Map(
    mappings.map((m) => [m.mapping_type, m.account_id]),
  );

  const cashAccount = accountMap.get("cash");
  const bankAccount = accountMap.get("bank");
  const apAccount = accountMap.get("accounts_payable");

  const paymentAccountId =
    paymentMethod.toLowerCase() === "bank" ? bankAccount : cashAccount;

  if (!paymentAccountId || !apAccount) {
    throw new Error(
      "Missing required GL account mappings for supplier payment",
    );
  }

  // 3️⃣ Generate entry number
  const year = new Date().getFullYear();
  const timestamp = Date.now();
  const entryBase = `JE-${year}-SUPPAY-${paymentId.slice(0, 8)}-${timestamp}`;

  // 4️⃣ Build journal entries
  const baseEntry = {
    company_id: companyId,
    entry_date: new Date(),
    is_automated: true,
    fiscal_period: fy.period_name,
    reference_type: "supplier_payment",
    reference_id: paymentId,
    created_by: cashierId,
  };

  const entries = [
    // Debit AP (reduce liability)
    {
      ...baseEntry,
      entry_number: `${entryBase}-1`,
      account_id: apAccount,
      description: `دفع لمورد`,
      debit: totalAppliedToPurchases,
      credit: 0,
      reference_id: supplierId,
    },
    // Credit Cash/Bank (money out)
    {
      ...baseEntry,
      entry_number: `${entryBase}-2`,
      account_id: paymentAccountId,
      description: `دفع لمورد - ${paymentMethod}`,
      debit: 0,
      credit: amount,
    },
  ];

  // 5️⃣ Insert entries and update balances in transaction
  await prisma.$transaction(async (tx) => {
    await tx.journal_entries.createMany({ data: entries });

    // Calculate and update balances
    const accountDeltas = new Map<string, number>();
    for (const entry of entries) {
      const delta = (entry.debit || 0) - (entry.credit || 0);
      accountDeltas.set(
        entry.account_id,
        (accountDeltas.get(entry.account_id) || 0) + delta,
      );
    }

    await Promise.all(
      Array.from(accountDeltas.entries()).map(([accountId, delta]) =>
        tx.accounts.update({
          where: { id: accountId },
          data: { balance: { increment: delta } },
        }),
      ),
    );
  });

  console.log(`✅ Supplier payment journal entries created for ${paymentId}`);
}
