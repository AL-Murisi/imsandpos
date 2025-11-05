"use server";

import prisma from "@/lib/prisma";
import {
  CreateBrandInput,
  CreateBrandSchema,
  CreateProductInput,
  CreateProductSchema,
  CreateRoleInput,
  CreateRoleSchema,
  CreateSupplierInput,
  CreateSupplierSchema,
  CreateUserSchema,
  RoleSchema,
  UpdateInventorySchema,
} from "@/lib/zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export async function createRole(input: CreateRoleInput) {
  const parsed = CreateRoleSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("Invalid role data");
  }
  const { name, description, permissions } = parsed.data;

  try {
    const role = await prisma.role.create({
      data: {
        name,
        description,
        permissions,
      },
    });
    return role;
  } catch (error) {
    console.error("Failed to create role:", error);
    throw error;
  }
}
// app/actions/roles.ts (or any server-side file)
// app/actions/users.ts

export async function fetchRoles(
  page: number = 0, // 0-indexed page number
  pageSize: number = 7,
) {
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      permissions: true,
      createdAt: true,
      updatedAt: true,
    },

    skip: page * pageSize,
    take: pageSize,
  });

  return roles; // ✅ Fully typed & validated
}

export async function fetchRolesForSelect() {
  return prisma.role.findMany({
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
}
export async function createBrand(form: CreateBrandInput, companyId: string) {
  const parsed = CreateBrandSchema.safeParse(form);
  if (!parsed.success) {
    throw new Error("Invalid user data");
  }
  const { name, description, website, contactInfo } = parsed.data;
  try {
    const user = await prisma.brand.create({
      data: { companyId, name, description, website, contactInfo },
    });

    return user;
  } catch (error) {
    console.error("Failed to create user:", error);
    throw error;
  }
}
// Server Action Fix: Convert Decimal objects to numbers

type DateRange = {
  from: Date | null;
  to: Date | null;
};

type FormValues = z.infer<typeof UpdateInventorySchema> & { id: string };
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

export async function fetchAllFormData(companyId: string) {
  try {
    const [warehouses, categories, brands, suppliers] = await Promise.all([
      prisma.warehouse.findMany({
        select: { id: true, name: true },
        where: { isActive: true, companyId },
        orderBy: { name: "asc" },
      }),
      prisma.category.findMany({
        select: { id: true, name: true },
        where: { isActive: true, companyId },
        orderBy: { name: "asc" },
      }),
      prisma.brand.findMany({
        select: { id: true, name: true },
        where: { isActive: true, companyId },
        orderBy: { name: "asc" },
      }),
      prisma.supplier.findMany({
        select: { id: true, name: true },
        where: { isActive: true, companyId },
        orderBy: { name: "asc" },
      }),
    ]);

    return {
      warehouses,
      categories,
      brands,
      suppliers,
    };
  } catch (error) {
    console.error("Error fetching form data:", error);
    throw new Error("Failed to fetch form data");
  }
}
