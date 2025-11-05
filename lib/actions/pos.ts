// app/actions/pos.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CreatePosSchema, CreatePosType } from "@/lib/zod/pos";

export async function createPOS(data: CreatePosType, company_id: string) {
  const parsed = CreatePosSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("بيانات غير صحيحة");
  }

  const { name, location, manager_id } = parsed.data;

  try {
    const existing = await prisma.points_of_sale.findFirst({
      where: {
        name: name,
        company_id,
      },
    });

    if (existing) {
      return { error: "نقطة البيع هذه موجودة بالفعل" };
    }

    const pos = await prisma.points_of_sale.create({
      data: {
        name,
        location,
        manager_id,
        company_id,
      },
    });

    revalidatePath("/sells/pos");
    return { success: true, pos };
  } catch (error) {
    console.error("❌ Failed to create POS:", error);
    throw error;
  }
}
export async function getPOSList(company_id: string) {
  try {
    const posList = await prisma.points_of_sale.findMany({
      where: { company_id },
      include: {
        accounts_points_of_sale_manager_idToaccounts: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { created_at: "desc" },
    });

    // Format data for frontend
    return posList.map((pos) => ({
      id: pos.id,
      name: pos.name,
      location: pos.location ?? "غير محدد",
      is_active: pos.is_active ?? true,
      created_at: pos.created_at?.toISOString() ?? "",
      manager: {
        id: pos.accounts_points_of_sale_manager_idToaccounts?.id ?? "",
        name: pos.accounts_points_of_sale_manager_idToaccounts?.name ?? "—",
        email: pos.accounts_points_of_sale_manager_idToaccounts?.email ?? "—",
      },
    }));
  } catch (error) {
    console.error("❌ Error fetching POS list:", error);
    throw new Error("فشل تحميل بيانات نقاط البيع");
  }
}

export async function getPOSById(id: string) {
  const pos = await prisma.points_of_sale.findUnique({
    where: { id },
    include: {
      // accounts_points_of_sale_manager_idToaccounts: {
      //   select: { id: true, name: true, email: true },
      // },
    },
  });

  if (!pos) return null;

  return {
    id: pos.id,
    name: pos.name,
    location: pos.location,
    is_active: pos.is_active,
    created_at: pos.created_at?.toISOString(),
    // manager: pos.accounts_points_of_sale_manager_idToaccounts,
  };
}

export async function fetchPOSManagers(companyId: string) {
  const where: any = { companyId };

  // Filter by search query (name or phone)
  // if (searchQuery) {
  //   where.OR = [
  //     { name: { contains: searchQuery, mode: "insensitive" } },
  //     { phoneNumber: { contains: searchQuery, mode: "insensitive" } },
  //   ];
  // }

  // // Filter by role if provided
  // if (roleId) {
  //   where.roles = {
  //     some: {
  //       role: {
  //         id: roleId,
  //       },
  //     },
  //   };
  // }

  // Filter by creation date
  // if (from || to) {
  //   where.createdAt = {
  //     ...(from && { gte: new Date(from) }),
  //     ...(to && { lte: new Date(to) }),
  //   };
  // }

  // Fetch only id and name for POS manager selection
  const managers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
    },
    where,
    // skip: (page - 1) * pageSize,
    // take: pageSize,
  });

  return managers;
}
