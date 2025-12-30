// ============================================
// 1. FETCH PURCHASES BY SUPPLIER
"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath, unstable_noStore } from "next/cache";
import { CreateSupplierInput, CreateSupplierSchema } from "@/lib/zod";
import { cache } from "react";
import { getSession } from "@/lib/session";
import { getActiveFiscalYears } from "./fiscalYear";
function serializeData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item)) as T;
  }

  const plainObj: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Prisma.Decimal) {
      plainObj[key] = Number(value);
    } else if (value instanceof Date) {
      plainObj[key] = value.toISOString();
    } else if (typeof value === "bigint") {
      plainObj[key] = value.toString();
    } else if (typeof value === "object" && value !== null) {
      plainObj[key] = serializeData(value);
    } else {
      plainObj[key] = value;
    }
  }

  return plainObj;
}
async function getUserCompany() {
  const session = await getSession();
  if (!session?.userId) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { companyId: true },
  });

  if (!user) throw new Error("User not found");
  return { userId: session.userId, companyId: user.companyId };
}
export async function updateSupplier(
  supplierId: string,

  data: Partial<
    Omit<
      {
        name: string;
        contactPerson: string;
        email: string;
        phoneNumber: string;
        address: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
        taxId?: string;
        paymentTerms?: string;
        isActive?: boolean;
      },
      "companyId"
    >
  >,
) {
  try {
    const { companyId } = await getUserCompany();

    // 🔹 Verify supplier belongs to the same company
    const existingSupplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!existingSupplier || existingSupplier.companyId !== companyId) {
      return { success: false, error: "المورد غير موجود أو غير مصرح له" };
    }

    // 🔹 Check if email already exists for another supplier
    if (data.email) {
      const emailExists = await prisma.supplier.findFirst({
        where: {
          email: data.email,
          companyId: companyId,
          NOT: { id: supplierId },
        },
      });

      if (emailExists) {
        return { success: false, error: "البريد الإلكتروني مستخدم بالفعل" };
      }
    }

    // 🔹 Update supplier
    const updatedSupplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        name: data.name ?? existingSupplier.name,
        contactPerson: data.contactPerson ?? existingSupplier.contactPerson,
        email: data.email ?? existingSupplier.email,
        phoneNumber: data.phoneNumber ?? existingSupplier.phoneNumber,
        address: data.address ?? existingSupplier.address,
        city: data.city ?? existingSupplier.city,
        state: data.state ?? existingSupplier.state,
        country: data.country ?? existingSupplier.country,
        postalCode: data.postalCode ?? existingSupplier.postalCode,
        taxId: data.taxId ?? existingSupplier.taxId,
        paymentTerms: data.paymentTerms ?? existingSupplier.paymentTerms,
        isActive: data.isActive ?? existingSupplier.isActive,
      },
    });

    // 🔹 Revalidate suppliers list
    revalidatePath("/suppliers");
    revalidatePath("/admin");

    return { success: true, data: updatedSupplier };
  } catch (error) {
    console.error("❌ Error updating supplier:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "فشل تحديث المورد",
    };
  }
}
export async function slow(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const fetchSuppliers = cache(async (companyId: string) => {
  await slow(1000);
  const total = await prisma.supplier.count({
    where: { companyId: companyId },
  });
  const supplier = await prisma.supplier.findMany({
    where: { companyId: companyId },
    select: {
      id: true,
      name: true,
      contactPerson: true,
      email: true,
      phoneNumber: true,
      address: true,
      city: true,
      state: true,
      country: true,
      postalCode: true,
      taxId: true,
      paymentTerms: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      totalPaid: true,
      totalPurchased: true,
      outstandingBalance: true,
    },
  });
  const serialized = serializeData(supplier);

  return { data: serialized, total };
});
export async function createSupplier(
  form: CreateSupplierInput,
  companyId: string,
) {
  const session = await getSession();
  if (!session) return;
  const parsed = CreateSupplierSchema.safeParse(form);
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }
  const {
    name,
    contactPerson,
    email,
    phoneNumber,
    address,
    city,
    state,
    country,
    postalCode,
    taxId,
    paymentTerms,
    totalPaid,
    totalPurchased,
    outstandingBalance,
  } = parsed.data;
  try {
    const user = await prisma.supplier.create({
      data: {
        name,
        companyId,
        contactPerson,
        email,
        phoneNumber,
        address,
        city,
        state,
        country,
        postalCode,
        taxId,
        paymentTerms,
        totalPaid: totalPaid ?? 0,
        totalPurchased: totalPurchased ?? 0,
        outstandingBalance: outstandingBalance ?? 0,
      },
    });
    revalidatePath("/suppliers");
    revalidatePath("/products");
    await prisma.journalEvent.create({
      data: {
        companyId: companyId,
        eventType: "createsupplier",
        status: "pending",
        entityType: "supplier",
        payload: {
          supplierId: user.id,
          supplierName: user.name,
          outstandingBalance: outstandingBalance,
          totalPaid: totalPaid,
          totalPurchased: totalPurchased,
          createdBy: session.userId,
        },

        processed: false,
      },
    });

    const users = serializeData(user);
    return users;
  } catch (error) {
    console.error("Failed to create user:", error);
    throw error;
  }
}
// async function createSuppliereJournalEntriesWithRetry(
//   params: {
//     supplierId: string;
//     supplierName: string;
//     companyId: string;
//     outstandingBalance?: number;
//     totalPaid?: number;
//     totalPurchased?: number;
//     createdBy: string;
//   },
//   maxRetries = 4,
//   retryDelay = 200,
// ) {
//   let lastError: Error | null = null;

