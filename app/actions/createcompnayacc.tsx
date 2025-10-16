"use server";

import prisma from "@/lib/prisma";

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
