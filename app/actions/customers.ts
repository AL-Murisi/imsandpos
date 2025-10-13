"use server";
import prisma from "@/lib/prisma";
import { createCusomer, CreateCustomerSchema } from "@/lib/zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
// app/actions/customers.ts
export async function getCustomerById(customerId?: string) {
  try {
    const customers = await prisma.customer.findMany({
      where: { id: customerId },
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
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!customers || customers.length === 0) {
      throw new Error("Customer not found");
    }

    // Convert Decimal fields to string for client
    const result = customers.map((c) => ({
      ...c,
      creditLimit: c.creditLimit?.toString() ?? "0",
      outstandingBalance: c.outstandingBalance.toString(),
    }));

    return result; // ✅ this is an array now
  } catch (error) {
    console.error("Failed to fetch customer:", error);
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

  const customer = await prisma.customer.findFirst({
    where: combinedWhere,
    select: {
      id: true,
      name: true,
      phoneNumber: true,
    },
  });

  if (!customer) return null;

  const debts = await prisma.sale.findMany({
    where: {
      customerId: customer.id,
      amountDue: { gt: 0 },
    },
    select: {
      amountDue: true,
    },
  });

  const totalDebt = debts.reduce(
    (sum, sale) => sum + sale.amountDue.toNumber(),
    0,
  );

  return {
    ...customer,
    totalDebt,
  };
}

/**
 * Update the isActive status of a customer
 * @param status boolean - true for active, false for inactive
 * @param customerId string - ID of the customer
 */
export async function updateCustomerStatus(
  status: boolean,
  customerId: string,
) {
  try {
    const updatedCustomer = await prisma.customer.update({
      where: { id: customerId },
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
export async function deleteCustomer(customerId: string) {
  try {
    const deletedCustomer = await prisma.customer.delete({
      where: { id: customerId },
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

export async function createCutomer(form: createCusomer) {
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
    outstandingBalance,
  } = pared.data;
  console.log(pared.data);
  const outstanding = outstandingBalance.toString();
  try {
    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phoneNumber,
        address,
        city,
        state,
        country,
        outstandingBalance: outstanding,
        customerType,

        taxId,
      },
    });

    return customer;
  } catch (error) {
    console.error("Failed to create customer:", error);
    throw error;
  }
}
