// app/actions/pos.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CreatePosSchema, CreatePosType } from "@/lib/zod/pos";
import { getSession } from "../session";

export async function createPOS(data: CreatePosType, company_id: string) {
  const parsed = CreatePosSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("بيانات غير صحيحة");
  }

  const { name, location, managerId, cashierIds = [] } = parsed.data;

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
        managerId,
        company_id,
        ...(cashierIds.length > 0 && {
          cashiers: {
            connect: cashierIds.map((id) => ({ id })),
          },
        }),
      },
    });

    revalidatePath("/sells/pos");
    return { success: true, pos };
  } catch (error) {
    console.error("❌ Failed to create POS:", error);
    throw error;
  }
}
export async function updateBranch(
  data: CreatePosType,
  posId: string,
  company_id: string,
) {
  const parsed = CreatePosSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("بيانات غير صحيحة");
  }

  const { name, location, managerId, cashierIds = [] } = parsed.data;

  try {
    const existing = await prisma.points_of_sale.findFirst({
      where: {
        name: name,
        company_id,
        NOT: { id: posId },
      },
    });

    if (existing) {
      return { error: "نقطة البيع هذه موجودة بالفعل" };
    }

    const pos = await prisma.points_of_sale.update({
      where: { id: posId },
      data: {
        name,
        location,
        managerId,
        company_id,
        cashiers: {
          set: cashierIds.map((id) => ({ id })),
        },
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
        manager: {
          select: { id: true, name: true, email: true },
        },
        cashiers: { select: { id: true, name: true, phoneNumber: true } },
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
        id: pos.manager?.id ?? "",
        name: pos.manager?.name ?? "—",
        email: pos.manager?.email ?? "—",
      },

      // ✅ cashiers is an ARRAY
      cashiers: pos.cashiers.map((c) => ({
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
      })),
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
    where: { roles: { some: { role: { name: "admin" } } }, companyId },
    select: {
      id: true,
      name: true,
    },
  });
  const cashiers = await prisma.user.findMany({
    where: { roles: { some: { role: { name: "cashier" } } }, companyId },
    select: {
      id: true,
      name: true,
    },
  });

  return { managers, cashiers };
}
// skip: (page - 1) * pageSize,
// take: pageSize,

export async function fetchbranches() {
  const user = await getSession();
  if (!user) return;
  const brnaches = await prisma.points_of_sale.findMany({
    where: { company_id: user.companyId },
    select: {
      id: true,
      name: true,
    },
  });
  return brnaches;
}
