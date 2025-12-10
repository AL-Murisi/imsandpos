"use server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { createCusomer, CreateCustomerSchema } from "@/lib/zod";
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
export async function getCustomerById(
  companyId: string,
  page: number = 0, // 0-indexed page number
  pageSize: number = 5,
  customersquery?: string,
  customerId?: string,
  from?: string,
  to?: string,
) {
  const fromDate = from ? new Date(from).toISOString() : undefined;
  const toDate = to ? new Date(to).toISOString() : undefined;
  try {
    const customers = await prisma.customer.findMany({
      where: {
        id: customerId,
        companyId,
        ...(fromDate && { gte: fromDate }),
        ...(toDate && { lte: toDate }),
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
        name: true,
        email: true,
        phoneNumber: true,
        address: true,
        city: true,
        state: true,
        country: true,
        customerType: true,
        taxId: true,

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

    // Convert Decimal fields to string for client
    const result = customers.map((c) => ({
      ...c,
      creditLimit: c.creditLimit?.toString() ?? "0",
      balance: Number(c.balance),
      outstandingBalance: Number(c.outstandingBalance),
    }));
    const total = await prisma.customer.count({ where: { companyId } });

    return { result, total }; // ✅ this is an array now
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
    const deletedCustomer = await prisma.customer.delete({
      where: { id: customerId, companyId },
    });
    revalidatePath("/customer");
    return {
      ...deletedCustomer,
      creditLimit: deletedCustomer.creditLimit?.toString() ?? "0",
      outstandingBalance: deletedCustomer.outstandingBalance.toString(),
    };
  } catch (error) {
    console.error("Failed to delete customer:", error);
    throw error;
  }
}

export async function createCutomer(form: createCusomer, companyId: string) {
  const pared = CreateCustomerSchema.safeParse(form);
  if (!pared.success) {
    throw new Error("Invalid customer data");
  }

  const {
    name,
    email,
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

    const customer = await prisma.customer.create({
      data: {
        companyId,
        name,
        ...(emailValue ? { email: emailValue } : {}),
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
    createcreateCutomerJournalEntriesWithRetry({
      customerId: customer.id,
      companyId,
      outstandingBalance,
      balance,
      createdBy: session.userId,
    }).catch((err) => {
      console.error("Failed to create supplier payment journal entries:", err);
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
  form: createCusomer,
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
    phoneNumber,
    address,
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
    const existingUser = await prisma.customer.findUnique({
      where: {
        // 💡 FIX: Use the compound unique key defined by @@unique([companyId, email])
        companyId_email: {
          companyId, // <-- Provide the company ID
          email: email ?? "", // <-- Provide the email to search for
        },
      },
    });
    if (existingUser) {
      return { error: "هذا البريد الإلكتروني مستخدم بالفعل" };
    }

    const customer = await prisma.customer.update({
      where: { id, companyId },
      data: {
        companyId: companyId,
        name,
        ...(emailValue ? { email: emailValue } : {}),
        phoneNumber,
        address,
        city,
        state,
        country,
        customerType,
        creditLimit,
        taxId,
      },
    });
    revalidatePath("/customer");
    return { success: true, customer };
  } catch (error) {
    console.error("Failed to create customer:", error);
    throw error;
  }
}
