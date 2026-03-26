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
            customer: eventData.customer,
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
            foreignAmount: eventData.foreignAmount,
            exchangeRate: eventData.exchangeRate,
            foreignCurrency: eventData.foreignCurrency,
            baseCurrency: eventData.baseCurrency,
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
            branchId: eventData.branchId,
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
  const entryBase = `JE-Men-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;

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
        currency_code: e.currency_code,
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
  returnToCustomer, // القيمة بالعملة المحلية
  returnTotalCOGS,
  refundFromAR,
  refundFromCashBank,
  returnSaleId,
  paymentMethod = "cash",
  reason,
  branchId,
  // العملات الممررة من الـ payload
  foreignAmount,
  exchangeRate,
  foreignCurrency,
  baseCurrency,
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
  foreignAmount?: number;
  exchangeRate?: number;
  foreignCurrency?: string;
  baseCurrency: string;
}) {
  // 1️⃣ استخراج بيانات العملة والتحقق من الحالة
  const isForeign =
    foreignCurrency &&
    foreignCurrency !== baseCurrency &&
    exchangeRate &&
    exchangeRate !== 1;

  // 2️⃣ جلب المخطط المحاسبي والسنة المالية
  const [mappings, fy] = await Promise.all([
    prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
      select: { mapping_type: true, account_id: true },
    }),
    getActiveFiscalYears(),
  ]);

  if (!fy) throw new Error("السنة المالية النشطة غير موجودة");

  const accountMap = new Map(
    mappings.map((m) => [m.mapping_type, m.account_id]),
  );
  const revenueAccount = accountMap.get("sales_revenue")!;
  const cogsAccount = accountMap.get("cogs")!;
  const inventoryAccount = accountMap.get("inventory")!;
  const arAccount = accountMap.get("accounts_receivable")!;
  const cashAccount = accountMap.get("cash")!;
  const bankAccount = accountMap.get("bank")!;

  // 3️⃣ توليد رقم القيد (نفس منطق البيع)
  const v_year = new Date().getFullYear();
  //   const aggregateexp = await prisma.journal_entries.aggregate({
  //       where: {
  //       company_id: companyId,
  //         branch_id:branchId
  //       },

  //       _max: {
  //         entry_number: true,
  //       },
  //   });
  //     let nextExpenseNumber = 1;

  //  if (aggregateexp._max.entry_number) {
  //     const last = aggregateexp._max.entry_number; // EXP-00012
  //     const lastNum = Number(last.split("-")[1]);
  //     nextExpenseNumber = lastNum + 1;
  // }
  //  const expenseNumber = `EXP-${String(nextExpenseNumber).padStart(5, "0")}`;
  //       nextExpenseNumber++; // زيادة الرقم للمصروف التالي
  let entryCounter = 0;
  const generateEntryNumber = (suffix: string) => {
    entryCounter++;
    return `JE-RET-${v_year}-${Date.now()}-${entryCounter}-${suffix}`;
  };

  // 4️⃣ الدالة المساعدة لإنشاء القيد (نفس منطق createSaleJournalEntries)
  const createEntry = (
    accountId: string,
    description: string,
    debitBase: number,
    creditBase: number,
    suffix: string,
    refId: string,
    refType: string,
    isCogsRelated: boolean = false,
  ) => {
    const baseAmountValue = debitBase > 0 ? debitBase : creditBase;
    const useForeign = isForeign && !isCogsRelated;

    return {
      company_id: companyId,
      entry_date: new Date(),
      fiscal_period: fy.period_name,
      created_by: cashierId,
      is_automated: true,
      branch_id: branchId,
      account_id: accountId,
      description,
      entry_number: generateEntryNumber(suffix),
      reference_id: refId,
      reference_type: refType,
      debit: debitBase,
      credit: creditBase,

      ...(useForeign
        ? {
            currency_code: foreignCurrency,
            exchange_rate: exchangeRate,
            foreign_amount: foreignAmount,
            base_amount: baseAmountValue, // القيمة المحلية دائماً للكل
          }
        : {
            currency_code: baseCurrency,
          }),
    };
  };

  const entries: any[] = [];
  const desc = `إرجاع فاتورة ${returnNumber}`;

  // 5️⃣ بناء قيود الإرجاع المالي
  // أ- عكس الإيراد (مدين)
  entries.push(
    createEntry(
      revenueAccount,
      desc,
      returnToCustomer,
      0,
      "REV",
      returnSaleId,
      "إرجاع مبيعات",
    ),
  );

  // ب- تخفيض المديونية إذا وجد (دائن)
  if (refundFromAR > 0) {
    entries.push(
      createEntry(
        arAccount,
        desc + " (تخفيض دين)",
        0,
        refundFromAR,
        "ARP",
        customerId,
        "عميل",
      ),
    );
  }

  // ج- استرداد نقدي/بنكي إذا وجد (دائن)
  if (refundFromCashBank > 0) {
    const refundAcc = paymentMethod === "bank" ? bankAccount : cashAccount;
    entries.push(
      createEntry(
        refundAcc,
        desc + " (نقدي)",
        0,
        refundFromCashBank,
        "CSH",
        customerId,
        "إرجاع نقدي",
      ),
    );
  }

  // 6️⃣ قيود المخزن والتكلفة (دائماً عملة محلية Base)
  if (returnTotalCOGS > 0) {
    entries.push(
      createEntry(
        inventoryAccount,
        desc + " (إرجاع مخزن)",
        returnTotalCOGS,
        0,
        "INV",
        returnSaleId,
        "حركة مخزنية",
        true,
      ),
      createEntry(
        cogsAccount,
        desc + " (عكس تكلفة)",
        0,
        returnTotalCOGS,
        "COGS",
        returnSaleId,
        "حركة مخزنية",
        true,
      ),
    );
  }

  // 7️⃣ التنفيذ في Transaction وتحديث الأرصدة
  await prisma.$transaction(async (tx) => {
    await tx.journal_entries.createMany({ data: entries });

    // تحديث الأرصدة في جدول Accounts (بالعملة المحلية Base)
    for (const entry of entries) {
      const isDebitNature = await tx.accounts.findUnique({
        where: { id: entry.account_id },
        select: { account_type: true },
      });

      const isDebit = ["ASSET", "EXPENSE", "COGS"].includes(
        isDebitNature?.account_type || "",
      );
      const change = entry.debit - entry.credit;
      const delta = isDebit ? change : -change;

      await tx.accounts.update({
        where: { id: entry.account_id },
        data: { balance: { increment: delta } },
      });
    }
  });

  return { success: true, message: "تمت معالجة قيود الإرجاع بنجاح" };
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
    const {
      saleId,
      customerId,
      amount,
      paymentDetails,

      branchId,

      exchangeRate,
    } = payment;
    const {
      basCurrncy,
      currencyCode,
      exchange_rate,
      amountFC,
      baseAmount,
      paymentMethod,
      bankId,
      transferNumber,
    } = paymentDetails;
    const fy = await getActiveFiscalYears();
    if (!fy) return;
    // ============================================
    // 1️⃣ Fetch related sale
    // ============================================
    const sale = await prisma.invoice.findUnique({
      where: { id: saleId, companyId: companyId },
      select: {
        id: true,
        invoiceNumber: true,
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
    let entryCounter = 0;
    const generateEntryNumber = (suffix: string) => {
      entryCounter++;
      return `JE-${year}-${Date.now()}-${suffix}`;
    };
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

    const bank = payment.paymentDetails.bankId;

    if (!cashAcc || !arAcc || (payment.paymentMethod === "bank" && !bank)) {
      console.error("Missing account mappings");
      return;
    }
    const isForeign =
      currencyCode &&
      basCurrncy &&
      currencyCode !== basCurrncy &&
      exchange_rate &&
      exchange_rate > 0;

    // ============================================
    // 5️⃣ Prepare journal entries
    // ============================================
    const currency = isForeign ? currencyCode : basCurrncy;
    const desc = `تسديد دين لعملية بيع ${sale.invoiceNumber} العمله:(${currency})`;
    const createEntry = (
      accountId: string,
      description: string,
      debitBase: number,
      creditBase: number,
      suffix: string,
      refId: string,
      refType: string,
      isCogsRelated: boolean = false,
    ) => {
      const baseAmountValue = debitBase > 0 ? debitBase : creditBase;
      const useForeign = isForeign && !isCogsRelated;

      return {
        company_id: companyId,
        entry_date: new Date(),
        fiscal_period: fy.period_name,
        created_by: cashierId,
        is_automated: true,
        branch_id: branchId,
        account_id: accountId,
        description,
        entry_number: generateEntryNumber(suffix),
        reference_id: refId,
        reference_type: refType,
        debit: debitBase,
        credit: creditBase,

        ...(useForeign
          ? {
              currency_code: currencyCode,
              foreign_amount: amountFC,
              exchange_rate,
              base_amount: baseAmount,
            }
          : {
              currency_code: basCurrncy,
            }),
      };
    };
    let entries: any[] = [];

    if (paymentMethod === "cash") {
      entries.push(
        createEntry(bankId, desc, amount, 0, "-D", payment.id, "تسديد دين"),

        createEntry(arAcc, desc, 0, amount, "-C", customerId, "سند قبض", true),
      );
    } else if (paymentMethod === "bank") {
      entries.push(
        createEntry(
          bankId,
          desc +
            "رقم التحويل : " +
            transferNumber +
            "من: " +
            sale.customer?.name,
          amount,
          0,
          "-D",
          payment.id,
          "تسديد دين",
        ),

        createEntry(
          arAcc,
          desc +
            "رقم التحويل : " +
            transferNumber +
            "من: " +
            sale.customer?.name,
          0,
          amount,
          " -C",
          customerId,

          "سند قبض",
        ),
      );
    }

    if (entries.length === 0) {
      throw new Error("Unsupported payment method: " + paymentMethod);
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
    console.log(currencyCode, "heythere");
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
    const {
      customerId,
      branchId,
      amount,

      paymentDetails,

      exchangeRate,
    } = payment;
    const {
      basCurrncy,
      currencyCode,
      exchange_rate,
      amountFC,
      baseAmount,
      paymentMethod,
      bankId,
      transferNumber,
    } = paymentDetails;
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

    const isForeign =
      currencyCode &&
      currencyCode !== basCurrncy &&
      exchangeRate &&
      exchangeRate !== 1;
    let entryCounter = 0;
    const generateEntryNumber = (suffix: string) => {
      entryCounter++;
      return `JE-RET-${year}-${Date.now()}-${entryCounter}-${suffix}`;
    };
    // ============================================
    // 5️⃣ Prepare journal entries
    // ============================================
    const createEntry = (
      accountId: string,
      description: string,
      debitBase: number,
      creditBase: number,
      suffix: string,
      refId: string,
      refType: string,
      isCogsRelated: boolean = false,
    ) => {
      const baseAmountValue = debitBase > 0 ? debitBase : creditBase;
      const useForeign = isForeign && !isCogsRelated;

      return {
        company_id: companyId,
        entry_date: new Date(),
        fiscal_period: fy.period_name,
        created_by: cashierId,
        is_automated: true,
        branch_id: branchId,
        account_id: accountId,
        description,
        entry_number: generateEntryNumber(suffix),
        reference_id: refId,
        reference_type: refType,
        debit: debitBase,
        credit: creditBase,

        ...(useForeign
          ? {
              currency_code: currencyCode,
              foreign_amount: amountFC,
              exchange_rate,
              base_amount: baseAmount,
            }
          : {
              currency_code: basCurrncy,
            }),
      };
    };
    let entries: any[] = [];

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

    const cashAcc = bankId || getAcc("cash");
    const bankAcc = bankId || getAcc("bank");
    const arAcc = getAcc("accounts_receivable");

    if (!arAcc || (!cashAcc && !bankAcc)) return;

    const debitAccount = paymentMethod === "cash" ? cashAcc : bankAcc;

    if (!debitAccount) return;

    console.log("id", debitAccount);
    // ============================================
    // 5️⃣ Build journal entries
    // ============================================
    const currency = isForeign ? currencyCode : basCurrncy;
    const desc = `سداد مديونية عميل${
      customer?.name ? " - " + customer.name : ""
    }العمله:(${currency})`;

    entries.push(
      createEntry(
        debitAccount,
        desc,
        amount,

        0,
        "-D",
        payment.id,
        "مديونية",
      ),

      // Credit: Accounts Receivable

      createEntry(arAcc, desc, 0, amount, "-C", customerId, "سداد"),
    );

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
  branchId,
}: {
  payment: any;
  companyId: string;
  userId: string;
  paymentDetails: any;
  branchId: string;
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
  const createEntry = (
    accountId: string,
    description: string,
    debitBase: number,
    creditBase: number,
    suffix: string,
    refId: string,
    refType: string,
    isCogsRelated: boolean = false,
  ) => {
    const baseAmountValue = debitBase > 0 ? debitBase : creditBase;
    const isForeign =
      paymentDetails.currency_code &&
      paymentDetails.currency_code !== paymentDetails.baseCurrency &&
      paymentDetails.exchangeRate &&
      paymentDetails.exchangeRate !== 1;

    const useForeign = isForeign && !isCogsRelated;

    return {
      company_id: companyId,
      entry_date: new Date(),
      fiscal_period: fy.period_name,
      created_by: userId,
      is_automated: true,
      branch_id: branchId,
      account_id: accountId,
      description,
      entry_number: entry_number + suffix,
      reference_id: refId,
      reference_type: refType,
      debit: debitBase,
      credit: creditBase,

      ...(useForeign
        ? {
            currency_code: paymentDetails.currency_code,
            foreign_amount: paymentDetails.amountFC,
            exchange_rate: paymentDetails.exchange_rate,
            base_amount: paymentDetails.baseAmount,
          }
        : {
            currency_code: paymentDetails.baseCurrency,
          }),
    };
  };
  const entries: any[] = [];
  entries.push(
    createEntry(
      payableAccount,
      description,
      payment.amount,
      0,

      "-D",
      payment.supplierId,
      "سداد دين المورد",
    ),
    createEntry(
      paymentDetails.bankId,
      description,
      0,

      payment.amount,
      "-C",
      payment.id,
      "سداد دين المورد",
    ),
  );
  await prisma.journal_entries.createMany({
    data: entries,
  });
  await prisma.$transaction(async (tx) => {
    // 1️⃣ Debit Accounts Payable

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
    exchangeRate?: number;
    basCurrncy: string;
    baseAmount: number;
    amountFC?: number;
    currency_code: string;
    bankId?: string;
    referenceNumber?: string;
    expenseDate: Date;
  };
  userId: string;
}) {
  const fy = await getActiveFiscalYears();
  if (!fy) return;

  const existingHeader = await prisma.journalHeader.findFirst({
    where: {
      companyId,
      referenceType: "expense",
      referenceId: expense.id,
    },
    select: { id: true },
  });

  if (existingHeader) return;

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

  const entryYear = new Date().getFullYear();
  const entryNumber = `JE-${entryYear}-${Date.now()}-${Math.floor(
    Math.random() * 1000,
  )}`;
  const memo =
    expense.description +
    (expense.referenceNumber ? ` - ${expense.referenceNumber}` : "");

  const createLine = (
    accountId: string,
    debitBase: number,
    creditBase: number,
  ) => {
    const isForeign =
      expense.currency_code &&
      expense.currency_code !== expense.basCurrncy &&
      expense.exchangeRate &&
      expense.exchangeRate !== 1;

    const baseAmountValue =
      debitBase > 0
        ? debitBase
        : creditBase || expense.baseAmount || expense.amount;

    return {
      companyId,
      accountId,
      debit: debitBase,
      credit: creditBase,
      memo,
      ...(isForeign
        ? {
            currencyCode: expense.currency_code,
            foreignAmount: expense.amountFC ?? baseAmountValue,
            exchangeRate: expense.exchangeRate,
            baseAmount: baseAmountValue,
          }
        : {
            currencyCode: expense.basCurrncy,
            baseAmount: baseAmountValue,
          }),
    };
  };

  const journalLines = [
    createLine(expense.accountId, expense.baseAmount, 0),
    createLine(creditAccountId, 0, expense.baseAmount),
  ];

  await prisma.$transaction(async (tx) => {
    await tx.journalHeader.create({
      data: {
        companyId,
        entryNumber,
        description: memo,
        branchId: expense.branchId,
        referenceType: "expense",
        referenceId: expense.id,
        entryDate: new Date(expense.expenseDate),
        status: "POSTED",
        createdBy: userId,
        lines: {
          create: journalLines,
        },
      },
    });

    for (const line of journalLines) {
      const delta = Number(line.debit) - Number(line.credit);

      await tx.accounts.update({
        where: { id: line.accountId },
        data: {
          balance: {
            increment: delta,
          },
        },
      });
    }
  });
}

async function createSaleJournalEntries({
  companyId,
  sale, // هذا الكائن يأتي الآن من الـ payload
  saleItems,
  customer,
  cashierId,
  returnTotalCOGS,
}: {
  companyId: string;
  sale: any;
  customer: any;
  saleItems: any[];
  cashierId: string;
  returnTotalCOGS: number;
}) {
  // 1️⃣ استخراج بيانات العملة من الـ sale (الـ payload)
  const { currency, exchangeRate, foreignAmount, baseAmount, baseCurrency } =
    sale;
  const isForeign = currency && exchangeRate && exchangeRate !== 1;

  // 2️⃣ التأكد من عدم التكرار وجلب السنة المالية
  const [exists, fy] = await Promise.all([
    prisma.journal_entries.findFirst({
      where: { reference_id: sale.id, reference_type: "sale" },
      select: { id: true },
    }),
    getActiveFiscalYears(), // افترضنا أن هذه الدالة تجلب السنة المالية النشطة
  ]);

  if (exists) return;

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

  const entries: any[] = [];
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
  // التأكد من وجود الحسابات المطلوبة ومنع حدوث خطأ undefined
  if (!cash || !ar || !revenue || !inventory || !cogs) {
    throw new Error(`
    فشل في إنشاء القيد: بعض الحسابات غير مربوطة. 
    المفقود: ${!cash ? "الصندوق، " : ""}${!ar ? "المدينون، " : ""}${!revenue ? "المبيعات، " : ""}${!inventory ? "المخزن، " : ""}${!cogs ? "التكلفة" : ""}
  `);
  }
  // const total = Number(sale.totalAmount);
  // const paid = Number(sale.amountPaid);
  // دالة مساعدة لإنشاء قيد يدعم العملات
  // 4️⃣ تحديث الدالة المساعدة لتستخدم مسميات عربية
  const createEntry = (
    accountId: string,
    description: string,
    debitBase: number,
    creditBase: number,
    suffix: string,
    refId: string,
    refType: string, // سيتم تمرير المسمى العربي هنا
    isCogsRelated: boolean = false,
  ) => {
    const useForeign = isForeign && !isCogsRelated;
    return {
      company_id: companyId,
      entry_date: new Date(),
      fiscal_period: fy?.period_name,
      created_by: cashierId,
      is_automated: true,
      branch_id: sale.branchId,
      account_id: accountId,
      description,
      entry_number: `${entryBase}-${suffix}`,

      reference_id: refId,
      reference_type: refType, // القيمة العربية

      debit: debitBase,
      credit: creditBase,

      ...(useForeign
        ? {
            // حالة الحسابات المالية في فاتورة أجنبية
            currency_code: currency,
            exchange_rate: exchangeRate,
            foreign_amount: foreignAmount,
            base_amount: baseAmount,
          }
        : {
            // حالة حسابات التكلفة/المخزن أو الفواتير المحلية
            currency_code: baseCurrency, // العملة الأساسية للنظام
          }),
    };
  };
  // 5️⃣ منطق القيد المحاسبي
  const totalBase = Number(sale.totalAmount);
  const paidBase = Number(sale.amountPaid);
  const desc = `فاتوره مبيعات: ${sale.saleNumber} العمله:(${currency})`;
  // entries.push(
  // );

  if (sale.status === "paid") {
    entries.push(
      createEntry(
        revenue,
        desc,
        0,
        totalBase,

        "REV",
        customer?.id,
        "فاتورة مبيعات",
        true,
      ),

      createEntry(cash, desc, paidBase, 0, "CSH", customer?.id, "سند قبض "),
    );
  } else if (sale.status === "partial") {
    if (paidBase > 0) {
      // الجزء النقدي: المرجع هو العميل
      entries.push(
        createEntry(
          cash,
          desc + " - دفع نقدي",
          paidBase,
          0,
          "CSH",
          sale.id,
          "سند قبض ",
        ),
      );
    }
    const dueBase = totalBase - paidBase;

    // المديونية: المرجع هو العميل (يظهر في كشف حسابه)
    entries.push(
      createEntry(
        revenue,
        desc,
        0,
        totalBase,
        "REV",
        sale.id,
        "فاتورة مبيعات",
        true,
      ),

      createEntry(
        ar,
        desc + " - متبقي من الفاتوره",
        dueBase,
        0,
        "AR",
        customer?.id,
        "فاتوره مبيعات",
      ),
      // createEntry(
      //   ar,
      //   desc + " - مديونية",
      //   0,
      //   paidBase,

      //   "AR",
      //   customer?.id,
      //   "مدفوع جزءي من الفاتوره",
      // ),
    );
  } else {
    // آجل بالكامل: المرجع هو العميل
    entries.push(
      createEntry(
        revenue,
        desc,
        0,
        totalBase,
        "REV",
        sale.id,
        "فاتورة مبيعات",
        true,
      ),

      createEntry(ar, desc, totalBase, 0, "AR", customer?.id, "فاتوره مبيعات"),
    );
  }

  // 6️⃣ التكلفة والمخزون: مرجع داخلي للفاتورة (لن يظهر للعميل)
  if (returnTotalCOGS > 0) {
    entries.push(
      createEntry(
        cogs,
        desc + " - تكلفة",
        returnTotalCOGS,
        0,
        "CG1",
        sale.id,
        "حركة مخزنية بيع",
        true,
      ),
      createEntry(
        inventory,
        desc + " - مخزن",
        0,
        returnTotalCOGS,
        "CG2",
        sale.id,
        "حركة مخزنية بيع",
        true,
      ),
    );
  }
  // 7️⃣ تنفيذ الحفظ وتحديث الأرصدة
  await prisma.$transaction(async (tx) => {
    await tx.journal_entries.createMany({ data: entries });

    // تحديث أرصدة الحسابات (بالعملة الأساسية)
    // ... (استخدم نفس منطق accountDeltas السابق لتحديث tx.accounts)
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
  const isForeign =
    paymentDetails.currency_code &&
    paymentDetails.exchangeRate &&
    paymentDetails.exchangeRate !== 1;
  const entries: any[] = [];
  const totalAmount = Number(purchase.totalAmount);
  const amountPaid = Number(purchase.amountPaid);
  const createEntry = (
    accountId: string,
    description: string,
    debitBase: number,
    creditBase: number,
    suffix: string,
    refId: string,
    refType: string, // سيتم تمرير المسمى العربي هنا
    isCogsRelated: boolean = false,
  ) => {
    const useForeign = isForeign && !isCogsRelated;
    return {
      company_id: companyId,
      entry_date: new Date(),
      fiscal_period: fy?.period_name,
      created_by: userId,
      is_automated: true,
      branch_id: branchId,
      account_id: accountId,
      description,
      entry_number: `${entryBase}-${suffix}`,

      reference_id: refId,
      reference_type: refType, // القيمة العربية

      debit: debitBase,
      credit: creditBase,

      ...(useForeign
        ? {
            // حالة الحسابات المالية في فاتورة أجنبية
            currency_code: paymentDetails.currency_code,
            exchange_rate: paymentDetails.exchangeRate,
            foreign_amount: paymentDetails.amountFC,
            base_amount: paymentDetails.amountBase,
          }
        : {
            // حالة حسابات التكلفة/المخزن أو الفواتير المحلية
            currency_code: paymentDetails.baseCurrency, // العملة الأساسية للنظام
          }),
    };
  };
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
        createEntry(
          inventoryAccount,

          description +
            " - إضافة للمخزون" +
            (purchase.referenceNumber ? ` - ${purchase.referenceNumber}` : ""),
          totalAmount,
          0,
          "-DR1",
          purchase.id,

          "إضافة مخزون",
        ),
        // Credit Cash/Bank
        createEntry(
          paymentDetails.bankId,

          description +
            " - مدفوع بالكامل" +
            (paymentDetails?.refrenceNumber
              ? ` - ${paymentDetails.refrenceNumber}`
              : ""),
          0,
          totalAmount,
          "-CR1",
          purchase.id,
          "سداد مشتريات",
        ),
      );
    } else if (amountPaid > 0 && amountPaid < totalAmount) {
      // 2️⃣ Partial Payment
      const due = totalAmount - amountPaid;
      const paymentAccount =
        purchase.paymentMethod === "bank" ? bankAccount : cashAccount;

      entries.push(
        // Debit Inventory
        createEntry(
          inventoryAccount,

          description +
            " - إضافة للمخزون" +
            (paymentDetails?.refrenceNumber
              ? ` - ${paymentDetails.refrenceNumber}`
              : ""),

          totalAmount,
          0,
          "-DR1",
          purchase.id,
          "إضافة مخزون",
        ),
        // Credit Cash/Bank (paid amount)
        createEntry(
          paymentDetails.bankId,

          description +
            " - دفع جزئي" +
            (paymentDetails?.refrenceNumber
              ? ` - ${paymentDetails.refrenceNumber}`
              : ""),
          0,
          amountPaid,
          "-CR1",
          paymentDetails.id,
          "دفع مشتريات",
        ),
        // Credit Accounts Payable (remaining)
        createEntry(
          payableAccount,

          description +
            " - آجل للمورد" +
            (paymentDetails?.refrenceNumber
              ? ` - ${paymentDetails.refrenceNumber}`
              : ""),
          0,
          totalAmount,
          "-CR2",
          purchase.supplierId,
          "آجل مشتريات",
        ),
        createEntry(
          payableAccount,
          description + " - آجل للمورد",
          amountPaid,
          0,
          "-CR5",
          purchase.supplierId,
          "آجل مشتريات",
        ),
      );
    } else {
      // 3️⃣ Fully On Credit
      entries.push(
        // Debit Inventory
        createEntry(
          inventoryAccount,
          description + " - إضافة للمخزون",
          totalAmount,
          0,
          "-DR1",
          purchase.id,
          "إضافة مخزون",
        ),
        // Credit Accounts Payable
        createEntry(
          payableAccount,
          description + " - آجل كامل",
          0,

          totalAmount,
          "-CR1",
          purchase.supplierId,
          " دين للمورد",
        ),
      );
    }
  } else {
    // ===============================
    // PURCHASE RETURN SCENARIOS
    // ===============================

    const remainingAmount = totalAmount - amountPaid;

    // Always credit inventory (reduce)
    entries.push(
      createEntry(
        inventoryAccount,
        description + " - تخفيض المخزون",
        0,
        totalAmount,
        "-CR1",
        purchase.id,
        " مرتجع مشتريات",
      ),
    );

    if (amountPaid > 0) {
      // Has payment - refund cash/bank
      const paymentAccount =
        purchase.paymentMethod === "bank" ? bankAccount : cashAccount;

      entries.push(
        createEntry(
          paymentAccount,
          description + " - استرداد نقدي/بنكي",
          amountPaid,
          0,
          "-DR1",
          purchase.id,
          " مدفوعات للمرتجع",
        ),
      );

      // If there's remaining payable, reduce it
      if (remainingAmount > 0) {
        entries.push(
          createEntry(
            payableAccount,
            description + " - تخفيض الذمم الدائنة",
            remainingAmount,
            0,
            "-DR2",
            purchase.supplierId,
            " مديونية   مرتجع",
          ),
        );
      }
    } else {
      // No payment - reduce payables only
      entries.push(
        createEntry(
          payableAccount,
          description + " - تخفيض الذمم الدائنة",
          totalAmount,
          0,
          "-DR1",
          purchase.supplierId,
          " ذمم دائنة للمرتجع",
        ),
      );
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
          reference_id: customer?.id,
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
          reference_id: customer?.id,
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
