import prisma from "@/lib/prisma";

// API route: /api/process-journal-events
export async function GET() {
  try {
    // Pick unprocessed sale journal events
    const events = await prisma.journalEvent.findMany({
      where: {
        processed: false,
        eventType: "sale", // Filter for sale events only
      },
      take: 20, // Process in batches
      orderBy: { createdAt: "asc" }, // Process oldest first
    });

    if (events.length === 0) {
      return Response.json({
        success: true,
        processed: 0,
        message: "No pending sale journal events",
      });
    }

    const results = {
      processed: 0,
      failed: 0,
      errors: [] as any[],
    };

    for (const event of events) {
      try {
        const eventData = event.payload as any;

        // Validate required data
        if (
          !eventData?.companyId ||
          !eventData?.sale ||
          !eventData?.saleItems
        ) {
          throw new Error("Invalid event data structure");
        }

        // Create journal entries for this sale
        await createSaleJournalEntries({
          companyId: eventData.companyId,
          sale: eventData.sale,
          customerId: eventData.customerId,
          saleItems: eventData.saleItems,
          cashierId: eventData.cashierId,
        });

        // Mark as processed
        await prisma.journalEvent.update({
          where: { id: event.id },
          data: {
            processed: true,
            processed_at: new Date(),
            error_message: null,
          },
        });

        results.processed++;
        console.log(
          `✅ Processed journal event ${event.id} for sale ${eventData.sale.id}`,
        );
      } catch (err: any) {
        results.failed++;
        const errorMessage = err.message || "Unknown error";

        console.error(
          `❌ Failed to process journal event ${event.id}:`,
          errorMessage,
        );

        // Update event with error info (but don't mark as processed)

        results.errors.push({
          eventId: event.id,
          error: errorMessage,
        });
      }
    }

    return Response.json({
      success: true,
      ...results,
      message: `Processed ${results.processed} events, ${results.failed} failed`,
    });
  } catch (error: any) {
    console.error("❌ Cron job error:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    );
  }
}

// Helper function to create sale journal entries
async function createSaleJournalEntries({
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

  if (exists) {
    console.log(`🟨 Journal entries already exist for sale ${sale.id}`);
    return;
  }

  // 3️⃣ Calculate COGS
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

  // 4️⃣ Generate JE number safely
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

  // 6️⃣ Payment Status Logic
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
    await tx.journal_entries.createMany({ data: entries });

    const accountDeltas = new Map();
    for (const e of entries) {
      const delta = Number(e.debit) - Number(e.credit);
      accountDeltas.set(
        e.account_id,
        (accountDeltas.get(e.account_id) || 0) + delta,
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
}

// You'll need to implement this function based on your fiscal year logic
async function getActiveFiscalYears() {
  const fiscalYear = await prisma.fiscal_periods.findFirst({
    where: {
      is_active: true,
      start_date: { lte: new Date() },
      end_date: { gte: new Date() },
    },
    select: { period_name: true },
  });
  return fiscalYear;
}
