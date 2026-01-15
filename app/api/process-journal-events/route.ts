import prisma from "@/lib/prisma";
import { fi } from "date-fns/locale";
import { Currency } from "lucide-react";

// API route: /api/process-journal-events
export async function GET() {
  try {
    // Pick unprocessed sale journal events
    const events = await prisma.journalEvent.findMany({
      where: {
        processed: false,
        eventType: {
          in: [
            "sale",
            "return",
            "payment",
            "purchase",
            "purchase-payment",
            "createCutomer",
            "createsupplier",
            "expense",
            "payment-outstanding",
            "manual-journal",
            "fiscal-year-close", // 👈 NEW
            "fiscal-year-open", // 👈 NEW
          ],
        }, // Filter for sale events only
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
      payments: 0,
      purchase: 0,
      purchase_payment: 0,
      createCutomer: 0,
      createsupplier: 0,
      expenses: 0,
      manualjournal: 0,
      fiscal_close: 0, // 👈 NEW
      fiscal_open: 0,
      errors: [] as any[],
    };

    for (const event of events) {
      let success = false;
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
            returnTotalCOGS: eventData.returnTotalCOGS,
          });

          results.sales++;
          console.log(
            `✅ Processed sale journal event ${eventData.sale} for sale ${eventData.sale.id}`,
          );
        } else if (event.eventType === "return") {
          await createReturnJournalEntries({
            companyId: eventData.companyId,
            customerId: eventData.customerId,
            cashierId: eventData.cashierId,
            returnNumber: eventData.returnNumber,
            returnToCustomer: eventData.returnToCustomer,
            returnTotalCOGS: eventData.returnTotalCOGS,
            refundFromAR: eventData.refundFromAR,
            refundFromCashBank: eventData.refundFromCashBank,
            returnSaleId: eventData.returnSaleId,
            paymentMethod: eventData.paymentMethod || "cash",
            reason: eventData.reason,
            branchId: eventData.branchId,
          });

          results.returns++;
          console.log(
            `✅ Processed return journal event ${event.id} for return ${eventData.returnSaleId}`,
          );
        } else if (event.eventType === "payment") {
          await createPaymentJournalEntries({
            companyId: eventData.companyId,
            payment: eventData.payment,
            cashierId: eventData.cashierId,
          });
        } else if (event.eventType === "purchase") {
          await createPurchaseJournalEntries({
            purchase: eventData.purchase,
            companyId: eventData.companyId,
            userId: eventData.userId,
            type: eventData.type,
            currencyCode: eventData.currencyCode,
            branchId: eventData.branchId,
            paymentDetails: eventData.paymentDetails,
          });
          results.purchase++;
        } else if (event.eventType === "purchase-payment") {
          await createSupplierPaymentJournalEntries({
            payment: eventData.supplierPayment,
            companyId: eventData.companyId,
            userId: eventData.userId,
            paymentDetails: eventData.paymentDetails,
          });
          results.purchase_payment++;
        } else if (event.eventType === "createCutomer") {
          await createCustomerJournalEnteries({
            customerId: eventData.customerId,
            companyId: eventData.companyId,
            outstandingBalance: eventData.outstandingBalance,
            balance: eventData.balance,
            createdBy: eventData.createdBy,
          });
          results.createCutomer++;
        } else if (event.eventType === "payment-outstanding") {
          await createOutstandingPaymentJournalEntries({
            companyId: eventData.companyId,
            payment: eventData.payment,
            cashierId: eventData.cashierId,
          });
        } else if (event.eventType === "createsupplier") {
          await createSupplierJournalEnteries({
            supplierId: eventData.supplierId,
            supplierName: eventData.name,
            companyId: eventData.companyId,
            outstandingBalance: eventData.outstandingBalance,
            totalPaid: eventData.totalPaid,
            totalPurchased: eventData.totalPurchased,
            createdBy: eventData.createdBy,
          });
          results.createCutomer++;
        } else if (event.eventType === "expense") {
          await createExpenseJournalEntries({
            companyId: eventData.companyId,
            expense: eventData.expense,
            userId: eventData.userId,
          });

          results.expenses = (results.expenses || 0) + 1;
        } else if (event.eventType === "manual-journal") {
          await createManualJournalEntriesFromEvent(event.payload);
          results.manualjournal = (results.manualjournal || 0) + 1;
        } else if (event.eventType === "fiscal-year-close") {
          await processFiscalYearClose({
            companyId: eventData.companyId,
            fiscalPeriod: eventData.fiscalPeriod,
            closingDate: new Date(eventData.closingDate),
            accounts: eventData.accounts,
            userId: eventData.userId,
          });
          results.fiscal_close++;
          console.log(`✅ Processed fiscal year close event ${event.id}`);
        }

        // 🆕 FISCAL YEAR OPENING
        else if (event.eventType === "fiscal-year-open") {
          await processFiscalYearOpen({
            companyId: eventData.companyId,
            openingDate: new Date(eventData.openingDate),
            accounts: eventData.accounts,
            customers: eventData.customers,
            suppliers: eventData.suppliers,
            userId: eventData.userId,
          });
          results.fiscal_open++;
          console.log(`✅ Processed fiscal year open event ${event.id}`);
        }
        success = true;
        // Mark as processed
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
      if (success) {
        await prisma.journalEvent.update({
          where: { id: event.id },
          data: {
            processed: true,
            status: "processed",
          },
        });

        results.processed++;
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
async function createManualJournalEntriesFromEvent(payload: any) {
  const { companyId, generalDescription, entries } = payload;

  const fiscalYear = await prisma.fiscal_periods.findFirst({
    where: {
      is_closed: false,
      start_date: { lte: new Date() },
      end_date: { gte: new Date() },
    },
    select: { period_name: true },
  });

  await prisma.$transaction(async (tx) => {
    // 1️⃣ insert journal entries
    await tx.journal_entries.createMany({
      data: entries.map((e: any) => ({
        company_id: companyId,
        entry_number: e.entry_number,
        account_id: e.account_id,
        description: e.description || generalDescription,
        debit: Number(e.debit || 0),
        credit: Number(e.credit || 0),
        entry_date: new Date(e.entry_date),
        fiscal_period: fiscalYear?.period_name || null,
        reference_type: e.reference_type,
        reference_id: e.reference_id,
        branch_id: e.branch_id,
        created_by: e.created_by,
        is_automated: false,
      })),
    });

    // 2️⃣ update accounts + customer + supplier
    for (const e of entries) {
      const account = await tx.accounts.findUnique({
        where: { id: e.account_id },
        select: { account_type: true },
      });
      if (!account) continue;

      const debit = Number(e.debit || 0);
      const credit = Number(e.credit || 0);

      const delta = ["asset", "expense", "cogs"].includes(
        account.account_type?.toLowerCase() || "",
      )
        ? debit - credit
        : credit - debit;

      await tx.accounts.update({
        where: { id: e.account_id },
        data: { balance: { increment: delta } },
      });

      if (e.customer_id) {
        await tx.customer.update({
          where: { id: e.customer_id },
          data: {
            outstandingBalance: { increment: debit - credit },
          },
        });
      }

      if (e.supplier_id) {
        await tx.supplier.update({
          where: { id: e.supplier_id },
          data: {
            outstandingBalance: { increment: credit - debit },
          },
        });
      }
    }
  });
}

async function createSupplierJournalEnteries({
  supplierId,
  supplierName,
  companyId,
  outstandingBalance = 0,
  totalPaid = 0,
  totalPurchased = 0,
  createdBy,
}: {
  supplierId: string;
  supplierName: string;
  companyId: string;
  outstandingBalance?: number;
  totalPaid?: number;
  totalPurchased?: number;
  createdBy: string;
}) {
  // 🔎 Fetch default mappings
  const mappings = await prisma.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
  });

  const getAcc = (type: string) =>
    mappings.find((m) => m.mapping_type === type)?.account_id;

  const payable = getAcc("accounts_payable");
  const receivable = getAcc("accounts_receivable");

  // Generate entry number
  const year = new Date().getFullYear();
  const seq = Date.now().toString().slice(-6); // quick unique number
  const entryBase = `${year}-${seq}-S`;

  const desc = `الرصيد الافتتاحي للمورد ${supplierName}`;

  const entries: any[] = [];

  // =============================
  // 1️⃣ رصيد دائن عليك (Outstanding Balance)
  // =============================
  if (outstandingBalance > 0) {
    entries.push({
      company_id: companyId,
      account_id: payable,
      description: desc,
      debit: 0,
      credit: outstandingBalance,
      entry_date: new Date(),
      reference_id: supplierId,
      reference_type: "رصيد افتتاحي مورد",
      entry_number: `${entryBase}-1`,
      created_by: createdBy,
      is_automated: true,
    });
  }

  // =============================
  // 2️⃣ رصيد مدين لصالحك (supplierDebit)
  // totalPaid > totalPurchased
  // =============================
  const supplierDebit = totalPaid - totalPurchased;

  if (supplierDebit > 0) {
    // 2.1 المورد مدين لنا
    entries.push({
      company_id: companyId,
      account_id: receivable,
      description: desc,
      debit: supplierDebit,
      credit: 0,
      entry_date: new Date(),
      reference_id: supplierId,
      reference_type: "رصيد افتتاحي مورد",
      entry_number: `${entryBase}-2`,
      created_by: createdBy,
      is_automated: true,
    });

    // 2.2 تقليل الدائنين
    entries.push({
      company_id: companyId,
      account_id: payable,
      description: desc,
      debit: supplierDebit,
      credit: 0,
      entry_date: new Date(),
      reference_id: supplierId,
      reference_type: "رصيد افتتاحي مورد",
      entry_number: `${entryBase}-3`,
      created_by: createdBy,
      is_automated: true,
    });
  }

  // Nothing to insert
  if (entries.length === 0) return;

  await prisma.journal_entries.createMany({ data: entries });
}

async function createReturnJournalEntries({
  companyId,
  customerId,
  cashierId,
  returnNumber,
  returnToCustomer,
  returnTotalCOGS,
  refundFromAR,
  refundFromCashBank,
  returnSaleId,
  paymentMethod = "cash",
  reason,
  branchId,
}: {
  companyId: string;
  customerId: string;
  cashierId: string;
  returnNumber: string;
  returnToCustomer: number;
  returnTotalCOGS: number;
  refundFromAR: number;
  refundFromCashBank: number;
  returnSaleId: string;
  paymentMethod?: "cash" | "bank";
  reason?: string;
  branchId: string;
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
    branch_id: branchId,
  };

  const entries: any[] = [
    // Reverse Revenue (Debit)
    {
      ...baseEntry,
      entry_number: entryBase(),
      account_id: revenueAccount,
      description: `إرجاع بيع ${returnNumber}`,
      debit: 0,
      credit: returnToCustomer,
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
async function createPaymentJournalEntries({
  companyId,
  payment,
  cashierId,
}: {
  companyId: string;
  payment: any; // payment record { id, saleId, customerId, amount, paymentMethod }
  cashierId: string;
}) {
  try {
    const { saleId, customerId, amount, paymentDetails } = payment;
    const fy = await getActiveFiscalYears();
    if (!fy) return;
    // ============================================
    // 1️⃣ Fetch related sale
    // ============================================
    const sale = await prisma.sale.findUnique({
      where: { id: saleId, companyId: companyId },
      select: {
        id: true,
        saleNumber: true,
        totalAmount: true,
        amountPaid: true,
        amountDue: true,
        customerId: true,
        customer: { select: { name: true } },
      },
    });

    if (!sale) return;

    // ============================================
    // 2️⃣ Avoid duplicate journal entries
    // ============================================
    const exists = await prisma.journal_entries.findFirst({
      where: {
        reference_id: payment.id,
        reference_type: "payment",
        company_id: companyId,
      },
    });
    if (exists) return;

    // ============================================
    // 3️⃣ Generate safe journal entry number
    // ============================================
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
    // 4️⃣ Fetch account mappings
    // ============================================
    const mappings = await prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
    });

    const getAcc = (type: string) =>
      mappings.find((m) => m.mapping_type === type)?.account_id;

    const cashAcc = getAcc("cash");
    const arAcc = getAcc("accounts_receivable");

    const bank = paymentDetails.bankId;

    if (!cashAcc || !arAcc || (payment.paymentMethod === "bank" && !bank)) {
      console.error("Missing account mappings");
      return;
    }

    // ============================================
    // 5️⃣ Prepare journal entries
    // ============================================
    const desc = `تسديد دين لعملية بيع ${sale.saleNumber}`;

    let entries: any[] = [];
    if (paymentDetails.paymentMethod === "cash") {
      entries = [
        {
          company_id: companyId,
          account_id: paymentDetails.bankId,
          description: desc,
          debit: amount,
          branch_id: payment.branchId,
          // currency_code: paymentDetails.currencyCode,
          foreign_amount: paymentDetails.amountFC,
          exchange_rate: paymentDetails.exchange_rate,
          base_amount: paymentDetails.baseAmount,
          credit: 0,
          fiscal_period: fy.period_name,
          entry_date: new Date(),
          reference_id: payment.id,
          reference_type: "تسديد دين",
          entry_number: `${entryBase}-D`,
          created_by: cashierId,
          is_automated: true,
        },
        {
          company_id: companyId,
          account_id: arAcc,
          description: desc,
          branch_id: payment.branchId,
          // currency_code: paymentDetails.currencyCode,
          foreign_amount: paymentDetails.amountFC,
          exchange_rate: paymentDetails.exchange_rate,
          base_amount: paymentDetails.baseAmount,
          debit: 0,
          credit: amount,
          fiscal_period: fy.period_name,
          entry_date: new Date(),
          reference_id: customerId,
          reference_type: "سند قبض",
          entry_number: `${entryBase}-C`,
          created_by: cashierId,
          is_automated: true,
        },
      ];
    } else if (paymentDetails.paymentMethod === "bank") {
      entries = [
        {
          company_id: companyId,
          account_id: paymentDetails.bankId,
          description:
            "رقم التحويل : " +
            paymentDetails.transferNumber +
            "من: " +
            sale.customer?.name,
          debit: amount,
          credit: 0,
          branch_id: payment.branchId,
          foreign_amount: paymentDetails.amountFC,
          exchange_rate: paymentDetails.exchange_rate,
          base_amount: paymentDetails.baseAmount,
          fiscal_period: fy.period_name,
          entry_date: new Date(),
          reference_id: payment.id,
          reference_type: "تسديد دين",
          entry_number: `${entryBase}-D`,
          created_by: cashierId,
          is_automated: true,
        },
        {
          company_id: companyId,
          account_id: arAcc,
          description: desc + "رقم التحويل : " + paymentDetails.transferNumber,
          debit: 0,
          fiscal_period: fy.period_name,
          credit: amount,
          branch_id: payment.branchId,
          foreign_amount: paymentDetails.amountFC,
          exchange_rate: paymentDetails.exchange_rate,
          base_amount: paymentDetails.baseAmount,
          entry_date: new Date(),
          reference_id: customerId,
          reference_type: "سند قبض",
          entry_number: `${entryBase}-C`,
          created_by: cashierId,
          is_automated: true,
        },
      ];
    }

    if (entries.length === 0) {
      throw new Error("Unsupported payment method: " + payment.paymentMethod);
    }

    // ============================================
    // 6️⃣ Insert entries in bulk
    // ============================================
    await prisma.journal_entries.createMany({ data: entries });

    // ============================================
    // 7️⃣ Update account balances
    // ============================================
    const balanceOps = entries.map((e) =>
      prisma.accounts.update({
        where: { id: e.account_id, company_id: companyId },
        data: { balance: { increment: Number(e.debit) - Number(e.credit) } },
      }),
    );
    await Promise.all(balanceOps);

    console.log("Payment journal entries created for payment", payment.id);
  } catch (err) {
    console.error("Error in createPaymentJournalEntries:", err);
  }
}
async function createOutstandingPaymentJournalEntries({
  companyId,
  payment,
  cashierId,
}: {
  companyId: string;
  payment: any;
  cashierId: string;
}) {
  try {
    const { customerId, amount, paymentMethod, paymentDetails, currencyCode } =
      payment;

    const fy = await getActiveFiscalYears();
    if (!fy) return;

    // ============================================
    // 1️⃣ Prevent duplicate journal entries
    // ============================================
    const exists = await prisma.journal_entries.findFirst({
      where: {
        reference_id: payment.id,
        reference_type: "outstanding_payment",
        company_id: companyId,
      },
    });
    if (exists) return;

    // ============================================
    // 2️⃣ Generate journal entry number
    // ============================================
    const year = new Date().getFullYear().toString();
    const nextSeqRaw: { next_number: number }[] = await prisma.$queryRawUnsafe(`
    SELECT COALESCE(
      MAX(
        CASE
          WHEN SPLIT_PART(entry_number, '-', 3) ~ '^[0-9]+$'
          THEN CAST(SPLIT_PART(entry_number, '-', 3) AS INT)
          ELSE NULL
        END
      ),
      0
    ) + 1 AS next_number
    FROM journal_entries
    WHERE entry_number LIKE 'JE-${year}-%'
  `);

    const seq = String(nextSeqRaw[0]?.next_number || 1).padStart(7, "0");
    const entryBase = `JE-${year}-${seq}-${Math.floor(Math.random() * 1000)}`;

    // ============================================
    // 3️⃣ Fetch customer
    // ============================================
    const customer = await prisma.customer.findUnique({
      where: { id: customerId, companyId },
      select: { name: true },
    });

    // ============================================
    // 4️⃣ Fetch account mappings
    // ============================================
    const mappings = await prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
    });

    const getAcc = (type: string) =>
      mappings.find((m) => m.mapping_type === type)?.account_id;

    const cashAcc = paymentDetails.bankId || getAcc("cash");
    const bankAcc = paymentDetails.bankId || getAcc("bank");
    const arAcc = getAcc("accounts_receivable");

    if (!arAcc || (!cashAcc && !bankAcc)) return;

    const debitAccount = paymentMethod === "cash" ? cashAcc : bankAcc;

    if (!debitAccount) return;

    console.log("id", debitAccount);
    // ============================================
    // 5️⃣ Build journal entries
    // ============================================
    const desc = `سداد مديونية عميل${
      customer?.name ? " - " + customer.name : ""
    }`;

    const entries = [
      // Debit: Cash / Bank
      {
        company_id: companyId,
        account_id: debitAccount,
        description: desc,
        debit: amount,
        foreign_amount: paymentDetails.amountFC,
        exchange_rate: paymentDetails.exchangeRate,
        base_amount: paymentDetails.bas_amount,
        credit: 0,
        currency_code: currencyCode,
        fiscal_period: fy.period_name,
        entry_date: new Date(),
        reference_id: payment.id,
        reference_type: "مديونية",
        entry_number: `${entryBase}-D`,
        created_by: cashierId,
        is_automated: true,
      },

      // Credit: Accounts Receivable
      {
        company_id: companyId,
        account_id: arAcc,
        description: desc,
        debit: 0,
        credit: amount,
        foreign_amount: paymentDetails.amountFC,
        exchange_rate: paymentDetails.exchangeRate,
        base_amount: paymentDetails.bas_amount,
        currency_code: "YER",
        fiscal_period: fy.period_name,
        entry_date: new Date(),
        reference_id: customerId,
        reference_type: "سداد",
        entry_number: `${entryBase}-C`,
        created_by: cashierId,
        is_automated: true,
      },
    ];

    // ============================================
    // 6️⃣ Insert journal entries
    // ============================================
    await prisma.journal_entries.createMany({ data: entries });

    // ============================================
    // 7️⃣ Update account balances
    // ============================================
    await Promise.all(
      entries.map((e) =>
        prisma.accounts.update({
          where: { id: e.account_id, company_id: companyId },
          data: {
            balance: { increment: Number(e.debit) - Number(e.credit) },
          },
        }),
      ),
    );

    console.log("Outstanding payment journal created:", payment.id);
  } catch (err) {
    console.error("Error in createOutstandingPaymentJournalEntries:", err);
  }
}

