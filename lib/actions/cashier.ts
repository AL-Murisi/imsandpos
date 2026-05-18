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
import { Prisma, TransactionType } from "@prisma/client";
import { getActiveFiscalYears, validateFiscalYear } from "./fiscalYear";
import { serialize } from "v8";
import { getLatestExchangeRate } from "./currency";
import { SellingUnit } from "../zod";
import { console } from "inspector";
import { stat } from "fs";
import { sendRoleBasedNotification } from "../push-notifications";
import { acquireNotificationDigestLock } from "./notificationDigest";

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
function toBaseQty(
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

type BatchAllocation = {
  batchId: string;
  quantity: number;
};

function buildBatchAllocationNote(
  reason: string | undefined,
  allocations: BatchAllocation[],
) {
  const payload = JSON.stringify({ allocations });
  return reason ? `${reason}\nBATCH_FIFO:${payload}` : `BATCH_FIFO:${payload}`;
}

function parseBatchAllocationNote(note?: string | null): BatchAllocation[] {
  if (!note) return [];
  const marker = "BATCH_FIFO:";
  const idx = note.indexOf(marker);
  if (idx === -1) return [];
  const jsonPart = note.slice(idx + marker.length).trim();
  try {
    const parsed = JSON.parse(jsonPart) as { allocations?: BatchAllocation[] };
    if (!Array.isArray(parsed.allocations)) return [];
    return parsed.allocations
      .filter((a) => a && a.batchId && Number(a.quantity) > 0)
      .map((a) => ({
        batchId: String(a.batchId),
        quantity: Number(a.quantity),
      }));
  } catch {
    return [];
  }
}
export async function generateSaleNumber(companyId: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `-${currentYear}-بيع`;

  // 1. نجلب كل أرقام الفواتير التي تنتهي بنفس الصيغة لهذه الشركة
  const allInvoices = await prisma.invoice.findMany({
    where: {
      companyId,
      sale_type: "SALE",
      invoiceNumber: {
        endsWith: prefix,
      },
    },
    select: {
      invoiceNumber: true,
    },
  });

  let nextNumber = 1;

  if (allInvoices.length > 0) {
    // 2. نستخرج الجزء الرقمي الأول ونحوله إلى أرقام صحيحة
    const sequenceNumbers = allInvoices
      .map((inv) => {
        const parts = inv.invoiceNumber.split("-");
        return parseInt(parts[0], 10);
      })
      .filter((num) => !isNaN(num));

    // 3. نأخذ أكبر رقم موجود ونضيف عليه 1
    if (sequenceNumbers.length > 0) {
      nextNumber = Math.max(...sequenceNumbers) + 1;
    }
  }

  // 4. التنسيق إلى 6 خانات
  const formattedNumber = nextNumber.toString().padStart(6, "0");
  return `${formattedNumber}${prefix}`;
}

export async function generateSaleNumberSafe(
  companyId: string,
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `${currentYear}`;

  // Use a raw query to get the next number atomically
  const result = await prisma.$queryRawUnsafe<{ next_number: bigint }[]>(`
    SELECT COALESCE(
      MAX(CAST(SUBSTRING(invoice_number FROM ${prefix.length + 1}) AS INTEGER)),
      0
    ) + 1 AS next_number
    FROM invoices
    WHERE company_id = '${companyId}'
      AND invoice_number LIKE '${prefix}%'
      AND invoice_number ~ '^${prefix}[0-9]+$'
  `);

  const nextNumber = Number(result[0]?.next_number || 1);
  const formattedNumber = nextNumber.toString().padStart(6, "0");

  return `${formattedNumber}-${prefix}-بيع`;
}

/**
 * Get the next sale number for preview (doesn't reserve it)
 */
export async function getNextSaleNumber(companyId: string): Promise<string> {
  return generateSaleNumberSafe(companyId);
}
export async function getNextVoucherNumber(
  companyId: string,
  type: "RECEIPT" | "PAYMENT",
  tx: any,
): Promise<number> {
  // Generate a unique lock ID based on companyId and type
  const lockId = hashToInt(companyId + type);

  // Acquire advisory lock (automatically released at end of transaction)
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockId})`;

  // Now safely get the max voucher number
  const result = await tx.$queryRaw<Array<{ max_voucher: number | null }>>`
    SELECT COALESCE(MAX(voucher_number), 0) as max_voucher
    FROM financial_transactions
    WHERE company_id = ${companyId}
      AND type = ${type}::"TransactionType"
  `;

  const maxVoucher = result[0]?.max_voucher ?? 0;
  return maxVoucher + 1;
}
function availableQty(inv: {
  stockQuantity: number;
  reservedQuantity: number;
}): number {
  return inv.stockQuantity - inv.reservedQuantity;
}

/** Derive inventory status from live quantities */
function deriveStatus(
  available: number,
  reorderLevel: number,
): "available" | "low" | "out_of_stock" {
  if (available <= 0) return "out_of_stock";
  if (available <= reorderLevel) return "low";
  return "available";
}
// Helper function to convert string to integer for advisory lock
function hashToInt(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
export async function processReturn(data: any, companyId: string) {
  const {
    saleId,
    cashierId,
    customerId,
    branchId,
    accountId,
    financialAccountId,
    returnNumber,
    reason,
    items,
    totalReturn,
    returnToCustomer,
    baseCurrency,
    exchangeRate,
    currency,
    foreignAmount,
    paymentMethod,
    transferNumber,
  } = data;

  const returnItems = items.filter((item: any) => item.quantity > 0);
  if (returnItems.length === 0)
    return { success: false, message: "لم يتم تحديد أي صنف للإرجاع" };

  await validateFiscalYear(companyId);

  // ─────────────────────────────────────────────────────────────
  // PHASE 1: Pre-computation (outside transaction)
  // ─────────────────────────────────────────────────────────────

  // Fetch original sale with all allocations upfront
  const originalSale = await prisma.invoice.findUnique({
    where: { id: saleId, sale_type: "SALE" },
    select: {
      id: true,
      invoiceNumber: true,
      amountDue: true,
      customerId: true,
      customerName: true,
      warehouseId: true,
      items: {
        select: {
          id: true,
          productId: true,
          quantity: true,
          price: true,
          warehouseId: true,
          product: {
            select: { id: true, name: true, sellingUnits: true },
          },
        },
      },
    },
  });

  if (!originalSale) throw new Error("فاتورة البيع غير موجودة");

  const originalSaleAmountDue = Number(originalSale.amountDue || 0);
  const saleItemsMap = new Map(
    originalSale.items.map((item) => [item.productId, item]),
  );

  const returnInvoiceNumber = originalSale.invoiceNumber.replace(
    "بيع",
    "مرتجع",
  );

  // Resolve warehouseIds and validate before transaction
  const resolvedItems = returnItems.map((item: any) => {
    const saleItem = saleItemsMap.get(item.productId);
    const warehouseId =
      item.warehouseId ?? saleItem?.warehouseId ?? originalSale.warehouseId;
    return { ...item, warehouseId };
  });

  // Pre-validate all items
  for (const returnItem of resolvedItems) {
    const saleItem = saleItemsMap.get(returnItem.productId);
    if (!saleItem)
      throw new Error(
        `الصنف ${returnItem.name} غير موجود في فاتورة البيع الأصلية`,
      );
    if (returnItem.quantity > saleItem.quantity.toNumber())
      throw new Error(
        `كمية الإرجاع للصنف ${returnItem.name} أكبر من الكمية المباعة`,
      );

    const sellingUnits = (saleItem.product.sellingUnits as any[]) || [];
    const selectedUnit = sellingUnits.find(
      (u) => u.id === returnItem.selectedUnitId,
    );
    if (!selectedUnit)
      throw new Error(`الوحدة غير صحيحة للصنف ${returnItem.name}`);
  }

  // Pre-fetch ALL allocations in ONE query (the N+1 killer)
  const allSaleItemIds = resolvedItems
    .map((item: any) => saleItemsMap.get(item.productId)?.id)
    .filter(Boolean);

  const allAllocations = await prisma.inventoryAllocation.findMany({
    where: { invoiceItemId: { in: allSaleItemIds } },
    select: { id: true, invoiceItemId: true, batchId: true, quantity: true },
  });

  const allocationsBySaleItemId = new Map<string, typeof allAllocations>();
  for (const alloc of allAllocations) {
    const list = allocationsBySaleItemId.get(alloc.invoiceItemId) ?? [];
    list.push(alloc);
    allocationsBySaleItemId.set(alloc.invoiceItemId, list);
  }

  // Pre-fetch inventories
  const inventories = await prisma.inventory.findMany({
    where: {
      companyId,
      OR: resolvedItems.map((item: any) => ({
        productId: item.productId,
        warehouseId: item.warehouseId,
      })),
    },
  });
  const inventoryMap = new Map(
    inventories.map((inv) => [`${inv.productId}-${inv.warehouseId}`, inv]),
  );

  // Pre-calculate all derived values
  let returnSubtotal =
    typeof totalReturn === "number" && Number.isFinite(totalReturn)
      ? totalReturn
      : 0;

  type ProcessedItem = {
    productId: string;
    name: string;
    quantity: number;
    warehouseId: string;
    quantityInUnits: number;
    saleItem: (typeof originalSale.items)[number];
    inventory: (typeof inventories)[number];
    newStock: number;
    newAvailable: number;
    selectedUnitName: string;
    originalAllocations: typeof allAllocations;
  };

  const processedItems: ProcessedItem[] = [];

  for (const returnItem of resolvedItems) {
    const saleItem = saleItemsMap.get(returnItem.productId)!;
    const sellingUnits = (saleItem.product.sellingUnits as any[]) || [];
    const selectedUnit = sellingUnits.find(
      (u) => u.id === returnItem.selectedUnitId,
    )!;

    const quantityInUnits = toBaseQty(
      returnItem.quantity,
      returnItem.selectedUnitId,
      sellingUnits,
    );

    if (!(typeof totalReturn === "number" && Number.isFinite(totalReturn)))
      returnSubtotal += saleItem.price.toNumber() * returnItem.quantity;

    const inventory = inventoryMap.get(
      `${returnItem.productId}-${returnItem.warehouseId}`,
    );
    if (!inventory)
      throw new Error(
        `لا يوجد مخزون مرتبط بالصنف ${returnItem.name} في المستودع ${returnItem.warehouseId}`,
      );

    const newStock = inventory.stockQuantity + quantityInUnits;
    const newAvailable = availableQty(inventory) + quantityInUnits;

    processedItems.push({
      productId: returnItem.productId,
      name: returnItem.name,
      quantity: returnItem.quantity,
      warehouseId: returnItem.warehouseId,
      quantityInUnits,
      saleItem,
      inventory,
      newStock,
      newAvailable,
      selectedUnitName: selectedUnit.name,
      originalAllocations: allocationsBySaleItemId.get(saleItem.id) ?? [],
    });
  }

  returnSubtotal = Number(returnSubtotal.toFixed(2));

  // Pre-build invoice items data
  const invoiceItemsData = processedItems.map((item) => ({
    companyId,
    productId: item.productId,
    quantity: item.quantity,
    unit: item.selectedUnitName,
    price: item.saleItem.price,
    totalPrice: item.saleItem.price.toNumber() * item.quantity,
    warehouseId: item.warehouseId,
  }));

  // Pre-build stock movements data (referenceId will be set after returnSale creation)
  const stockMovementsData = processedItems.map((item) => ({
    companyId,
    productId: item.productId,
    warehouseId: item.warehouseId,
    userId: cashierId,
    movementType: "مرتجع بيع",
    quantity: item.quantityInUnits,
    reason: reason ?? "مرتجع بيع",
    quantityBefore: item.inventory.stockQuantity,
    quantityAfter: item.newStock,
    referenceType: "مرتجع",
    referenceId: "", // placeholder, set after returnSale creation
    notes: reason || undefined,
  }));

  // ─────────────────────────────────────────────────────────────
  // PHASE 2: Transaction (minimal round trips)
  // ─────────────────────────────────────────────────────────────
  const result = await prisma.$transaction(
    async (tx) => {
      // ── 1. Create return invoice ─────────────────────────────
      const returnSale = await tx.invoice.create({
        data: {
          companyId,
          invoiceNumber: returnInvoiceNumber,
          customerId: originalSale.customerId,
          customerName: originalSale.customerName,
          cashierId,
          branchId,
          warehouseId:
            processedItems[0]?.warehouseId ?? originalSale.warehouseId,
          sale_type: "RETURN_SALE",
          status: returnToCustomer > 0 ? "paid" : "completed",
          totalAmount: returnSubtotal,
          amountPaid: returnToCustomer,
          amountDue: 0,
          currencyCode: currency || baseCurrency,
          exchangeRate,
          foreignAmount: foreignAmount ?? returnSubtotal,
          baseAmount: returnSubtotal,
          items: { create: invoiceItemsData },
        },
        include: { items: true },
      });

      // ── 2. BULK restore inventory batches — SINGLE raw SQL [^12^][^15^]
      // Accumulate total increment per batch across all items
      const batchIncrements = new Map<string, number>();
      for (const item of processedItems) {
        for (const alloc of item.originalAllocations) {
          batchIncrements.set(
            alloc.batchId,
            (batchIncrements.get(alloc.batchId) || 0) + Number(alloc.quantity),
          );
        }
      }

      if (batchIncrements.size > 0) {
        const batchCases = Array.from(batchIncrements.entries())
          .map(
            ([batchId, increment]) =>
              `WHEN id = '${batchId}' THEN remaining_quantity + ${increment}`,
          )
          .join(" ");

        const batchIds = Array.from(batchIncrements.keys())
          .map((id) => `'${id}'`)
          .join(",");

        await tx.$executeRawUnsafe(`
          UPDATE inventory_batches
          SET remaining_quantity = CASE 
            ${batchCases}
            ELSE remaining_quantity
          END
          WHERE id IN (${batchIds})
        `);
      }

      // ── 3. BULK update inventories — SINGLE raw SQL
      const inventoryCases = processedItems
        .map(
          (item) => `
          WHEN (product_id, warehouse_id) = ('${item.productId}', '${item.warehouseId}') 
          THEN '${deriveStatus(item.newAvailable, item.inventory.reorderLevel)}'
        `,
        )
        .join(" ");

      const inventoryKeys = processedItems
        .map((item) => `('${item.productId}', '${item.warehouseId}')`)
        .join(",");

      const stockQtyCases = processedItems
        .map(
          (item) => `
          WHEN (product_id, warehouse_id) = ('${item.productId}', '${item.warehouseId}') 
          THEN stock_quantity + ${item.quantityInUnits}
        `,
        )
        .join(" ");

      await tx.$executeRawUnsafe(`
        UPDATE inventory
        SET 
          stock_quantity = CASE 
            ${stockQtyCases}
            ELSE stock_quantity
          END,
          status = CASE 
            ${inventoryCases}
            ELSE status
          END
        WHERE company_id = '${companyId}'
        AND (product_id, warehouse_id) IN (${inventoryKeys})
      `);

      // ── 4. BULK create reverse allocations — createMany [^14^][^19^]
      const reverseAllocationsData: Prisma.InventoryAllocationCreateManyInput[] =
        [];
      for (let i = 0; i < processedItems.length; i++) {
        const item = processedItems[i];
        const returnInvoiceItem = returnSale.items[i];
        if (!returnInvoiceItem) continue;

        for (const alloc of item.originalAllocations) {
          reverseAllocationsData.push({
            companyId,
            invoiceItemId: returnInvoiceItem.id,
            batchId: alloc.batchId,
            warehouseId: item.warehouseId,
            quantity: alloc.quantity,
            unitCost: item.saleItem.price,
            unitPrice: item.saleItem.price,
            originalAllocationId: alloc.id,
            supplierId: null,
          });
        }
      }

      if (reverseAllocationsData.length > 0) {
        await tx.inventoryAllocation.createMany({
          data: reverseAllocationsData,
        });
      }

      // ── 5. Update stock movement reference IDs and bulk create
      stockMovementsData.forEach((m) => (m.referenceId = returnSale.id));
      await tx.stockMovement.createMany({ data: stockMovementsData });

      // ── 6. Payment + customer balance ──────────────────────
      const voucherNumber = await getNextVoucherNumber(
        companyId,
        "PAYMENT",
        tx,
      );

      const returnAgainstReceivable = Math.min(
        originalSaleAmountDue,
        Math.max(0, returnSubtotal - returnToCustomer),
      );

      if (customerId && returnAgainstReceivable > 0) {
        await tx.customer.update({
          where: { id: customerId, companyId },
          data: {
            outstandingBalance: { decrement: returnAgainstReceivable },
          },
        });
      }

      let transactionId: string | null = null;
      if (returnToCustomer > 0) {
        const payment = await tx.financialTransaction.create({
          data: {
            companyId,
            branchId,
            currencyCode: currency,
            invoiceId: returnSale.id,
            userId: cashierId,
            voucherNumber,
            financialAccountId,
            customerId: originalSale.customerId,
            paymentMethod: paymentMethod || "cash",
            type: "PAYMENT",
            amount: returnToCustomer,
            status: "paid",
            notes:
              reason + (paymentMethod === "bank" ? ` - ${transferNumber}` : ""),
          },
        });
        transactionId = payment.id;
      }

      // ── 7. Journal entry ─────────────────────────────────────
      const mappings = await tx.account_mappings.findMany({
        where: { company_id: companyId, is_default: true },
        select: { mapping_type: true, account_id: true },
      });
      const accountMap = new Map(
        mappings.map((m) => [m.mapping_type, m.account_id]),
      );
      const cash = accountMap.get("cash");
      const ar = accountMap.get("accounts_receivable");
      const revenue = accountMap.get("sales_revenue");
      const inventoryAcc = accountMap.get("inventory");
      const cogs = accountMap.get("cogs");

      if (!cash || !ar || !revenue || !inventoryAcc || !cogs)
        throw new Error(
          "Missing required account mappings for return sales journal entry",
        );

      const entryNumber = `RET-${new Date().getFullYear()}-${voucherNumber}`;
      const referenceId = returnSale.id;
      const desc = `مرتجع بيع: ${returnSale.invoiceNumber} / original ${originalSale.invoiceNumber}${paymentMethod === "bank" ? ` - ${transferNumber}` : ""}`;

      const isForeign =
        currency &&
        baseCurrency &&
        currency !== baseCurrency &&
        exchangeRate &&
        exchangeRate !== 1;

      const createLine = (
        accountId: string,
        memo: string,
        debitBase: number,
        creditBase: number,
        useForeign: boolean,
      ) => {
        const baseValue = debitBase > 0 ? debitBase : creditBase;
        return {
          companyId,
          accountId,
          debit: debitBase,
          credit: creditBase,
          memo,
          ...(useForeign
            ? {
                currencyCode: currency,
                exchangeRate,
                foreignAmount: Number((baseValue / exchangeRate).toFixed(2)),
                baseAmount: baseValue,
              }
            : { currencyCode: baseCurrency }),
        };
      };

      const journalLines: any[] = [
        createLine(revenue, desc, returnSubtotal, 0, !!isForeign),
      ];

      if (returnToCustomer > 0)
        journalLines.push(
          createLine(
            accountId,
            `${desc} - refund`,
            0,
            returnToCustomer,
            !!isForeign,
          ),
        );

      if (returnAgainstReceivable > 0)
        journalLines.push(
          createLine(
            ar,
            `${desc} - receivable reversal`,
            0,
            returnAgainstReceivable,
            !!isForeign,
          ),
        );

      await tx.journalHeader.create({
        data: {
          companyId,
          entryNumber,
          description: desc,
          branchId,
          referenceType: "ارجاع مبيعات",
          referenceId,
          entryDate: new Date(),
          status: "POSTED",
          createdBy: cashierId,
          lines: {
            create: journalLines.map((line) => ({ ...line, companyId })),
          },
        },
      });

      return {
        success: true,
        message: "تمت معالجة المرتجع بنجاح",
        returnSale: JSON.parse(JSON.stringify(returnSale)),
        returnSubtotal,
        originalSaleAmountDue,
      };
    },
    { timeout: 20000, maxWait: 5000 },
  );

  // ─────────────────────────────────────────────────────────────
  // PHASE 3: Side effects (outside transaction)
  // ─────────────────────────────────────────────────────────────
  revalidatePath("/salesDashboard");
  return result;
}
/** Compute available qty — never read from DB column */

export async function processSale(data: any, companyId: string) {
  const {
    cart,
    totalBeforeDiscount,
    totalDiscount,
    currency,
    totalAfterDiscount,
    cashierId,
    baseCurrency,
    branchId,
    customer,
    guestCustomerName,
    saleNumber,
    exchangeRate,
    baseAmount,
    receivedAmount,
  } = data;

  // ─────────────────────────────────────────────────────────────
  // PHASE 1: Pre-computation (outside transaction)
  // ─────────────────────────────────────────────────────────────
  await validateFiscalYear(companyId);

  let currentSaleNumber =
    typeof saleNumber === "string" ? saleNumber.trim() : "";

  // Pre-compute base quantities for all cart items
  const cartWithBaseQty = cart.map((item: any) => ({
    ...item,
    baseQty: toBaseQty(
      item.selectedQty,
      item.selectedUnitId,
      item.sellingUnits,
    ),
    inventoryKey: `${item.id}-${item.warehouseId}`,
  }));

  const invId = cartWithBaseQty.map((item: any) => ({
    productId: item.id,
    warehouseId: item.warehouseId,
  }));

  // Pre-build invoice items data (moved outside transaction)
  const invoiceItemsData = cartWithBaseQty.map((item: any) => ({
    companyId,
    productId: item.id,
    unit: item.selectedUnitName,
    quantity: item.selectedQty,
    price: item.selectedUnitPrice,
    discountAmount: totalDiscount || 0,
    totalPrice: item.selectedQty * item.selectedUnitPrice,
    warehouseId: item.warehouseId,
  }));
  let status: string;
  if (baseAmount >= totalAfterDiscount) status = "paid";
  else if (baseAmount > 0) status = "partial";
  else status = "unpaid";
  // ── 4. Sale number + voucher ─────────────────────────────
  let effectiveSaleNumber = currentSaleNumber;
  if (!effectiveSaleNumber || effectiveSaleNumber.startsWith("OFFLINE-"))
    effectiveSaleNumber = await generateSaleNumber(companyId);

  for (let txAttempt = 0; txAttempt < 5; txAttempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          // ── 1. Status ────────────────────────────────────────────
          const voucherNumber = await getNextVoucherNumber(
            companyId,
            "RECEIPT",
            tx,
          );

          // ── 2. Fetch inventory for all cart items ────────────────
          const inventoryUnits = await tx.inventory.findMany({
            where: { companyId, OR: invId },
            select: {
              id: true,
              reorderLevel: true,
              productId: true,
              warehouseId: true,
              stockQuantity: true,
              reservedQuantity: true,
            },
          });

          const invMap = new Map(
            inventoryUnits.map((i) => [`${i.productId}-${i.warehouseId}`, i]),
          );

          // ── 3. Validate stock ────────────────────────────────────
          for (const item of cartWithBaseQty) {
            const inventory = invMap.get(item.inventoryKey);
            if (!inventory)
              throw new Error(`المنتج ${item.name} غير متوفر في هذا المستودع`);

            const available = availableQty(inventory);
            if (item.baseQty > available)
              throw new Error(
                `كمية غير كافية للمنتج: ${item.name}. المتوفر: ${available}، المطلوب: ${item.baseQty}`,
              );
          }

          const baseAmountDue = Math.max(0, totalAfterDiscount - baseAmount);

          const paymentData =
            baseAmount > 0
              ? {
                  companyId,
                  userId: cashierId,
                  branchId,
                  customerId: customer?.id,
                  voucherNumber,
                  currencyCode: currency,
                  exchangeRate,
                  paymentMethod: "cash",
                  type: TransactionType.RECEIPT,
                  amount: receivedAmount,
                  status: "paid",
                  notes: `دفعة مبيعات للفاتورة رقم: ${effectiveSaleNumber}`,
                }
              : undefined;

          // ── 5. Build invoice items (already done outside) ────────

          // ── 6. Create invoice (include items to get their IDs) ───
          const sale = await tx.invoice.create({
            data: {
              companyId,
              invoiceNumber: effectiveSaleNumber,
              customerId: customer?.id,
              customerName: customer?.name || guestCustomerName || null,
              cashierId,
              branchId,
              sale_type: "SALE",
              status,
              totalAmount: totalAfterDiscount,
              amountPaid: baseAmount,
              warehouseId: cart[0]?.warehouseId ?? null,
              amountDue: baseAmountDue,
              items: { create: invoiceItemsData },
              transactions: { create: paymentData },
            },
            include: { items: true },
          });

          const entryNumber =
            baseAmount > 0
              ? `SALE-${new Date().getFullYear()}-${voucherNumber}`
              : `SALE-${new Date().getFullYear()}-${sale.invoiceNumber}`;

          // ── 7. FIFO Batch Allocation + Inventory Deduction ───────
          const stockMovementsData: any[] = [];
          const allocationRows: Prisma.InventoryAllocationCreateManyInput[] =
            [];
          const inventoryIds = inventoryUnits.map((inv) => inv.id);

          // Fetch ALL batches in one query (already optimal)
          const allBatches = await tx.inventoryBatch.findMany({
            where: {
              inventoryId: { in: inventoryIds },
              remainingQuantity: { gt: 0 },
            },
            orderBy: { receivedAt: "asc" }, // FIFO
            select: {
              id: true,
              inventoryId: true,
              remainingQuantity: true,
              costPrice: true,
              supplierId: true,
            },
          });

          // Group batches by inventory (already optimal)
          const batchesByInventoryId = new Map<
            string,
            {
              id: string;
              remainingQuantity: number;
              costPrice: Prisma.Decimal;
              supplierId: string | null;
            }[]
          >();

          for (const batch of allBatches) {
            const list = batchesByInventoryId.get(batch.inventoryId) ?? [];
            list.push({
              id: batch.id,
              remainingQuantity: Number(batch.remainingQuantity),
              costPrice: batch.costPrice,
              supplierId: batch.supplierId,
            });
            batchesByInventoryId.set(batch.inventoryId, list);
          }

          // Track batch deductions for bulk update
          const batchDeductions = new Map<string, number>(); // batchId -> total deducted

          for (const item of cartWithBaseQty) {
            const inventory = invMap.get(item.inventoryKey)!;
            const baseQty = item.baseQty;

            // Find the matching InvoiceItem
            const saleItem = sale.items.find(
              (si) =>
                si.productId === item.id && si.warehouseId === item.warehouseId,
            );
            if (!saleItem)
              throw new Error(`فشل ربط بند الفاتورة للمنتج ${item.name}`);

            // FIFO batch allocation (same logic, but accumulate deductions)
            const batches = batchesByInventoryId.get(inventory.id) ?? [];
            let remaining = baseQty;

            for (const batch of batches) {
              if (remaining <= 0) break;

              const take = Math.min(batch.remainingQuantity, remaining);
              remaining -= take;
              batch.remainingQuantity -= take; // Deduct locally for next items

              // Accumulate deduction for this batch
              batchDeductions.set(
                batch.id,
                (batchDeductions.get(batch.id) || 0) + take,
              );

              allocationRows.push({
                companyId,
                invoiceItemId: saleItem.id,
                batchId: batch.id,
                warehouseId: item.warehouseId,
                supplierId: batch.supplierId,
                quantity: take,
                unitCost: batch.costPrice,
                unitPrice: item.selectedUnitPrice,
              });
            }

            if (remaining > 0)
              throw new Error(
                `المخزون غير كافٍ في الباتشات للمنتج ${item.name}`,
              );

            // Stock movement (aggregate per cart line)
            stockMovementsData.push({
              companyId,
              productId: item.id,
              warehouseId: item.warehouseId,
              userId: cashierId,
              movementType: "صادر بيع",
              quantity: baseQty,
              quantityBefore: inventory.stockQuantity,
              quantityAfter: inventory.stockQuantity - baseQty,
              referenceType: "فاتورة مبيعات",
              referenceId: sale.id,
              notes: "بيع",
            });
          }

          // BULK UPDATE all batches — SINGLE raw SQL query
          if (batchDeductions.size > 0) {
            const batchCases = Array.from(batchDeductions.entries())
              .map(
                ([batchId, deducted]) =>
                  `WHEN id = '${batchId}' THEN remaining_quantity - ${deducted}`,
              )
              .join(" ");

            const batchIds = Array.from(batchDeductions.keys())
              .map((id) => `'${id}'`)
              .join(",");

            await tx.$executeRawUnsafe(`
              UPDATE inventory_batches
              SET remaining_quantity = CASE 
                ${batchCases}
                ELSE remaining_quantity
              END
              WHERE id IN (${batchIds})
            `);
          }

          // BULK UPDATE all inventories — SINGLE raw SQL query
          const inventoryCases = cartWithBaseQty
            .map((item: any) => {
              const inventory = invMap.get(item.inventoryKey)!;
              const newAvailable = availableQty(inventory) - item.baseQty;
              return `
                WHEN (product_id, warehouse_id) = ('${item.id}', '${item.warehouseId}') 
                THEN '${deriveStatus(newAvailable, inventory.reorderLevel)}'
              `;
            })
            .join(" ");

          const inventoryKeys = cartWithBaseQty
            .map((item: any) => `('${item.id}', '${item.warehouseId}')`)
            .join(",");

          await tx.$executeRawUnsafe(`
            UPDATE inventory
            SET 
              stock_quantity = stock_quantity - CASE 
                ${cartWithBaseQty
                  .map(
                    (item: any) => `
                  WHEN (product_id, warehouse_id) = ('${item.id}', '${item.warehouseId}') 
                  THEN ${item.baseQty}
                `,
                  )
                  .join(" ")}
                ELSE 0
              END,
              status = CASE 
                ${inventoryCases}
                ELSE status
              END
            WHERE company_id = '${companyId}'
            AND (product_id, warehouse_id) IN (${inventoryKeys})
          `);

          // Bulk insert stock movements and allocations (already optimal)
          await Promise.all([
            tx.stockMovement.createMany({ data: stockMovementsData }),
            allocationRows.length
              ? tx.inventoryAllocation.createMany({ data: allocationRows })
              : Promise.resolve({ count: 0 }),
          ]);

          // ── 8. Customer balance ──────────────────────────────────
          // (kept empty as in original)

          // ── 9. Journal entry ─────────────────────────────────────
          const mappings = await tx.account_mappings.findMany({
            where: { company_id: companyId, is_default: true },
            select: { mapping_type: true, account_id: true },
          });

          const accountMap = new Map(
            mappings.map((m) => [m.mapping_type, m.account_id]),
          );
          const cash = accountMap.get("cash");
          const ar = accountMap.get("accounts_receivable");
          const revenue = accountMap.get("sales_revenue");
          const inventoryAcc = accountMap.get("inventory");
          const cogs = accountMap.get("cogs");

          if (!cash || !ar || !revenue || !inventoryAcc || !cogs)
            throw new Error(
              "Missing required account mappings for sales journal entry",
            );

          const isForeign =
            currency &&
            baseCurrency &&
            currency !== baseCurrency &&
            exchangeRate &&
            exchangeRate !== 1;

          const createLine = (
            accountId: string,
            memo: string,
            debitBase: number,
            creditBase: number,
            useForeign: boolean,
          ) => {
            const baseValue = debitBase > 0 ? debitBase : creditBase;
            return {
              companyId,
              accountId,
              debit: debitBase,
              credit: creditBase,
              memo,
              ...(useForeign
                ? {
                    currencyCode: currency,
                    exchangeRate,
                    foreignAmount: Number(
                      (baseValue / exchangeRate).toFixed(2),
                    ),
                    baseAmount: baseValue,
                  }
                : { currencyCode: baseCurrency }),
            };
          };

          const totalBase = Number(totalAfterDiscount);
          const paidBase = Number(baseAmount);
          const dueBase = Math.max(0, totalBase - paidBase);
          const lines: any[] = [];

          if (status === "paid") {
            lines.push(
              createLine(revenue, entryNumber, 0, totalBase, !!isForeign),
              createLine(cash, entryNumber, paidBase, 0, !!isForeign),
            );
          } else if (status === "partial") {
            if (paidBase > 0)
              lines.push(
                createLine(
                  cash,
                  `${entryNumber} - cash`,
                  paidBase,
                  0,
                  !!isForeign,
                ),
              );
            lines.push(
              createLine(revenue, entryNumber, 0, totalBase, !!isForeign),
              createLine(ar, `${entryNumber} - due`, dueBase, 0, !!isForeign),
            );
          } else {
            lines.push(
              createLine(revenue, entryNumber, 0, totalBase, !!isForeign),
              createLine(ar, entryNumber, totalBase, 0, !!isForeign),
            );
          }

          await tx.journalHeader.create({
            data: {
              companyId,
              entryNumber,
              description: `Sales invoice: ${sale.invoiceNumber}`,
              branchId,
              referenceType: "فاتورة مبيعات",
              referenceId: sale.id,
              entryDate: new Date(),
              status: "POSTED",
              createdBy: cashierId,
              lines: {
                create: lines.map((line) => ({ ...line, companyId })),
              },
            },
          });
          revalidatePath("/cashiercontrol");
          return { message: "Sale processed successfully", saleId: sale.id };
        },
        { timeout: 20000, maxWait: 5000 },
      );
    } catch (error: any) {
      if (error?.code !== "P2002" || txAttempt === 4) throw error;
      currentSaleNumber = await generateSaleNumber(companyId);
    }
  }

  throw new Error("Failed to process sale after retries");
}
function getExpiryStatus(expiryDateInput: string | Date) {
  const now = new Date();
  const expiryDate = new Date(expiryDateInput);
  const diffMs = expiryDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    isExpired: daysLeft < 0,
    isExpiringSoon: daysLeft >= 0 && daysLeft <= 30,
    daysLeft,
  };
}
const sentDigestsThisProcess = new Set<string>();

export async function getAllActiveProductsForSale(
  where: Prisma.ProductWhereInput,
  companyId: string,
  warehouse?: string,
  searchQuery?: string,
) {
  const combinedWhere: Prisma.ProductWhereInput = {
    ...where,
    companyId,
    isActive: true,
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
        sellingUnits: true,

        barcode: true,

        inventory: {
          where: {
            stockQuantity: { gt: 0 },
          },
          select: {
            id: true,
            stockQuantity: true,
            reservedQuantity: true,
            warehouse: {
              select: {
                id: true,
                name: true,
              },
            },

            batches: {
              select: {
                remainingQuantity: true,
                expiredAt: true,
                costPrice: true,
              },
              orderBy: {
                expiredAt: "asc",
              },
            },
          },
        },
      },

      take: 100,
    }),
    prisma.warehouse.findMany({ select: { id: true, name: true } }),
  ]);

  const warehouseMap = new Map(warehouses.map((w) => [w.id, w.name]));

  const expiringSoon: string[] = [];
  const expiredAlready: string[] = [];

  activeProducts.forEach((product) => {
    // 1. Iterate through each inventory record for this product
    product.inventory.forEach((inv) => {
      // 2. Iterate through each batch in that inventory
      inv.batches.forEach((batch) => {
        if (!batch.remainingQuantity || Number(batch.remainingQuantity) <= 0) {
          return;
        }
        // Ensure the batch has an expiry date
        if (batch.expiredAt) {
          const status = getExpiryStatus(new Date(batch.expiredAt));

          if (status.isExpired) {
            // You might want to include the batch info or warehouse name here
            expiredAlready.push(product.name);
          } else if (status.isExpiringSoon) {
            expiringSoon.push(product.name);
          }
        }
      });
    });
  });
  // إرسال إشعار واحد ملخص في الخلفية بدون await
  if (expiredAlready.length > 0 || expiringSoon.length > 0) {
    const totalIssues = expiredAlready.length + expiringSoon.length;
    const bodyText = [
      expiredAlready.length > 0 ? `منتهية (${expiredAlready.length})` : "",
      expiringSoon.length > 0
        ? `توشك على الانتهاء (${expiringSoon.length})`
        : "",
    ]
      .filter(Boolean)
      .join(" و ");

    const digestKey = [
      `expired:${[...new Set(expiredAlready)].sort().join("|")}`,
      `soon:${[...new Set(expiringSoon)].sort().join("|")}`,
    ].join(";");
    const digestType = "expiry-summary";
    const digestCacheKey = `${companyId}:${digestType}:${digestKey}`;
    if (sentDigestsThisProcess.has(digestCacheKey)) {
      return; // Already sent in this process instance
    }

    const acquired = await acquireNotificationDigestLock(
      companyId,
      digestType,
      digestKey,
    );
    if (acquired) {
      sentDigestsThisProcess.add(digestCacheKey);
      // لا نستخدم await هنا لكي لا ينتظر الكاشير
      void sendRoleBasedNotification(
        { companyId, targetRoles: ["admin", "cashier", "manager_wh"] },
        {
          title: "⚠️ تنبيه صلاحية المنتجات",
          body: `يوجد ${totalIssues} منتجات تحتاج انتباهك: ${bodyText}`,
          url: "/batches?expiryStatus=expired",
          tag: `expiry-summary-${companyId}-${new Date().toISOString().split("T")[0]}`,
        },
      ).catch((err) => console.error("Notification Error:", err));
    }
  }

  // Return one entry per product-inventory (so same product in different warehouses appears separately)
  return activeProducts
    .flatMap((product) => {
      const sellingUnits = (product.sellingUnits as SellingUnit[]) || [];
      if (!product.inventory || product.inventory.length === 0) return [];

      return product.inventory.map((inv) => {
        const availableQuantity = inv.stockQuantity - inv.reservedQuantity;
        const baseStock = availableQuantity || 0;
        const availableStock: Record<string, number> = {};

        sellingUnits.forEach((unit) => {
          if (unit.unitsPerParent > 0) {
            availableStock[unit.id] = Math.floor(
              baseStock / unit.unitsPerParent,
            );
          } else {
            availableStock[unit.id] = unit.isBase ? baseStock : 0;
          }
        });

        return {
          id: product.id,
          name: product.name,
          sku: product.sku,
          sellingUnits,
          availableStock,
          warehouseId: inv.warehouse.id,
          warehousename: warehouseMap.get(inv.warehouse.id) ?? "",
          barcode: product.barcode ?? "",
        };
      });
    })
    .filter(Boolean) as any[];
}
