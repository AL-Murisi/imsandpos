"use server";

import prisma from "@/lib/prisma";
import { getSession } from "../session";

interface CreateCompanyInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

export async function createCompany(data: CreateCompanyInput) {
  const {
    name,
    email,
    phone,
    address,
    city,
    country,
    adminName,
    adminEmail,
    adminPassword,
  } = data;

  try {
    // 1️⃣ Check if company already exists
    let company = await prisma.company.findUnique({
      where: { email },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name,
          email,
          phone,
          address,
          city,
          country,
          isActive: true,
        },
      });
    }

    // 2️⃣ Ensure admin role exists
    let role = await prisma.role.findUnique({
      where: { name: "admin" },
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: "admin",
          description: "Full access to all modules",
          permissions: ["*"],
        },
      });
    }

    // 3️⃣ Create admin user (if not exists)
    let user = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          companyId: company.id,
          email: adminEmail,
          name: adminName,
          phoneNumber: phone,
          password: adminPassword,
          isActive: true,
        },
      });
    }

    // 4️⃣ Link admin user to admin role (if not already)
    const existingLink = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: role.id,
      },
    });

    if (!existingLink) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
    }

    return { success: true, company, admin: user };
  } catch (error: any) {
    console.error("❌ Error creating company:", error);
    return { success: false, message: error.message };
  }
}

export async function updateCompany(
  companyId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    base_currency?: string;
    country?: string;
    logoUrl?: string;
  },
) {
  try {
    const updatedCompany = await prisma.company.update({
      where: { id: companyId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return { success: true, company: updatedCompany };
  } catch (error: any) {
    console.error("❌ Error updating company:", error);
    return { success: false, message: error.message };
  }
}
export async function getCompany() {
  const user = await getSession();
  if (!user) return;

  try {
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        base_currency: true,
        country: true,
        logoUrl: true,

        branches: {
          where: {
            OR: [
              // 👨‍💼 Branch manager
              { managerId: user.userId },

              // 🧾 Cashier assigned to branch
              {
                cashiers: {
                  some: { id: user.userId },
                },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    if (!company) {
      return { success: false, message: "لم يتم العثور على الشركة" };
    }

    return { success: true, data: company };
  } catch (error: any) {
    console.error("❌ Error fetching company:", error);
    return { success: false, message: error.message };
  }
}