//   for (let attempt = 1; attempt <= maxRetries; attempt++) {
//     try {
//       console.log(
//         `📝 Creating Supplier journal entries (attempt ${attempt}/${maxRetries})...`,
//       );
//       await createSupplierJournalEnteries(params);
//       console.log(
//         `✅ Supplier journal entries created successfully on attempt ${attempt}`,
//       );
//       return;
//     } catch (error: any) {
//       lastError = error;
//       console.error(
//         `❌ Purchase journal entries attempt ${attempt}/${maxRetries} failed:`,
//         error.message,
//       );

//       if (attempt < maxRetries) {
//         const waitTime = retryDelay * Math.pow(2, attempt - 1);
//         console.log(`⏳ Retrying in ${waitTime}ms...`);
//         await new Promise((resolve) => setTimeout(resolve, waitTime));
//       }
//     }
//   }

//   throw new Error(
//     `Failed to create purchase journal entries after ${maxRetries} attempts. Last error: ${lastError?.message}`,
//   );
// }
// export async function createSupplierJournalEnteries({
//   supplierId,
//   supplierName,
//   companyId,
//   outstandingBalance = 0,
//   totalPaid = 0,
//   totalPurchased = 0,
//   createdBy,
// }: {
//   supplierId: string;
//   supplierName: string;
//   companyId: string;
//   outstandingBalance?: number;
//   totalPaid?: number;
//   totalPurchased?: number;
//   createdBy: string;
// }) {
//   // 🔎 Fetch default mappings
//   const mappings = await prisma.account_mappings.findMany({
//     where: { company_id: companyId, is_default: true },
//   });

//   const getAcc = (type: string) =>
//     mappings.find((m) => m.mapping_type === type)?.account_id;

//   const payable = getAcc("accounts_payable");
//   const receivable = getAcc("accounts_receivable");

//   // Generate entry number
//   const year = new Date().getFullYear();
//   const seq = Date.now().toString().slice(-6); // quick unique number
//   const entryBase = `${year}-${seq}-S`;

//   const desc = `الرصيد الافتتاحي للمورد ${supplierName}`;

//   const entries: any[] = [];

//   // =============================
//   // 1️⃣ رصيد دائن عليك (Outstanding Balance)
//   // =============================
//   if (outstandingBalance > 0) {
//     entries.push({
//       company_id: companyId,
//       account_id: payable,
//       description: desc,
//       debit: 0,
//       credit: outstandingBalance,
//       entry_date: new Date(),
//       reference_id: supplierId,
//       reference_type: "رصيد افتتاحي مورد",
//       entry_number: `${entryBase}-1`,
//       created_by: createdBy,
//       is_automated: true,
//     });
//   }

