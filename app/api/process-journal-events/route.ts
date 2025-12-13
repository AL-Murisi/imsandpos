import prisma from "@/lib/prisma";

// API route: /api/process-journal-events
export async function GET() {
  try {
    // Pick unprocessed sale journal events
    const events = await prisma.journalEvent.findMany({
      where: {
        processed: false,
        eventType: { in: ["sale", "return"] }, // Filter for sale events only
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
      sales: 0,
      returns: 0,
      errors: [] as any[],
    };

    for (const event of events) {
      try {
        const eventData = event.payload as any;

        // Validate required data

        // Create journal entries for this sale
        if (event.eventType === "sale") {
          if (!eventData?.sale || !eventData?.saleItems) {
            throw new Error("Invalid sale event data structure");
          }

          await createSaleJournalEntries({
            companyId: eventData.companyId,
            sale: eventData.sale,
            customerId: eventData.customerId,
            saleItems: eventData.saleItems,
            cashierId: eventData.cashierId,
          });

          results.sales++;
          console.log(
            `✅ Processed sale journal event ${event.id} for sale ${eventData.sale.id}`,
          );
        } else if (event.eventType === "return") {
          await createReturnJournalEntries({
            companyId: eventData.companyId,
            customerId: eventData.customerId,
            cashierId: eventData.cashierId,
            returnNumber: eventData.returnNumber,
            returnSubtotal: eventData.returnSubtotal,
            returnTotalCOGS: eventData.returnTotalCOGS,
            refundFromAR: eventData.refundFromAR,
            refundFromCashBank: eventData.refundFromCashBank,
            returnSaleId: eventData.returnSaleId,
            paymentMethod: eventData.paymentMethod || "cash",
            reason: eventData.reason,
          });

          results.returns++;
          console.log(
            `✅ Processed return journal event ${event.id} for return ${eventData.returnSaleId}`,
          );
        }

        // Mark as processed
        await prisma.journalEvent.update({
          where: { id: event.id },
          data: {
            processed: true,
            status: "processed",
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
async function createReturnJournalEntries({
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
    reference_type: "إرجاع بيع ",
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
      description: reason ?? `زيادة مخزون (إرجاع) ${returnNumber}`,
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

    const accountIds = [...new Set(entries.map((e) => e.account_id))];
    const accounts = await tx.accounts.findMany({
      where: { id: { in: accountIds } },
      select: { id: true, account_type: true },
    });

    const accountTypeMap = new Map(accounts.map((a) => [a.id, a.account_type]));
    const accountDeltas = new Map();
    for (const e of entries) {
      const accountType = accountTypeMap.get(e.account_id);
      let delta = 0;

      // Determine delta based on account type and normal balance
      // Assets, Expenses, COGS: Debit increases, Credit decreases
      // Liabilities, Equity, Revenue: Credit increases, Debit decreases
      if (
        ["asset", "expense", "cogs"].includes(accountType?.toLowerCase() || "")
      ) {
        delta = Number(e.debit) - Number(e.credit);
      } else {
        // Revenue, liability, equity accounts
        delta = Number(e.credit) - Number(e.debit);
      }

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
      is_closed: false,
      start_date: { lte: new Date() },
      end_date: { gte: new Date() },
    },
    select: { period_name: true },
  });
  return fiscalYear;
}
