"use server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { CreateCustomer, CreateCustomerSchema } from "@/lib/zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
// app/actions/customers.ts
//
function serializeData<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item)) as T;
  }

  const plainObj: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Prisma.Decimal) {
      plainObj[key] = value.toNumber(); // or value.toString() if you prefer
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

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function resolveCustomerOpeningOffsetAccount(
  tx: Prisma.TransactionClient,
  companyId: string,
) {
  const preferredMappings = [
    "opening_balance_equity",
    "retained_earnings",
    "owner_equity",
  ];

  const mappedAccount = await tx.account_mappings.findFirst({
    where: {
      company_id: companyId,
      mapping_type: { in: preferredMappings },
      is_default: true,
    },
    select: { account_id: true },
  });

  if (mappedAccount?.account_id) {
    return mappedAccount.account_id;
  }

  const fallbackEquityAccount = await tx.accounts.findFirst({
    where: {
      company_id: companyId,
      account_type: "EQUITY",
      is_active: true,
    },
    orderBy: [{ is_system: "desc" }, { account_code: "asc" }],
    select: { id: true },
  });

  return fallbackEquityAccount?.id ?? null;
}

async function createCustomerOpeningBalanceArtifacts(
  tx: Prisma.TransactionClient,
  params: {
    companyId: string;
    customerId: string;
    customerName: string;
    createdBy: string;
    outstandingBalance: number;
  },
) {
  if (params.outstandingBalance <= 0) {
    return null;
  }

  const mappings = await tx.account_mappings.findMany({
    where: { company_id: params.companyId, is_default: true },
    select: { mapping_type: true, account_id: true },
  });

  const arAccount = mappings.find(
    (mapping) => mapping.mapping_type === "accounts_receivable",
  )?.account_id;

  if (!arAccount) {
    throw new Error("Accounts receivable account mapping is required");
  }

  const offsetAccount = await resolveCustomerOpeningOffsetAccount(
    tx,
    params.companyId,
  );

  if (!offsetAccount) {
    throw new Error("No equity account found for opening balance posting");
  }

  const company = await tx.company.findUnique({
    where: { id: params.companyId },
    select: { base_currency: true },
  });

  const invoiceNumber = `OPEN-AR-${Date.now()}-${params.customerId.slice(-4).toUpperCase()}`;
  const description = `رصيد افتتاحي عميل - ${params.customerName} - ${invoiceNumber}`;
  const entryNumber = `JE-OPEN-CUST-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const openingInvoice = await tx.invoice.create({
    data: {
      companyId: params.companyId,
      invoiceNumber,
      cashierId: params.createdBy,
      customerId: params.customerId,
      customerName: params.customerName,
      sale_type: "SALE",
      status: "unpaid",
      totalAmount: params.outstandingBalance,
      amountPaid: 0,
      amountDue: params.outstandingBalance,
      currencyCode: company?.base_currency ?? null,
      baseAmount: params.outstandingBalance,
      invoiceDate: new Date(),
    },
  });

  await tx.journalHeader.create({
    data: {
      companyId: params.companyId,
      entryNumber,
      description,
      referenceType: "رصيد افتتاحي عميل",
      referenceId: openingInvoice.id,
      entryDate: new Date(),
      status: "POSTED",
      createdBy: params.createdBy,
      lines: {
        create: [
          {
            companyId: params.companyId,
            accountId: arAccount,
            debit: params.outstandingBalance,
            credit: 0,
            currencyCode: company?.base_currency ?? null,
            baseAmount: params.outstandingBalance,
            memo: `${description} - مدين`,
          },
          {
            companyId: params.companyId,
            accountId: offsetAccount,
            debit: 0,
            credit: params.outstandingBalance,
            currencyCode: company?.base_currency ?? null,
            baseAmount: params.outstandingBalance,
            memo: `${description} - مقابل الرصيد الافتتاحي`,
          },
        ],
      },
    },
  });

  return openingInvoice;
}
export async function getCustomerById(
  companyId: string,
  page: number = 0, // 0-indexed page number
  pageSize: number = 5,
  customersquery?: string,
  customerId?: string,
  from?: string,
  to?: string,
) {
  try {
    const mappings = await prisma.account_mappings.findMany({
      where: { company_id: companyId, is_default: true },
      select: { mapping_type: true, account_id: true },
    });
    const arAccount = mappings.find(
      (m) => m.mapping_type === "accounts_receivable",
    )?.account_id;
    if (!arAccount) {
      throw new Error("Accounts receivable not mapped");
    }

    const fiscalYear = await prisma.fiscal_periods.findFirst({
      where: {
        company_id: companyId,
        is_closed: false,
      },
      select: { start_date: true, end_date: true },
    });

    const fromDate = from
      ? new Date(from)
      : fiscalYear
        ? new Date(fiscalYear.start_date)
        : undefined;
    const toDate = to
      ? new Date(to)
      : fiscalYear
        ? new Date(fiscalYear.end_date)
        : undefined;

    fromDate?.setHours(0, 0, 0, 0);
    toDate?.setHours(23, 59, 59, 999);

    const customers = await prisma.customer.findMany({
      where: {
        id: customerId,
        companyId,
        ...(customersquery && {
          OR: [
            { name: { contains: customersquery, mode: "insensitive" } },
            { phoneNumber: { contains: customersquery } },
            { email: { contains: customersquery, mode: "insensitive" } },
          ],
        }),
      },
      select: {
        id: true,
        userId: true,
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        city: true,
        state: true,
        country: true,
        customerType: true,
        taxId: true,
        preferred_currency: true,
        creditLimit: true,
        outstandingBalance: true,
        balance: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      skip: page * pageSize,
      take: pageSize,
    });
    const result = await Promise.all(
      customers.map(async (customer) => {
        const invoiceIds = await prisma.invoice.findMany({
          where: { companyId, customerId: customer.id },
          select: { id: true },
        });
        const invoiceIdList = invoiceIds.map((i) => i.id);

        const paymentIds = await prisma.financialTransaction.findMany({
          where: {
            companyId,
            customerId: customer.id,
            createdAt: {
              ...(fromDate && { gte: fromDate }),
              ...(toDate && { lte: toDate }),
            },
          },
          select: { id: true },
        });
        const paymentIdList = paymentIds.map((p) => p.id);
        const customerReferenceIds = [
          customer.id,
          ...invoiceIdList,
          ...paymentIdList,
        ];
        const openingLines = fromDate
          ? await prisma.journalLine.findMany({
              where: {
                companyId,
                accountId: arAccount,
                header: {
                  referenceId: { in: customerReferenceIds },
                  entryDate: { lt: fromDate },
                },
              },
              select: { debit: true, credit: true },
            })
          : [];

        const entries =
          fromDate && toDate
            ? await prisma.journalLine.findMany({
                where: {
                  companyId,
                  accountId: arAccount,
                  header: {
                    referenceId: { in: customerReferenceIds },
                    entryDate: {
                      gte: fromDate,
                      lte: toDate,
                    },
                  },
                },
                select: {
                  debit: true,
                  credit: true,
                },
              })
            : [];

        const openingBalance = openingLines.reduce(
          (sum, line) => sum + Number(line.debit || 0) - Number(line.credit || 0),
          0,
        );

        const periodDebit = entries.reduce(
          (s, t) => s + Number(t.debit || 0),
          0,
        );
        const periodCredit = entries.reduce(
          (s, t) => s + Number(t.credit || 0),
          0,
        );
        const closingBalance = openingBalance + periodDebit - periodCredit;

        return {
          ...customer,
          creditLimit: customer.creditLimit?.toString() ?? "0",
          balance: closingBalance,
          totalPayments: periodCredit,
          outstandingBalance: closingBalance,
        };
      }),
    );

    const total = await prisma.customer.count({ where: { companyId } });

    return { result: serializeData(result), total }; // ✅ this is an array now
  } catch (error) {
    throw error;
  }
}

export async function Fetchcustomerbyname(searchQuery?: string) {
  const combinedWhere: any = {
    companyId: (await getSession())?.companyId,

    OR: [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { phoneNumber: { contains: searchQuery, mode: "insensitive" } },
    ],
  };

  const customer = await prisma.customer.findMany({
    where: combinedWhere,
    select: {
      id: true,
      name: true,
      phoneNumber: true,
      creditLimit: true,
      outstandingBalance: true,
      address: true,
      city: true,

      preferred_currency: true,
      balance: true,
    },
    take: 10, // Limit to 10 results
    orderBy: { name: "asc" },
  });

  if (!customer) return null;

  // const debts = await prisma.sale.findMany({
  //   where: {
  //     customerId: customer.id,
  //     amountDue: { gt: 0 },
  //   },
  //   select: {
  //     amountDue: true,
  //   },
  // });
  const cusomers = serializeData(customer);

  return cusomers;
}

/**
 * Update the isActive status of a customer
 * @param status boolean - true for active, false for inactive
 * @param customerId string - ID of the customer
 */
export async function updateCustomerStatus(
  status: boolean,
  customerId: string,
  companyId: string,
) {
  try {
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId, companyId: companyId },
      data: { isActive: status },
    });
    revalidatePath("/customer");
    return {
      ...updatedCustomer,
      creditLimit: updatedCustomer.creditLimit?.toString() ?? "0",
      outstandingBalance: updatedCustomer.outstandingBalance.toString(),
    };
  } catch (error) {
    console.error("Failed to update customer status:", error);
    throw error;
  }
}

/**
 * Delete a customer by ID
 * @param customerId string - ID of the customer
 */
export async function deleteCustomer(customerId: string, companyId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: customerId, companyId },
        select: { userId: true },
      });

      const deletedCustomer = await tx.customer.delete({
        where: { id: customerId, companyId },
      });

      if (customer?.userId) {
        await tx.userRole.deleteMany({ where: { userId: customer.userId } });
        await tx.userInvite.deleteMany({ where: { userId: customer.userId } });
        await tx.pushSubscription.deleteMany({
          where: { userId: customer.userId },
        });
        await tx.pushDeviceToken.deleteMany({
          where: { userId: customer.userId },
        });
        await tx.user.delete({
          where: { id: customer.userId, companyId },
        });
      }

      return deletedCustomer;
    });
    revalidatePath("/customer");
    revalidatePath("/user");
    return {
      ...result,
      creditLimit: result.creditLimit?.toString() ?? "0",
      outstandingBalance: result.outstandingBalance.toString(),
    };
  } catch (error) {
    console.error("Failed to delete customer:", error);
    throw error;
  }
}

export async function createCutomer(form: CreateCustomer, companyId: string) {
  const pared = CreateCustomerSchema.safeParse(form);
  if (!pared.success) {
    throw new Error("Invalid customer data");
  }

  const {
    name,
    email,
    password,
    phoneNumber,
    address,
    city,
    state,
    country,
    customerType,
    taxId,
    creditLimit,
    outstandingBalance,
    balance,
  } = pared.data;
  const session = await getSession();
  if (!session) return;
  const emailValue = email?.trim() || null;
  const outstanding = outstandingBalance?.toString() ?? 0;
  try {
    // Assuming 'companyIdValue' is the variable holding the company's ID

    // Assume companyIdValue and email are non-null strings
    const existingUser = await prisma.customer.findUnique({
      where: {
        // 💡 FIX: Use the compound unique key defined by @@unique([companyId, email])
        companyId_email: {
          companyId: companyId, // <-- Provide the company ID
          email: email ?? "", // <-- Provide the email to search for
        },
      },
    });
    if (existingUser) {
      return { error: "هذا البريد الإلكتروني مستخدم بالفعل" };
    }

    const customerRole = await prisma.role.findFirst({
      where: { name: { equals: "customer", mode: "insensitive" } },
      select: { id: true },
    });

    let linkedUserId: string | null = null;

    if (emailValue) {
      if (!password) {
        return { error: "كلمة المرور مطلوبة لإنشاء حساب العميل" };
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: emailValue.toLowerCase() },
        select: { id: true },
      });

      if (existingUser) {
        return { error: "هذا البريد مستخدم بالفعل في المستخدمين" };
      }

      if (!customerRole) {
        return { error: "دور customer غير موجود في النظام" };
      }

      const createdUser = await prisma.user.create({
        data: {
          companyId,
          email: emailValue.toLowerCase(),
          name,
          phoneNumber: normalizeOptionalString(phoneNumber),
          password,
          role: "customer",
        },
      });

      // await prisma.userRole.create({
      //   data: {
      //     userId: createdUser.id,
      //     roleId: customerRole.id,
      //   },
      // });

      linkedUserId = createdUser.id;
    }

    const customer = await prisma.customer.create({
      data: {
        companyId,
        userId: linkedUserId,
        name,
        ...(emailValue ? { email: emailValue.toLowerCase() } : {}),
        phoneNumber,
        address,
        city,
        state,
        country,
        creditLimit,
        outstandingBalance: outstanding,
        customerType,
        balance,
        taxId,
      },
    });
    revalidatePath("/customer");
    revalidatePath("/user");
    await prisma.journalEvent.create({
      data: {
        companyId: companyId,
        eventType: "createCutomer",
        status: "pending",
        entityType: "Cutomer",
        payload: {
          companyId: companyId,
          customerId: customer.id,
          outstandingBalance: outstandingBalance,
          balance: balance,
          createdBy: session.userId,
        },

        processed: false,
      },
    });

    return { success: true, customer };
  } catch (error) {
    console.error("Failed to create customer:", error);
    throw error;
  }
}
async function createcreateCutomerJournalEntriesWithRetry(
  params: {
    customerId: string;
    companyId: string;
    outstandingBalance?: number;
    balance?: number;
    createdBy: string;
  },
  maxRetries = 4,
  retryDelay = 200,
) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `📝 Creating createCutomer journal entries (attempt ${attempt}/${maxRetries})...`,
      );
      await createCustomerJournalEnteries(params);
      console.log(
        `✅ createCutomer journal entries created successfully on attempt ${attempt}`,
      );
      return;
    } catch (error: any) {
      lastError = error;
      console.error(
        `❌ Purchase journal entries attempt ${attempt}/${maxRetries} failed:`,
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
    `Failed to create purchase journal entries after ${maxRetries} attempts. Last error: ${lastError?.message}`,
  );
}

export async function createCustomerJournalEnteries({
  customerId,
  companyId,
  outstandingBalance = 0,
  balance = 0, // رصيد لصالح العميل (سلف / مبالغ مدفوعة مقدماً)
  createdBy,
}: {
  customerId: string;
  companyId: string;
  outstandingBalance?: number;
  balance?: number;
  createdBy: string;
}) {
  // 1️⃣ fetch account mappings
  const mappings = await prisma.account_mappings.findMany({
    where: { company_id: companyId, is_default: true },
  });

  const getAcc = (type: string) =>
    mappings.find((m) => m.mapping_type === type)?.account_id;

  const ar = getAcc("accounts_receivable"); // العملاء (مدينون)
  const payable = getAcc("accounts_payable"); // دائنون (رصيد لصالح العميل)

  if (!ar || !payable) {
    throw new Error("Missing account mappings for customers");
  }

  // 2️⃣ entry number base
  const year = new Date().getFullYear();
  const seq = Date.now().toString().slice(-6);
  const entryBase = `${year}-${seq}-CUST`;

  const desc = `الرصيد الافتتاحي للعميل`;

  const entries: any[] = [];

  // ==============================
  // 1️⃣ العميل عليه دين (outstandingBalance)
  // ==============================
  if (outstandingBalance > 0) {
    entries.push({
      company_id: companyId,
      account_id: ar,
      description: desc,
      debit: outstandingBalance,
      credit: 0,
      entry_date: new Date(),
      reference_id: customerId,
      reference_type: "رصيد افتتاحي عميل",
      entry_number: `${entryBase}-1`,
      created_by: createdBy,
      is_automated: true,
    });
  }

  // ==============================
  // 2️⃣ لديك رصيد لصالح العميل (balance)
  // ==============================
  if (balance > 0) {
    entries.push({
      company_id: companyId,
      account_id: ar,
      description: desc,
      debit: 0,
      credit: balance,
      entry_date: new Date(),
      reference_id: customerId,
      reference_type: "رصيد افتتاحي عميل",
      entry_number: `${entryBase}-2`,
      created_by: createdBy,
      is_automated: true,
    });
  }

  if (entries.length === 0)
    return { success: true, msg: "No opening balance detected" };

  await prisma.journal_entries.createMany({ data: entries });

  return { success: true };
}

export async function updatedCustomer(
  form: CreateCustomer,
  id: string,
  companyId: string,
) {
  const pared = CreateCustomerSchema.safeParse(form);
  if (!pared.success) {
    throw new Error("Invalid customer data");
  }

  const {
    name,
    email,
    password,
    phoneNumber,
    address,
    preferred_currency,
    city,
    state,
    country,
    customerType,
    taxId,
    creditLimit,
  } = pared.data;
  console.log(pared.data);
  const emailValue = email?.trim() || null;
  try {
    // Assuming 'companyIdValue' is the variable holding the company's ID

    // Assume companyIdValue and email are non-null strings

    if (!id) {
      return { error: "هذا البريد الإلكتروني مستخدم بالفعل" };
    }

    const existingCustomer = await prisma.customer.findFirst({
      where: { id, companyId },
      select: { userId: true },
    });

    let userId = existingCustomer?.userId ?? null;

    if (emailValue) {
      const customerRole = await prisma.role.findFirst({
        where: { name: { equals: "customer", mode: "insensitive" } },
        select: { id: true },
      });

      if (!userId) {
        if (!password) {
          return { error: "أدخل كلمة مرور لإنشاء حساب العميل" };
        }

        if (!customerRole) {
          return { error: "دور customer غير موجود في النظام" };
        }

        const createdUser = await prisma.user.create({
          data: {
            companyId,
            email: emailValue.toLowerCase(),
            name,
            phoneNumber: normalizeOptionalString(phoneNumber),
            password,
          },
        });

        // await prisma.userRole.create({
        //   data: {
        //     userId: createdUser.id,
        //     roleId: customerRole.id,
        //   },
        // });

        userId = createdUser.id;
      } else {
        await prisma.user.update({
          where: { id: userId, companyId },
          data: {
            email: emailValue.toLowerCase(),
            name,
            phoneNumber: normalizeOptionalString(phoneNumber),
            ...(password ? { password } : {}),
          },
        });
      }
    }

    const customer = await prisma.customer.update({
      where: { id, companyId },
      data: {
        companyId: companyId,
        userId,
        name,
        ...(emailValue ? { email: emailValue.toLowerCase() } : {}),
        phoneNumber,
        address,
        city,
        state,
        country,
        customerType,
        ...(preferred_currency ? { preferred_currency } : {}),
        creditLimit,
        taxId,
      },
    });
    revalidatePath("/customer");
    revalidatePath("/user");
    return { success: true, customer };
  } catch (error) {
    throw error;
  }
}