//   // =============================
//   // 2️⃣ رصيد مدين لصالحك (supplierDebit)
//   // totalPaid > totalPurchased
//   // =============================
//   const supplierDebit = totalPaid - totalPurchased;

//   if (supplierDebit > 0) {
//     // 2.1 المورد مدين لنا
//     entries.push({
//       company_id: companyId,
//       account_id: receivable,
//       description: desc,
//       debit: supplierDebit,
//       credit: 0,
//       entry_date: new Date(),
//       reference_id: supplierId,
//       reference_type: "رصيد افتتاحي مورد",
//       entry_number: `${entryBase}-2`,
//       created_by: createdBy,
//       is_automated: true,
//     });

//     // 2.2 تقليل الدائنين
//     entries.push({
//       company_id: companyId,
//       account_id: payable,
//       description: desc,
//       debit: supplierDebit,
//       credit: 0,
//       entry_date: new Date(),
//       reference_id: supplierId,
//       reference_type: "رصيد افتتاحي مورد",
//       entry_number: `${entryBase}-3`,
//       created_by: createdBy,
//       is_automated: true,
//     });
//   }

//   // Nothing to insert
//   if (entries.length === 0) return;

//   await prisma.journal_entries.createMany({ data: entries });
// }

// ============================================
export const getPurchasesByCompany = cache(
  async (
    companyId: string,
    {
      productQuery,
      where,
      from,
      to,
      pageIndex = 0,
      pageSize = 13,
      parsedSort,
    }: {
      productQuery?: string;
      where?: string;
      from?: string;
      to?: string;
      pageIndex?: number;
      pageSize?: number;
      parsedSort?: { id: string; desc: boolean }[];
    } = {},
  ) => {
    try {
      const filters: any = { companyId };

      // Status filter
      if (where && where !== "all") {
        filters.status = where;
      }

      // Date range filter
      if (from || to) {
        filters.createdAt = {};
        if (from) filters.createdAt.gte = new Date(from);
        if (to) filters.createdAt.lte = new Date(to);
      }

      // Product name/SKU filter
      if (productQuery) {
        const items = await prisma.purchaseItem.findMany({
          where: {
            companyId,
            product: {
              OR: [
                { name: { contains: productQuery, mode: "insensitive" } },
                { sku: { contains: productQuery, mode: "insensitive" } },
              ],
            },
          },
          select: { purchaseId: true },
          distinct: ["purchaseId"],
        });

        const purchaseIds = items.map((i) => i.purchaseId);
        if (purchaseIds.length === 0) return { data: [], total: 0 };
        filters.id = { in: purchaseIds };
      }

      // Count total
      const total = await prisma.purchase.count({ where: filters });

      // Sorting

      await slow(1000);

      // Fetch data
      const purchases = await prisma.purchase.findMany({
        where: filters,
        include: {
          purchaseItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                  costPrice: true,
                  unitsPerPacket: true,
                  type: true,
                  packetsPerCarton: true,
                },
              },
            },
          },
          supplier: { select: { id: true, name: true } },
        },

        skip: pageIndex * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      });
      const serialized = serializeData(purchases);
      return { data: serialized, total };
    } catch (error) {
      console.error("Error fetching company purchases:", error);
      throw error;
    }
  },
);

export const getSupplierPaymentsByCompany = cache(
  async (
    companyId: string,
    {
      from,
      to,
      pageIndex = 0,
      pageSize = 13,
      parsedSort,
    }: {
      from?: string;
      to?: string;
      pageIndex?: number;
      pageSize?: number;
      parsedSort?: { id: string; desc: boolean }[];
    } = {},
  ) => {
    try {
      const filters: any = { companyId };

      // Date range
      if (from || to) {
        filters.paymentDate = {};
        if (from) filters.paymentDate.gte = new Date(from);
        if (to) filters.paymentDate.lte = new Date(to);
      }

      // Count total
      const total = await prisma.supplierPayment.count({ where: filters });

      // Sort

      // Fetch

      await slow(1000);
      const payments = await prisma.supplierPayment.findMany({
        where: filters,
        include: {
          supplier: { select: { id: true, name: true } },
          company: true,
        },

        skip: pageIndex * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      });
      const serialized = serializeData(payments);
      return { data: serialized, total };
    } catch (error) {
      console.error("Error fetching company payments:", error);
      throw error;
    }
  },
);