async function createCustomerJournalEnteries({
  customerId,
  companyId,
  outstandingBalance = 0,
  balance = 0,
  createdBy,
}: {
  customerId: string;
  companyId: string;
  outstandingBalance?: number;
  balance?: number;
  createdBy: string;
}) {
  const fy = await getActiveFiscalYears();
  if (!fy) return;
  // 1️⃣ fetch account mappings
  const mappings = await prisma.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
  });

  const getAcc = (type: string) =>
    mappings.find((m) => m.mapping_type === type)?.account_id;

  const ar = getAcc("accounts_receivable");

  if (!ar) {
    throw new Error("Missing accounts_receivable mapping");
  }

  // 2️⃣ entry number
  const year = new Date().getFullYear();
  const seq = Date.now().toString().slice(-6);
  const entryBase = `JE-${year}-${seq}-CUST`;

  const desc = "الرصيد الافتتاحي للعميل";

  const entries: any[] = [];
  let arDelta = 0; // 🔥 التغيير الصافي على حساب العملاء

  // ==============================
  // 1️⃣ العميل عليه دين
  // ==============================
  if (outstandingBalance > 0) {
    entries.push({
      company_id: companyId,
      account_id: ar,
      description: desc,
      debit: outstandingBalance,
      credit: 0,
      fiscal_period: fy.period_name,
      entry_date: new Date(),
      reference_id: customerId,
      reference_type: "opening_customer_balance",
      entry_number: `${entryBase}-D`,
      created_by: createdBy,
      is_automated: true,
    });

    arDelta += outstandingBalance; // ↑ AR
  }

  // ==============================
  // 2️⃣ رصيد لصالح العميل (سلفة)
  // ==============================
  if (balance > 0) {
    entries.push({
      company_id: companyId,
      account_id: ar,
      description: desc,
      debit: 0,
      credit: balance,
      entry_date: new Date(),
      fiscal_period: fy.period_name,
      reference_id: customerId,
      reference_type: "opening_customer_balance",
      entry_number: `${entryBase}-C`,
      created_by: createdBy,
      is_automated: true,
    });

    arDelta -= balance; // ↓ AR
  }

  if (entries.length === 0) {
    return { success: true, msg: "No opening balance detected" };
  }

  // 3️⃣ transaction (journal + account update)
  await prisma.$transaction([
    prisma.journal_entries.createMany({ data: entries }),
    prisma.accounts.update({
      where: { id: ar, company_id: companyId },
      data: {
        balance: {
          increment: arDelta,
        },
      },
    }),
  ]);

  return { success: true };
}

