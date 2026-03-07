"use server";
import prisma from "@/lib/prisma";
import { CreateUserSchema, UpdateUserSchema } from "@/lib/zod";
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

export async function fetechUser(
  companyId: string,
  searchQuery: string,
  role: any,
  from?: string,
  to?: string,
  page: number = 1,
  pageSize: number = 5,
) {
  const combinedWhere: any = {
    companyId,
  };
  const fromatDate = from ? new Date(from).toISOString() : undefined;
  const toDate = to ? new Date(to).toISOString() : undefined;

  if (searchQuery) {
    combinedWhere.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { phoneNumber: { contains: searchQuery, mode: "insensitive" } },
    ];
  }

  if (role) {
    combinedWhere.roles = {
      some: {
        role: {
          id: {
            equals: role,
            mode: "insensitive",
          },
        },
      },
    };
  }

  if (fromatDate || toDate) {
    combinedWhere.createdAt = {
      ...(fromatDate && { gte: fromatDate }),
      ...(toDate && { lte: toDate }),
    };
  }

  const data = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
      isActive: true,
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    where: combinedWhere,
    skip: page * pageSize,
    take: pageSize,
  });

  return data;
}

export async function createUser(form: any, companyId: string) {
  const parsed = CreateUserSchema.safeParse(form);
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }

  const { email, name, phoneNumber, password, roleId, branchId } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return { error: "Email is already in use" };
    }

    const user = await prisma.user.create({
      data: {
        companyId,
        email: normalizedEmail,
        name,
        phoneNumber,
        password,
        ...(branchId && { branchId }),
      },
    });

    await prisma.userRole.create({
      data: {
        userId: user.id,
        roleId,
      },
    });

    revalidatePath("/users");
    return { success: true, user };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { error: "Failed to create user" };
  }
}

export async function UpdatwUser(form: any, id: string, companyId: string) {
  const parsed = UpdateUserSchema.safeParse(form);
  if (!parsed.success) {
    return { error: "Invalid user data" };
  }

  const { email, name, phoneNumber, roleId, branchId } = parsed.data;
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : undefined;

  try {
    const existingUser = await prisma.user.findFirst({
      where: { id, companyId },
      select: { id: true },
    });

    if (!existingUser) {
      return { error: "User not found" };
    }

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          ...(normalizedEmail !== undefined && { email: normalizedEmail }),
          ...(name !== undefined && { name }),
          ...(phoneNumber !== undefined && { phoneNumber }),
          ...(branchId !== undefined && { branchId }),
        },
      });

      if (roleId) {
        await tx.userRole.deleteMany({ where: { userId: existingUser.id } });
        await tx.userRole.create({
          data: {
            userId: existingUser.id,
            roleId,
          },
        });
      }

      return updatedUser;
    });

    revalidatePath("/users");
    return { success: true, user };
  } catch (error) {
    console.error("Failed to update user:", error);
    return { error: "Failed to update user" };
  }
}