export async function updateSupplierPayment(
  paymentId: string,
  data: {
    amount?: number;
    paymentMethod?: string;
    note?: string;
    paymentDate?: Date;
  },
  userId: string,
  companyId: string,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch current payment
      const currentPayment = await tx.supplierPayment.findUnique({
        where: { id: paymentId },
        include: { supplier: true },
      });

      if (!currentPayment) throw new Error("Payment not found");
      if (currentPayment.companyId !== companyId)
        throw new Error("Unauthorized");

      let purchaseUpdate = null;
      let amountDifference = 0;

      // 2. Amount changed?
      if (data.amount && data.amount !== Number(currentPayment.amount)) {
        amountDifference = data.amount - Number(currentPayment.amount);

        const purchases = await tx.purchase.findMany({
          where: {
            companyId,
            supplierId: currentPayment.supplierId,
            status: { in: ["pending", "partial"] },
          },
        });

        if (purchases.length > 0) {
          const latestPurchase = purchases[purchases.length - 1];
          const newAmountPaid =
            Number(latestPurchase.amountPaid) + amountDifference;
          const newAmountDue = Math.max(
            0,
            Number(latestPurchase.totalAmount) - newAmountPaid,
          );

          purchaseUpdate = await tx.purchase.update({
            where: { id: latestPurchase.id },
            data: {
              amountPaid: Math.max(0, newAmountPaid),
              amountDue: newAmountDue,
              status:
                newAmountDue <= 0
                  ? "paid"
                  : newAmountPaid > 0
                    ? "partial"
                    : "pending",
            },
          });
        }

        // --- 3. UPDATE SUPPLIER TOTALS ---
        await tx.supplier.update({
          where: { id: currentPayment.supplierId, companyId },
          data: {
            totalPaid: {
              set: Math.max(
                0,
                Number(currentPayment.supplier.totalPaid) + amountDifference,
              ),
            },
            outstandingBalance: {
              increment: -amountDifference, // paying reduces balance
            },
          },
        });
      }

      // 4. Update payment
      const updatedPayment = await tx.supplierPayment.update({
        where: { id: paymentId },
        data: {
          ...(data.amount && { amount: data.amount }),
          ...(data.paymentMethod && { paymentMethod: data.paymentMethod }),
          ...(data.note && { note: data.note }),
          ...(data.paymentDate && { paymentDate: data.paymentDate }),
        },
        include: { supplier: true },
      });

      // 5. Log
      await tx.activityLogs.create({
        data: {
          userId,
          companyId,
          action: "updated supplier payment",
          details: `Payment updated for ${currentPayment.supplier.name}: ${updatedPayment.amount}`,
        },
      });

      revalidatePath("/suppliers");

      return {
        success: true,
        payment: updatedPayment,
        purchaseUpdate,
      };
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    throw error;
  }
}
export async function createSupplierPaymentFromPurchases(
  userId: string,
  companyId: string,
  data: {
    status: string;
    createdBy: string;
    supplierId: string;
    purchaseId: string;
    amount: number;
    paymentMethod: string;
    note?: string;
    currency_code: string;
    paymentDate?: Date;
  },
) {
  try {
    const {
      status,
      purchaseId,
      createdBy,
      supplierId,
      currency_code,
      amount,
      paymentMethod,
      note,
      paymentDate,
    } = data;

    // Validation
    if (!supplierId || !amount || amount <= 0 || !purchaseId) {
      throw new Error(
        "Supplier ID, Purchase ID, and valid amount are required",
      );
    }

    // Get supplier
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });
    if (!supplier) throw new Error("Supplier not found");

    // Get specific purchase with current payment status
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        supplierPayments: {
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!purchase) throw new Error("Purchase not found");

    // ✅ Calculate amounts correctly
    const totalAmount = Number(purchase.totalAmount);
    const currentAmountPaid = Number(purchase.amountPaid);
    const currentAmountDue = Number(purchase.amountDue);

    // Calculate new amounts
    const newAmountPaid = currentAmountPaid + amount;
    const newAmountDue = Math.max(0, currentAmountDue - amount);

    // Determine new status
    let newStatus: string;
    if (newAmountDue === 0) {
      newStatus = "paid";
    } else if (newAmountPaid > 0) {
      newStatus = "partial";
    } else {
      newStatus = "pending";
    }

    // Check if payment exceeds amount due
    if (amount > currentAmountDue) {
      throw new Error(
        `Payment amount (${amount}) exceeds amount due (${currentAmountDue})`,
      );
    }

    // ✅ Transaction with proper sequencing
    const result = await prisma.$transaction(
      async (tx) => {
        // 1. Create supplier payment record first
        const supplierPayment = await tx.supplierPayment.create({
          data: {
            companyId,
            supplierId,
            purchaseId, // ✅ Link to purchase
            amount,
            paymentMethod,
            note,
            createdBy,
            paymentDate: paymentDate ?? new Date(),
          },
          include: {
            supplier: true,
            purchase: true,
          },
        });

        // 2. Update purchase with new amounts
        const updatedPurchase = await tx.purchase.update({
          where: { id: purchaseId },
          data: {
            amountPaid: newAmountPaid,
            amountDue: newAmountDue,
            status: newStatus,
            purchaseType: "outstandingpayment", // ✅ Trigger the database trigger
          },
        });

        // 3. Update supplier totals
        const supplierUpdateData: any = {
          totalPaid: { increment: amount },
        };

        // Reduce supplier outstanding ONLY if purchase had outstanding
        if (currentAmountDue > 0) {
          supplierUpdateData.outstandingBalance = { decrement: amount };
        }

        await tx.supplier.update({
          where: { id: supplierId, companyId },
          data: supplierUpdateData,
        });
        await tx.journalEvent.create({
          data: {
            companyId: companyId,
            eventType: "purchase-payment",
            status: "pending",
            entityType: "payment-purchase",
            payload: {
              companyId,

              supplierId,
              supplierPayment: supplierPayment,
              userId,
              currency_code: currency_code,
            },
            processed: false,
          },
        });
        revalidatePath("/suppliers");
        return {
          supplierPayment,
          updatedPurchase,
          previousAmountPaid: currentAmountPaid,
          previousAmountDue: currentAmountDue,
        };
      },
      {
        timeout: 30000,
        // ✅ Important: Ensure triggers are executed
        isolationLevel: "ReadCommitted",
      },
    );

    const {
      supplierPayment,
      updatedPurchase,
      previousAmountPaid,
      previousAmountDue,
    } = result;

    // Log activity
    await prisma.activityLogs.create({
      data: {
        userId,
        companyId,
        action: "Created supplier payment",
        details: `Supplier: ${supplierPayment.supplier.name}, Payment: ${amount}, Purchase: ${purchaseId}. Previous paid: ${previousAmountPaid}, New paid: ${newAmountPaid}. Previous due: ${previousAmountDue}, New due: ${newAmountDue}.`,
      },
    });

    // createPurchaseJournalEntriesWithRetry({
    //   payment: supplierPayment,
    //   companyId,
    //   userId,
    // }).catch((err) => {
    //   console.error("Failed to create supplier payment journal entries:", err);
    // });
    return {
      success: true,
      payment: serializeData(supplierPayment),
      updatedPurchase: serializeData(updatedPurchase),
      summary: {
        previousAmountPaid,
        newAmountPaid,
        previousAmountDue,
        newAmountDue,
        paymentAmount: amount,
        newStatus,
      },
    };
  } catch (error) {
    console.error("❌ Error creating supplier payment:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create payment",
    };
  }
}
async function createPurchaseJournalEntriesWithRetry(
  params: { payment: any; companyId: string; userId: string },
  maxRetries = 4,
  retryDelay = 200,
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `📝 Creating SupplierPayment journal entries (attempt ${attempt}/${maxRetries})...`,
      );
      await createSupplierPaymentJournalEntries(params);
      console.log(
        `✅ Purchase journal entries created successfully on attempt ${attempt}`,
      );
      return;
    } catch (error: any) {
      lastError = error;
      console.error(
        `❌ SupplierPayment journal entries attempt ${attempt}/${maxRetries} failed:`,
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
    `Failed to create SupplierPayment journal entries after ${maxRetries} attempts. Last error: ${lastError?.message}`,
  );
}