async function createSupplierPaymentJournalEntries({
  payment,
  companyId,
  userId,
  paymentDetails,
}: {
  payment: any;
  companyId: string;
  userId: string;
  paymentDetails: any;
}) {
  // Get all default account mappings for the company
  const mappings = await prisma.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
  });
  const fy = await getActiveFiscalYears();
  if (!fy) return;
  // Helper to get account ID by mapping type
  const getAcc = (type: string) =>
    mappings.find((m) => m.mapping_type === type)?.account_id;

  const payableAccount = getAcc("accounts_payable");
  const cashAccount = getAcc("cash");
  const bankAccount = getAcc("bank");

  if (!payableAccount || !cashAccount || !bankAccount) {
    throw new Error("الحسابات الأساسية للسداد غير موجودة");
  }

  const paymentAccount =
    paymentDetails.paymentMethod === "bank" ? bankAccount : cashAccount;
  const entry_number = `SP-${payment.id.slice(0, 6)}`;
  const description =
    `سداد للمورد` +
    (paymentDetails.paymentMethod === "bank"
      ? `رقم  الحوالة :${paymentDetails.referenceNumber} `
      : " (نقداً)");

  await prisma.$transaction(async (tx) => {
    // 1️⃣ Debit Accounts Payable
    await tx.journal_entries.create({
      data: {
        company_id: companyId,
        account_id: payableAccount,
        description,
        exchange_rate: paymentDetails.exchangeRate,
        foreign_amount: paymentDetails.amountFC,
        base_amount: payment.amount,
        debit: payment.amount,
        credit: 0,
        fiscal_period: fy.period_name,
        reference_type: "سداد دين المورد",

        reference_id: payment.supplierId,
        entry_number: entry_number + "-D",
        created_by: userId,
        is_automated: true,
      },
    });

    // 2️⃣ Credit Cash/Bank
    await tx.journal_entries.create({
      data: {
        company_id: companyId,
        account_id: paymentDetails.bankId,
        description,
        debit: 0,
        exchange_rate: paymentDetails.exchangeRate,
        foreign_amount: paymentDetails.amountFC,
        base_amount: payment.amount,
        fiscal_period: fy.period_name,
        credit: payment.amount,
        reference_type: "سداد دين المورد",
        reference_id: payment.id,
        entry_number: entry_number + "-C",
        created_by: userId,
        is_automated: true,
      },
    });
    await tx.accounts.update({
      where: { id: payableAccount },
      data: { balance: { decrement: payment.amount } }, // AP ↓
    });

    await tx.accounts.update({
      where: { id: paymentDetails.bankId },
      data: { balance: { decrement: payment.amount } }, // Cash/Bank ↓
    });
  });
}

