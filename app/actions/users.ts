"use server";
import prisma from "@/lib/prisma";
import { CreateUserSchema } from "@/lib/zod";
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
    companyId, // Existing filters (category, warehouse, etc.)
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
            equals: role, // or contains: role for partial match
            mode: "insensitive",
          },
        },
      },
    };
  }

  if (fromatDate || toDate) {
    combinedWhere.createdAt = {
      ...(fromatDate && {
        gte: fromatDate,
      }),
      ...(toDate && {
        lte: toDate,
      }),
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
// app/actions/roles.ts

// Schema to validate an array of roles

export async function createUser(form: any, companyId: string) {
  const parsed = CreateUserSchema.safeParse(form);
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }

  const { email, name, phoneNumber, password, roleId } = parsed.data;

  try {
    // ✅ Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return { error: "هذا البريد الإلكتروني مستخدم بالفعل" };
    }

    const user = await prisma.user.create({
      data: { companyId, email, name, phoneNumber, password },
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
    return { error: "فشل في إنشاء المستخدم" };
  }
}
export async function UpdatwUser(form: any, id: string, companyId: string) {
  const parsed = CreateUserSchema.safeParse(form);
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }

  const { email, name, phoneNumber, password, roleId } = parsed.data;

  try {
    // ✅ Check if email already exists

    const user = await prisma.user.update({
      where: { id },
      data: { companyId, email, name, phoneNumber, password },
    });
    revalidatePath("/users");
    return { success: true, user };
  } catch (error) {
    console.error("Failed to create user:", error);
    return { error: "فشل في إنشاء المستخدم" };
  }
}
