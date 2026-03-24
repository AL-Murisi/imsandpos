"use server";

import prisma from "@/lib/prisma";
import { getSession } from "../session";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { sendUserInviteEmail } from "@/lib/email";

interface CreateCompanyInput {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  adminName: string;
  adminEmail: string;
  adminPassword?: string;
  base_currency: string;
  supabaseId?: string;
}

export async function createCompany(data: CreateCompanyInput) {
  let {
    name,
    email,
    phone,
    address,
    city,
    country,
    adminName,
    adminEmail,
    adminPassword,
    base_currency,
    supabaseId,
  } = data;
  email = email.trim().toLowerCase();
  adminEmail = adminEmail.trim().toLowerCase();
  const invitePassword =
    typeof adminPassword === "string" && adminPassword.length > 0
      ? adminPassword
      : randomBytes(16).toString("hex");

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
          base_currency,
        },
      });
    }

    await prisma.currency.upsert({
      where: { code: base_currency },
      update: {},
      create: {
        code: base_currency,
        name: base_currency,
      },
    });

    await prisma.companyCurrency.upsert({
      where: {
        companyId_currencyCode: {
          companyId: company.id,
          currencyCode: base_currency,
        },
      },
      update: { isBase: true },
      create: {
        companyId: company.id,
        currencyCode: base_currency,
        isBase: true,
      },
    });

    const existingSubscription = await prisma.subscription.findFirst({
      where: { companyId: company.id },
      select: { id: true },
    });

    if (!existingSubscription) {
      await prisma.subscription.create({
        data: {
          companyId: company.id,
          plan: "CUSTOM",
          status: "ACTIVE",
          isActive: true,
        },
      });
    }

    // 2️⃣ Ensure base roles exist
    const baseRoles = [
      {
        name: "admin",
        description: "Full access to all modules",
        permissions: ["*"],
      },
      {
        name: "cashier",
        description: "Sales and cashier operations",
        permissions: ["sales", "cashier"],
      },
      {
        name: "manager_wh",
        description: "Warehouse management",
        permissions: ["inventory", "warehouse"],
      },
      {
        name: "accountant",
        description: "Journal entries, vouchers, chart of accounts",
        permissions: ["journal_entries", "voucher", "chart_of_accounts"],
      },
    ];

    const rolesByName = new Map(
      (
        await prisma.role.findMany({
          where: { name: { in: baseRoles.map((r) => r.name) } },
        })
      ).map((r) => [r.name, r]),
    );

    for (const roleDef of baseRoles) {
      if (!rolesByName.has(roleDef.name)) {
        const created = await prisma.role.create({ data: roleDef });
        rolesByName.set(roleDef.name, created);
      }
    }

    const adminRole = rolesByName.get("admin");
    if (!adminRole) {
      throw new Error("Admin role is missing");
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
          password: invitePassword,
          supabaseId,
          isActive: false,
        },
      });
    } else if (user.companyId !== company.id) {
      return {
        success: false,
        message: "Admin email is already linked to another company",
      };
    } else if (supabaseId && !user.supabaseId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          supabaseId,
          isActive: false,
          name: adminName,
          phoneNumber: phone,
          password: invitePassword,
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          name: adminName,
          phoneNumber: phone,
          password: invitePassword,
          isActive: false,
        },
      });
    }

    // 4️⃣ Link admin user to admin role (if not already)
    const existingLink = await prisma.userRole.findFirst({
      where: {
        userId: user.id,
        roleId: adminRole.id,
      },
    });

    if (!existingLink) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });
    }

    await prisma.userInvite.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48);

    await prisma.userInvite.create({
      data: {
        companyId: company.id,
        userId: user.id,
        email: adminEmail,
        token,
        expiresAt,
      },
    });

    try {
      await sendUserInviteEmail({
        email: adminEmail,
        name: adminName,
        token,
        companyName: company.name,
        companyLogoUrl: company.logoUrl ?? null,
      });
    } catch (error) {
      console.error("Failed to send company admin invite:", error);
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
    revalidatePath("/company"); // Invalidate dashboard cache to reflect changes immediately
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
    const safeCompany = {
      ...company,
      branches: company.branches.map((b) => ({
        ...b,
        location: b.location ?? "",
      })),
    };

    return {
      success: true,
      data: safeCompany,
    };
  } catch (error: any) {
    console.error("❌ Error fetching company:", error);
    return { success: false, message: error.message };
  }
}
