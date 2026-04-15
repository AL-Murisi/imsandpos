"use server";
import prisma from "@/lib/prisma";
import { CreateUserSchema, UpdateUserSchema } from "@/lib/zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { sendUserInviteEmail } from "@/lib/email";
import { canCreateSubscriptionResource } from "./subscription";

function normalizeOptionalString(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

async function createLinkedCustomerFromUser(params: {
  userId: string;
  companyId: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  branchId?: string | null;
}) {
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { base_currency: true },
  });

  const existingCustomer = await prisma.customer.findFirst({
    where: {
      companyId: params.companyId,
      OR: [{ userId: params.userId }, { email: params.email }],
    },
    select: { id: true },
  });

  if (existingCustomer) {
    await prisma.customer.update({
      where: { id: existingCustomer.id },
      data: {
        userId: params.userId,
        name: params.name,
        email: params.email,
        phoneNumber: normalizeOptionalString(params.phoneNumber),
        branch_id: params.branchId ?? undefined,
      },
    });
    return;
  }

  await prisma.customer.create({
    data: {
      companyId: params.companyId,
      userId: params.userId,
      name: params.name,
      email: params.email,
      phoneNumber: normalizeOptionalString(params.phoneNumber),
      branch_id: params.branchId ?? undefined,
      preferred_currency: company?.base_currency ? [company.base_currency] : [],
      customerType: "individual",
    },
  });
}

async function createLinkedEmployeeFromUser(params: {
  userId: string;
  companyId: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
}) {
  const existingEmployee = await prisma.employee.findFirst({
    where: {
      companyId: params.companyId,
      OR: [{ userId: params.userId }, { email: params.email }],
    },
    select: { id: true },
  });

  if (existingEmployee) {
    await prisma.employee.update({
      where: { id: existingEmployee.id },
      data: {
        userId: params.userId,
        name: params.name,
        email: params.email,
        phone: normalizeOptionalString(params.phoneNumber),
      },
    });
    return;
  }

  const companyEmployeeCount = await prisma.employee.count({
    where: { companyId: params.companyId },
  });

  const employeeCode = `EMP-${String(companyEmployeeCount + 1).padStart(4, "0")}`;

  await prisma.employee.create({
    data: {
      companyId: params.companyId,
      userId: params.userId,
      employeeCode,
      name: params.name,
      email: params.email,
      phone: normalizeOptionalString(params.phoneNumber),
      hireDate: new Date(),
    },
  });
}

async function syncRelatedRecordForRole(params: {
  roleName: string;
  userId: string;
  companyId: string;
  name: string;
  email: string;
  phoneNumber?: string | null;
  branchId?: string | null;
}) {
  const roleName = params.roleName.trim().toLowerCase();

  if (roleName === "customer") {
    await prisma.employee.updateMany({
      where: { userId: params.userId, companyId: params.companyId },
      data: { userId: null },
    });
    await createLinkedCustomerFromUser(params);
    return;
  }

  if (roleName === "employee") {
    await prisma.customer.updateMany({
      where: { userId: params.userId, companyId: params.companyId },
      data: { userId: null },
    });
    await createLinkedEmployeeFromUser(params);
    return;
  }

  await prisma.customer.updateMany({
    where: { userId: params.userId, companyId: params.companyId },
    data: { userId: null },
  });
  await prisma.employee.updateMany({
    where: { userId: params.userId, companyId: params.companyId },
    data: { userId: null },
  });
}

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

export async function deleteUser(userId: string, companyId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.customer.updateMany({
        where: { userId, companyId },
        data: { userId: null },
      });
      await tx.employee.deleteMany({ where: { userId, companyId } });
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.userInvite.deleteMany({ where: { userId } });
      await tx.pushSubscription.deleteMany({ where: { userId } });
      return await tx.user.delete({
        where: { id: userId, companyId },
      });
    });
    revalidatePath("/users");
    return { success: true, user: result };
  } catch (error) {
    console.error("Failed to delete user:", error);
    return { success: false, error: "Failed to delete user" };
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
    combinedWhere.role = {
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
      role: true,
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

  const { email, name, phoneNumber, password, role, branchId } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();
  const finalPassword =
    typeof password === "string" && password.length > 0
      ? password
      : randomBytes(16).toString("hex");

  try {
    const userCapacity = await canCreateSubscriptionResource(
      companyId,
      "users",
    );
    if (!userCapacity.allowed) {
      return {
        error: `تم الوصول إلى الحد الأقصى للمستخدمين (${userCapacity.usage.used}/${userCapacity.usage.limit})`,
      };
    }

    // const selectedRole = await prisma.role.findUnique({
    //   where: { id: roleId },
    //   select: { name: true },
    // });

    // if (!selectedRole) {
    //   return { error: "Role not found" };
    // }

    if (role === "cashier") {
      const cashierCapacity = await canCreateSubscriptionResource(
        companyId,
        "cashiers",
      );
      if (!cashierCapacity.allowed) {
        return {
          error: `تم الوصول إلى الحد الأقصى للكاشير (${cashierCapacity.usage.used}/${cashierCapacity.usage.limit})`,
        };
      }
    }

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
        password: finalPassword,
        ...(branchId && { branchId }),
      },
    });

    // await prisma.userRole.create({
    //   data: {
    //     userId: user.id,
    //     roleId,
    //   },
    // });

    await syncRelatedRecordForRole({
      roleName: role,
      userId: user.id,
      companyId,
      name,
      email: normalizedEmail,
      phoneNumber,
      branchId: branchId ?? null,
    });

    if (!password) {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);

      await prisma.userInvite.create({
        data: {
          companyId,
          userId: user.id,
          email: normalizedEmail,
          token,
          expiresAt,
        },
      });

      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true, logoUrl: true },
      });

      try {
        await sendUserInviteEmail({
          email: normalizedEmail,
          name,
          token,
          companyName: company?.name ?? null,
          companyLogoUrl: company?.logoUrl ?? null,
        });
      } catch (error) {
        console.error("Failed to send invite email:", error);
        revalidatePath("/user");
        revalidatePath("/customer");
        revalidatePath("/employee");
        return {
          success: true,
          user,
          warning: "User created but invite email failed",
        };
      }
    }

    revalidatePath("/user");
    revalidatePath("/customer");
    revalidatePath("/employee");
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

  const { email, name, phoneNumber, role, branchId } = parsed.data;
  const normalizedEmail =
    typeof email === "string" ? email.trim().toLowerCase() : undefined;

  try {
    const existingUser = await prisma.user.findFirst({
      where: { id, companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        branchId: true,
      },
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

      // if (roleId) {
      //   await tx.userRole.deleteMany({ where: { userId: existingUser.id } });
      //   await tx.userRole.create({
      //     data: {
      //       userId: existingUser.id,
      //       roleId,
      //     },
      //   });
      // }

      return updatedUser;
    });

    // if (roleId) {
    //   const role = await prisma.role.findUnique({
    //     where: { id: roleId },
    //     select: { name: true },
    //   });

    if (role) {
      await syncRelatedRecordForRole({
        roleName: role,
        userId: existingUser.id,
        companyId,
        name: name ?? user.name,
        email: normalizedEmail ?? user.email,
        phoneNumber: phoneNumber ?? user.phoneNumber,
        branchId: branchId ?? user.branchId ?? null,
      });
    }

    revalidatePath("/user");
    revalidatePath("/customer");
    revalidatePath("/employee");
    return { success: true, user };
  } catch (error) {
    console.error("Failed to update user:", error);
    return { error: "Failed to update user" };
  }
}
