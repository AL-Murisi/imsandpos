"use server";
import prisma from "@/lib/prisma";
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
export async function getCustomerById(companyId: string, customerId?: string) {
  try {
    const customers = await prisma.customer.findMany({
      where: { id: customerId, companyId },
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
  if (!searchQuery) return null;

  const combinedWhere: any = {
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
    },
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
  console.log(pared.data);
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
    return { success: true, customer };
  } catch (error) {
    console.error("Failed to create customer:", error);
    throw error;
  }
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