export async function createSupplierPaymentJournalEntries({
  payment,
  companyId,
  userId,
}: {
  payment: any;
  companyId: string;
  userId: string;
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
    payment.paymentMethod === "bank" ? bankAccount : cashAccount;
  const entry_number = `SP-${payment.id.slice(0, 6)}`;
  const description = `${payment.id} سداد للمورد`;

  // Helper to update account balance
  const updateAccountBalance = async (
    account_id: string,
    debit: number,
    credit: number,
  ) => {
    await prisma.accounts.update({
      where: { id: account_id },
      data: { balance: { increment: credit - debit } },
    });
  };

  // 1️⃣ Debit Accounts Payable
  await prisma.journal_entries.create({
    data: {
      company_id: companyId,
      account_id: payableAccount,
      description,
      debit: payment.amount,
      credit: 0,
      fiscal_period: fy.period_name,
      reference_type: "سداد_دين_المورد",

      reference_id: payment.supplierId,
      entry_number: entry_number + "-D",
      created_by: userId,
      is_automated: true,
    },
  });
  await updateAccountBalance(payableAccount, payment.amount, 0);

  // 2️⃣ Credit Cash/Bank
  await prisma.journal_entries.create({
    data: {
      company_id: companyId,
      account_id: paymentAccount,
      description,
      debit: payment.amount,
      fiscal_period: fy.period_name,
      credit: 0,
      reference_type: "سداد_دين_المورد",
      reference_id: payment.id,
      entry_number: entry_number + "-C",
      created_by: userId,
      is_automated: true,
    },
  });
  await updateAccountBalance(paymentAccount, payment.amount, 0);
}

export async function getPurchasePaymentHistory(
  purchaseId: string,
  companyId: string,
) {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: purchaseId, companyId },
      include: {
        supplierPayments: {
          orderBy: { paymentDate: "desc" },
          include: {
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!purchase) {
      throw new Error("Purchase not found");
    }

    // Calculate cumulative totals
    let runningPaid = 0;
    const paymentsWithRunningTotal = purchase.supplierPayments
      .map((payment) => {
        runningPaid += Number(payment.amount);
        return {
          ...payment,
          cumulativePaid: runningPaid,
          remainingDue: Number(purchase.totalAmount) - runningPaid,
        };
      })
      .reverse(); // Reverse to show oldest first with running total

    return {
      success: true,
      purchase: {
        id: purchase.id,
        totalAmount: Number(purchase.totalAmount),
        amountPaid: Number(purchase.amountPaid),
        amountDue: Number(purchase.amountDue),
        status: purchase.status,
        supplier: purchase.supplier,
      },
      payments: serializeData(paymentsWithRunningTotal),
    };
  } catch (error) {
    console.error("❌ Error getting payment history:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to get payment history",
    };
  }
}

export async function getSupplierSummary(
  supplierId: string,
  companyId: string,
) {
  try {
    const [purchases, payments, totalPurchases] = await Promise.all([
      prisma.purchase.findMany({
        where: { companyId, supplierId },
        select: {
          totalAmount: true,
          amountPaid: true,
          amountDue: true,
          status: true,
        },
      }),
      prisma.supplierPayment.findMany({
        where: { companyId, supplierId },
        select: { amount: true },
      }),
      prisma.purchase.count({
        where: { companyId, supplierId },
      }),
    ]);

    const totalAmount = purchases.reduce(
      (sum, p) => sum + Number(p.totalAmount),
      0,
    );
    const totalPaid = purchases.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0,
    );
    const totalDue = purchases.reduce((sum, p) => sum + Number(p.amountDue), 0);

    return {
      totalPurchases,
      totalAmount,
      totalPaid,
      totalDue,
      balance: totalDue,
      purchaseCount: purchases.length,
      paymentCount: payments.length,
      statusBreakdown: {
        pending: purchases.filter((p) => p.status === "pending").length,
        partial: purchases.filter((p) => p.status === "partial").length,
        paid: purchases.filter((p) => p.status === "paid").length,
        received: purchases.filter((p) => p.status === "received").length,
      },
    };
  } catch (error) {
    console.error("Error fetching supplier summary:", error);
    throw error;
  }
}
