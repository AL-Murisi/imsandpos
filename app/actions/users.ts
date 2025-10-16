"use server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function updateUsers(
  isActive: boolean,
  id: string,
  companyId: string,
) {
  const updateUsers = await prisma.user.update({
    where: { id, companyId },
    data: {
      isActive,
    },
  });
  revalidatePath("/users");
  return updateUsers;
}
export async function deleteCustomer(supplierId: string, companyId: string) {
  try {
    const deletedCustomer = await prisma.supplier.delete({
      where: { id: supplierId, companyId },
    });
    revalidatePath("/suppliers");
    return {
      deletedCustomer,
    };
  } catch (error) {
    console.error("Failed to delete customer:", error);
    throw error;
  }
}