function requireAccount(accountId: string | undefined, name: string) {
  if (!accountId) {
    throw new Error(`Missing required account mapping: ${name}`);
  }
  return accountId;
}

async function createExpenseJournalEntries({
  companyId,
  expense,
  userId,
}: {
  companyId: string;
  expense: {
    id: string;
    accountId: string; // expense account (electricity, salary, etc.)
    amount: number;
    paymentMethod: string;
    branchId: string;
    description: string;

    bankId?: string;
    referenceNumber?: string;
    expenseDate: Date;
  };
  userId: string;
}) {
  const fy = await getActiveFiscalYears();
  if (!fy) return;
  // 🔎 Fetch default accounts
  const mappings = await prisma.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
  });

  const getAcc = (type: string) =>
    mappings.find((m) => m.mapping_type === type)?.account_id;

  const cash = requireAccount(getAcc("cash"), "cash");
  const bank = expense.bankId ?? requireAccount(getAcc("bank"), "bank");
  const payable = requireAccount(
    getAcc("accounts_payable"),
    "accounts_payable",
  );

  // Determine credit account

  let creditAccountId: string;

  switch (expense.paymentMethod) {
    case "bank":
      creditAccountId = bank;
      break;
    case "credit":
      creditAccountId = payable;
      break;
    default:
      creditAccountId = cash;
  }

  const entryNumber = `EXP-${Date.now()}`;

  const entries = [
    // 1️⃣ Debit Expense Account (Electricity / Salary / Rent)
    {
      company_id: companyId,
      account_id: expense.accountId,
      fiscal_period: fy.period_name,
      branch_id: expense.branchId,
      description:
        expense.description +
        (expense.referenceNumber ? ` - ${expense.referenceNumber}` : ""),
      debit: expense.amount,
      credit: 0,
      entry_date: expense.expenseDate,

      reference_id: expense.id,
      reference_type: "مصاريف",
      entry_number: `${entryNumber}-1`,
      created_by: userId,
      is_automated: true,
    },

    // 2️⃣ Credit Cash / Bank / Payable
    {
      company_id: companyId,
      account_id: creditAccountId,
      branch_id: expense.branchId,
      description:
        expense.description +
        (expense.referenceNumber ? ` - ${expense.referenceNumber}` : ""),
      debit: 0,
      fiscal_period: fy.period_name,
      credit: expense.amount,
      entry_date: expense.expenseDate,
      reference_id: expense.id,
      reference_type: "مصاريف",
      entry_number: `${entryNumber}-2`,
      created_by: userId,
      is_automated: true,
    },
  ];

  await prisma.$transaction(async (tx) => {
    await tx.journal_entries.createMany({ data: entries });

    for (const entry of entries) {
      const delta = entry.debit - entry.credit;

      await tx.accounts.update({
        where: { id: entry.account_id },
        data: {
          balance: {
            increment: delta,
          },
        },
      });
    }
  });
}

