"use server";
import prisma from "@/lib/prisma";
import { createCusomer, CreateCustomerSchema } from "@/lib/zodType";
import { Prisma } from "@prisma/client";
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
    0
  );

  return {
    ...customer,
    totalDebt,
  };
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
  } = pared.data;
  console.log(pared.data);
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

        customerType,

        taxId,
      },
    });
    console.log(customer);

    return customer;
  } catch (error) {
    console.error("Failed to create customer:", error);
    throw error;
  }
}