// Helper function to create sale journal entries
async function createSaleJournalEntries({
  companyId,
  sale,
  saleItems,
  customerId,
  cashierId,
  returnTotalCOGS,
}: {
  companyId: string;
  sale: any;
  customerId: string;
  saleItems: any[];
  cashierId: string;
  returnTotalCOGS: number;
}) {
  // 1️⃣ Early exits
  if (sale.sale_type !== "SALE") return;

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

  // let totalCOGS = 0;
  // for (const item of saleItems) {
  //   const product = productMap.get(item.id);
  //   if (!product) continue;

  //   const unitsPerCarton =
  //     (product.unitsPerPacket || 1) * (product.packetsPerCarton || 1);
  //   let costPerUnit = Number(product.costPrice);

  //   if (item.sellingUnit === "packet")
  //     costPerUnit = costPerUnit / (product.packetsPerCarton || 1);
  //   else if (item.sellingUnit === "unit")
  //     costPerUnit = costPerUnit / unitsPerCarton;

  //   totalCOGS += item.selectedQty * costPerUnit;
  // }

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
  if (sale.status === "completed") {
    if (paid > total) {
      // Overpayment
      const change = paid - total;
      entries.push(
        {
          ...baseEntry,
          branch_id: sale.branchId,
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
          branch_id: sale.branchId,
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
          branch_id: sale.branchId,
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
          branch_id: sale.branchId,
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
          branch_id: sale.branchId,
          description: desc,
          debit: 0,
          credit: total,
          reference_id: customerId,
          reference_type: "دفع نقداً",
          entry_number: `${entryBase}-C1`,
        },
      );
    }
  } else if (sale.status === "partial") {
    // Partial payment
    entries.push(
      {
        ...baseEntry,
        branch_id: sale.branchId,
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
        branch_id: sale.branchId,
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
          branch_id: sale.branchId,
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
          branch_id: sale.branchId,
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
        branch_id: sale.branchId,
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
        branch_id: sale.branchId,
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
  if (returnTotalCOGS > 0 && cogs && inventory) {
    entries.push(
      {
        ...baseEntry,
        account_id: cogs,
        description: desc,
        branch_id: sale.branchId,
        debit: returnTotalCOGS,
        credit: 0,
        reference_id: sale.id,
        reference_type: "تكلفة البضاعة المباعة",
        entry_number: `${entryBase}-CG1`,
      },
      {
        ...baseEntry,
        account_id: inventory,
        branch_id: sale.branchId,
        description: desc,
        debit: 0,
        credit: returnTotalCOGS,
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
async function createPurchaseJournalEntries({
  purchase,
  companyId,
  userId,
  type,
  currencyCode,
  branchId,
  paymentDetails,
}: {
  purchase: any;
  companyId: string;
  userId: string;
  branchId: string;
  type: string;
  currencyCode: string;
  paymentDetails: any;
}) {
  // 1️⃣ Fetch mappings and fiscal year in parallel
  const [mappings, fy] = await Promise.all([
    prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
      select: { mapping_type: true, account_id: true },
    }),
    getActiveFiscalYears(),
  ]);
  const safeCurrency = currencyCode || "YER";

  if (!fy) {
    console.warn("No active fiscal year - skipping journal entries");
    return;
  }

  // 2️⃣ Create account map
  const accountMap = new Map(
    mappings.map((m) => [m.mapping_type, m.account_id]),
  );

  const payableAccount = accountMap.get("accounts_payable");
  const cashAccount =
    purchase.paymentMethod === "cash"
      ? paymentDetails?.bankId
      : accountMap.get("cash");
  const bankAccount = paymentDetails?.bankId || accountMap.get("bank");

  const inventoryAccount = accountMap.get("inventory");

  if (!inventoryAccount || !payableAccount || !bankAccount || !cashAccount) {
    throw new Error("الحسابات الأساسية غير موجودة");
  }

  // 3️⃣ Generate entry number
  if (!safeCurrency) {
    throw new Error("❌ currency_code is missing");
  }

  const entryBase = `JE-${new Date().getFullYear()}-${purchase.id.slice(0, 7)}-${Math.floor(Math.random() * 10000)}`;
  const description =
    type === "purchase"
      ? `مشتريات - فاتورة رقم ${purchase.id.slice(0, 8)}`
      : `إرجاع مشتريات - فاتورة رقم ${purchase.id.slice(0, 8)}`;

  // 4️⃣ Build journal entries
  const baseEntry = {
    company_id: companyId,
    entry_date: new Date(),
    is_automated: true,
    currency_code: safeCurrency,
    fiscal_period: fy.period_name,
    created_by: userId,
    branch_id: branchId,
  };

  const entries: any[] = [];
  const totalAmount = Number(purchase.totalAmount);
  const amountPaid = Number(purchase.amountPaid);

  if (type === "purchase") {
    // ===============================
    // PURCHASE SCENARIOS
    // ===============================

    if (amountPaid === totalAmount) {
      // 1️⃣ Fully Paid
      const paymentAccount =
        paymentDetails.paymentMethod === "bank" ? bankAccount : cashAccount;

      entries.push(
        // Debit Inventory
        {
          ...baseEntry,
          exchange_rate: paymentDetails.exchangeRate,
          foreign_amount: paymentDetails.amountFC,
          base_amount: paymentDetails.amountBase,

          account_id: inventoryAccount,
          description:
            description +
            " - إضافة للمخزون" +
            (purchase.referenceNumber ? ` - ${purchase.referenceNumber}` : ""),
          debit: totalAmount,
          credit: 0,
          reference_type: "إضافة مخزون",
          reference_id: purchase.id,
          entry_number: `${entryBase}-DR1`,
        },
        // Credit Cash/Bank
        {
          ...baseEntry,
          account_id: paymentDetails.bankId,
          exchange_rate: paymentDetails.exchangeRate,
          foreign_amount: paymentDetails.amountFC,
          base_amount: paymentDetails.amountBase,

          description:
            description +
            " - مدفوع بالكامل" +
            (paymentDetails?.refrenceNumber
              ? ` - ${paymentDetails.refrenceNumber}`
              : ""),
          debit: 0,
          credit: totalAmount,
          reference_type: "سداد مشتريات",
          reference_id: purchase.id,
          entry_number: `${entryBase}-CR1`,
        },
      );
      console.log("Fully paid purchase journal entries created.", currencyCode);
    } else if (amountPaid > 0 && amountPaid < totalAmount) {
      // 2️⃣ Partial Payment
      const due = totalAmount - amountPaid;
      const paymentAccount =
        purchase.paymentMethod === "bank" ? bankAccount : cashAccount;

      entries.push(
        // Debit Inventory
        {
          ...baseEntry,
          account_id: inventoryAccount,
          description:
            description +
            " - إضافة للمخزون" +
            (paymentDetails?.refrenceNumber
              ? ` - ${paymentDetails.refrenceNumber}`
              : ""),
          exchange_rate: paymentDetails.exchangeRate,
          foreign_amount: paymentDetails.amountFC,
          base_amount: paymentDetails.amountBase,
          debit: totalAmount,
          credit: 0,
          reference_type: "إضافة مخزون",
          reference_id: purchase.id,
          entry_number: `${entryBase}-DR1`,
        },
        // Credit Cash/Bank (paid amount)
        {
          ...baseEntry,
          account_id: paymentDetails.bankId,
          exchange_rate: paymentDetails.exchangeRate,
          foreign_amount: paymentDetails.amountFC,
          base_amount: amountPaid,
          description:
            description +
            " - دفع جزئي" +
            (paymentDetails?.refrenceNumber
              ? ` - ${paymentDetails.refrenceNumber}`
              : ""),
          debit: 0,
          credit: amountPaid,
          reference_type: "دفع مشتريات",
          reference_id: paymentDetails.id,
          entry_number: `${entryBase}-CR1`,
        },
        // Credit Accounts Payable (remaining)
        {
          ...baseEntry,
          account_id: payableAccount,
          exchange_rate: paymentDetails.exchangeRate,
          foreign_amount: paymentDetails.amountFC,
          base_amount: paymentDetails.amountBase,
          description:
            description +
            " - آجل للمورد" +
            (paymentDetails?.refrenceNumber
              ? ` - ${paymentDetails.refrenceNumber}`
              : ""),
          debit: 0,
          credit: totalAmount,
          reference_type: "آجل مشتريات",
          reference_id: purchase.supplierId,
          entry_number: `${entryBase}-CR2`,
        },
        {
          ...baseEntry,
          exchange_rate: paymentDetails.exchangeRate,
          foreign_amount: paymentDetails.amountFC,
          base_amount: amountPaid,
          account_id: payableAccount,
          description: description + " - آجل للمورد",
          debit: amountPaid,
          credit: 0,
          reference_type: "آجل مشتريات",
          reference_id: purchase.supplierId,
          entry_number: `${entryBase}-CR5`,
        },
      );
    } else {
      // 3️⃣ Fully On Credit
      entries.push(
        // Debit Inventory
        {
          ...baseEntry,
          exchange_rate: paymentDetails.exchangeRate,
          foreign_amount: paymentDetails.amountFC,
          base_amount: totalAmount,
          account_id: inventoryAccount,
          description: description + " - إضافة للمخزون",
          debit: totalAmount,
          credit: 0,
          reference_type: "إضافة مخزون",
          reference_id: purchase.id,
          entry_number: `${entryBase}-DR1`,
        },
        // Credit Accounts Payable
        {
          ...baseEntry,
          account_id: payableAccount,
          description: description + " - آجل كامل",
          debit: 0,
          exchange_rate: paymentDetails.exchangeRate,
          foreign_amount: paymentDetails.amountFC,
          base_amount: totalAmount,
          credit: totalAmount,
          reference_type: " دين للمورد",
          reference_id: purchase.supplierId,
          entry_number: `${entryBase}-CR1`,
        },
      );
    }
  } else {
    // ===============================
    // PURCHASE RETURN SCENARIOS
    // ===============================

    const remainingAmount = totalAmount - amountPaid;

    // Always credit inventory (reduce)
    entries.push({
      ...baseEntry,
      account_id: inventoryAccount,
      description: description + " - تخفيض المخزون",
      debit: 0,
      credit: totalAmount,
      reference_type: "تخفيض مخزون بسبب مرتجع مشتريات",
      reference_id: purchase.id,
      entry_number: `${entryBase}-CR1`,
    });

    if (amountPaid > 0) {
      // Has payment - refund cash/bank
      const paymentAccount =
        purchase.paymentMethod === "bank" ? bankAccount : cashAccount;

      entries.push({
        ...baseEntry,
        account_id: paymentAccount,
        description: description + " - استرداد نقدي/بنكي",
        debit: amountPaid,
        credit: 0,
        reference_type: "استرداد مدفوعات للمرتجع",
        reference_id: purchase.id,
        entry_number: `${entryBase}-DR1`,
      });

      // If there's remaining payable, reduce it
      if (remainingAmount > 0) {
        entries.push({
          ...baseEntry,
          account_id: payableAccount,
          description: description + " - تخفيض الذمم الدائنة",
          debit: remainingAmount,
          credit: 0,
          reference_type: "تخفيض مديونية المورد بسبب مرتجع",
          reference_id: purchase.supplierId,
          entry_number: `${entryBase}-DR2`,
        });
      }
    } else {
      // No payment - reduce payables only
      entries.push({
        ...baseEntry,
        account_id: payableAccount,
        description: description + " - تخفيض الذمم الدائنة",
        debit: totalAmount,
        credit: 0,
        reference_type: "تخفيض ذمم دائنة للمرتجع",
        reference_id: purchase.supplierId,
        entry_number: `${entryBase}-DR1`,
      });
    }
  }

  // 5️⃣ Insert entries and update balances in transaction
  await prisma.$transaction(async (tx) => {
    // Insert all journal entries
    await tx.journal_entries.createMany({ data: entries });

    // 2️⃣ Fetch account types once
    const accountIds = [...new Set(entries.map((e) => e.account_id))];

    const accounts = await tx.accounts.findMany({
      where: { id: { in: accountIds }, company_id: companyId },
      select: { id: true, account_type: true },
    });

    const accountTypeMap = new Map(accounts.map((a) => [a.id, a.account_type]));

    // 3️⃣ Calculate deltas correctly
    const accountDeltas = new Map<string, number>();

    for (const entry of entries) {
      const type = accountTypeMap.get(entry.account_id);
      if (!type) continue;

      const debit = Number(entry.debit || 0);
      const credit = Number(entry.credit || 0);

      const delta = type === "ASSET" ? debit - credit : credit - debit;

      accountDeltas.set(
        entry.account_id,
        (accountDeltas.get(entry.account_id) || 0) + delta,
      );
    }

    // Update all account balances in parallel
    await Promise.all(
      Array.from(accountDeltas.entries()).map(([accountId, delta]) =>
        tx.accounts.update({
          where: { id: accountId, company_id: companyId },
          data: { balance: { increment: delta } },
        }),
      ),
    );
  });
}
async function processFiscalYearClose({
  companyId,
  fiscalPeriod,
  closingDate,
  accounts,
  userId,
}: {
  companyId: string;
  fiscalPeriod: string;
  closingDate: Date;
  accounts: any[];
  userId: string;
}) {
  // Get account mappings
  const mappings = await prisma.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
  });

  const getAcc = (type: string) =>
    mappings.find((m) => m.mapping_type === type)?.account_id;

  const retainedEarningsAcc = getAcc("retained_earnings");
  if (!retainedEarningsAcc) {
    throw new Error("حساب الأرباح المحتجزة غير موجود");
  }

  const entryBase = `CLOSE-${new Date().getFullYear()}-${Date.now()}`;
  const entries: any[] = [];

  // Process Revenue accounts
  const revenueAccounts = accounts.filter((a) => a.type === "REVENUE");
  for (const acc of revenueAccounts) {
    const balance = Number(acc.balance);
    if (balance === 0) continue;

    // Debit revenue (close it)
    entries.push({
      company_id: companyId,
      account_id: acc.id,
      description: `قيد إقفال حساب ${acc.name_ar || acc.name_en}`,
      debit: Math.abs(balance),
      credit: 0,
      entry_date: closingDate,
      fiscal_period: fiscalPeriod,
      reference_type: "إقفال سنة مالية - إيرادات",
      entry_number: `${entryBase}-REV-${acc.id.slice(0, 6)}`,
      created_by: userId,
      is_automated: true,
      is_posted: true,
    });

    // Credit retained earnings
    entries.push({
      company_id: companyId,
      account_id: retainedEarningsAcc,
      description: `إقفال إيرادات إلى الأرباح المحتجزة`,
      debit: 0,
      credit: Math.abs(balance),
      entry_date: closingDate,
      fiscal_period: fiscalPeriod,
      reference_type: "إقفال سنة مالية - إيرادات",
      entry_number: `${entryBase}-REV-RE-${acc.id.slice(0, 6)}`,
      created_by: userId,
      is_automated: true,
      is_posted: true,
    });
  }

  // Process Expense accounts
  const expenseAccounts = accounts.filter(
    (a) => a.type === "EXPENSE" || a.type === "COST_OF_GOODS",
  );
  for (const acc of expenseAccounts) {
    const balance = Number(acc.balance);
    if (balance === 0) continue;

    // Credit expense (close it)
    entries.push({
      company_id: companyId,
      account_id: acc.id,
      description: `قيد إقفال حساب ${acc.name_ar || acc.name_en}`,
      debit: 0,
      credit: Math.abs(balance),
      entry_date: closingDate,
      fiscal_period: fiscalPeriod,
      reference_type: "إقفال سنة مالية - مصروفات",
      entry_number: `${entryBase}-EXP-${acc.id.slice(0, 6)}`,
      created_by: userId,
      is_automated: true,
      is_posted: true,
    });

    // Debit retained earnings
    entries.push({
      company_id: companyId,
      account_id: retainedEarningsAcc,
      description: `إقفال مصروفات من الأرباح المحتجزة`,
      debit: Math.abs(balance),
      credit: 0,
      entry_date: closingDate,
      fiscal_period: fiscalPeriod,
      reference_type: "إقفال سنة مالية - مصروفات",
      entry_number: `${entryBase}-EXP-RE-${acc.id.slice(0, 6)}`,
      created_by: userId,
      is_automated: true,
      is_posted: true,
    });
  }

  // Insert entries and reset accounts in transaction
  if (entries.length > 0) {
    await prisma.$transaction(async (tx) => {
      await tx.journal_entries.createMany({ data: entries });

      // Reset income statement accounts to zero
      for (const acc of [...revenueAccounts, ...expenseAccounts]) {
        if (Number(acc.balance) !== 0) {
          await tx.accounts.update({
            where: { id: acc.id },
            data: { balance: 0 },
          });
        }
      }
    });
  }

  console.log(`✅ Created ${entries.length} closing entries`);
}

// ============================================
// 🆕 FISCAL YEAR OPEN PROCESSOR
// ============================================
async function processFiscalYearOpen({
  companyId,
  openingDate,
  accounts,
  customers,
  suppliers,
  userId,
}: {
  companyId: string;
  openingDate: Date;
  accounts: any[];
  customers: any[];
  suppliers: any[];
  userId: string;
}) {
  const entryBase = `OPEN-${new Date().getFullYear()}-${Date.now()}`;
  const entries: any[] = [];

  // Get account mappings
  const mappings = await prisma.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
  });

  const getAcc = (type: string) =>
    mappings.find((m) => m.mapping_type === type)?.account_id;

  const arAccount = getAcc("accounts_receivable");
  const apAccount = getAcc("accounts_payable");

  // 1️⃣ Create opening entries for balance sheet accounts
  for (const acc of accounts) {
    const balance = Number(acc.balance);
    if (balance === 0) continue;

    const isDebitNormal = acc.type === "ASSET";

    entries.push({
      company_id: companyId,
      account_id: acc.id,
      description: `رصيد افتتاحي - ${acc.name_ar || acc.name_en}`,
      debit: isDebitNormal ? Math.abs(balance) : 0,
      credit: !isDebitNormal ? Math.abs(balance) : 0,
      entry_date: openingDate,
      reference_type: "رصيد افتتاحي حساب",
      entry_number: `${entryBase}-ACC-${acc.id.slice(0, 6)}`,
      created_by: userId,
      is_automated: true,
      is_posted: true,
    });
  }

  // 2️⃣ Create opening entries for customers
  if (arAccount) {
    for (const customer of customers) {
      const outstanding = Number(customer.outstandingBalance);
      const balance = Number(customer.balance);

      // Customer owes us (debit AR)
      if (outstanding > 0) {
        entries.push({
          company_id: companyId,
          account_id: arAccount,
          description: `رصيد افتتاحي عميل - ${customer.name} (مديونية)`,
          debit: outstanding,
          credit: 0,
          entry_date: openingDate,
          reference_type: "opening_customer_balance",
          reference_id: customer.id,
          entry_number: `${entryBase}-CUST-D-${customer.id.slice(0, 6)}`,
          created_by: userId,
          is_automated: true,
          is_posted: true,
        });
      }

      // We owe customer (credit AR)
      if (balance > 0) {
        entries.push({
          company_id: companyId,
          account_id: arAccount,
          description: `رصيد افتتاحي عميل - ${customer.name} (رصيد لصالح العميل)`,
          debit: 0,
          credit: balance,
          entry_date: openingDate,
          reference_type: "opening_customer_balance",
          reference_id: customer.id,
          entry_number: `${entryBase}-CUST-C-${customer.id.slice(0, 6)}`,
          created_by: userId,
          is_automated: true,
          is_posted: true,
        });
      }
    }
  }

  // 3️⃣ Create opening entries for suppliers
  if (apAccount) {
    for (const supplier of suppliers) {
      const outstanding = Number(supplier.outstandingBalance);

      // We owe supplier (credit AP)
      if (outstanding > 0) {
        entries.push({
          company_id: companyId,
          account_id: apAccount,
          description: `رصيد افتتاحي مورد - ${supplier.name}`,
          debit: 0,
          credit: outstanding,
          entry_date: openingDate,
          reference_type: "opening_supplier_balance",
          reference_id: supplier.id,
          entry_number: `${entryBase}-SUPP-${supplier.id.slice(0, 6)}`,
          created_by: userId,
          is_automated: true,
          is_posted: true,
        });
      }
    }
  }

  // Insert all opening entries
  if (entries.length > 0) {
    await prisma.journal_entries.createMany({ data: entries });
  }

  console.log(`✅ Created ${entries.length} opening entries`);
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
