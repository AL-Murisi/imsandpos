"use server";

import prisma from "@/lib/prisma";
import { getSession } from "../session";
import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { sendUserInviteEmail } from "@/lib/email";
import { createOrUpdateCompanySubscription } from "./subscription";
import { normalizeSubscriptionPlan } from "../subscription";

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
  plan?: string;
  fiscalYearStart: number;
}
async function createFiscalYearAndPeriods(
  companyId: string,
  startMonth: number,
) {
  const now = new Date();
  const currentYear = now.getFullYear();

  // Determine fiscal year boundaries
  // If startMonth is 1 (Jan), fiscal year is Jan-Dec of current year
  // If startMonth is 4 (Apr), fiscal year is Apr current year - Mar next year
  const fiscalYearStartDate = new Date(currentYear, startMonth - 1, 1);
  const fiscalYearEndDate = new Date(currentYear + 1, startMonth - 1, 0); // Last day of month before start

  // Adjust if fiscal year hasn't started yet this calendar year
  if (now < fiscalYearStartDate) {
    fiscalYearStartDate.setFullYear(currentYear - 1);
    fiscalYearEndDate.setFullYear(currentYear);
  }

  // Create the fiscal year
  const fiscalYear = await prisma.fiscal_periods.create({
    data: {
      company_id: companyId,
      period_name: `${fiscalYearStartDate.getFullYear()}-${fiscalYearEndDate.getFullYear()}`,
      start_date: fiscalYearStartDate,
      end_date: fiscalYearEndDate,
    },
  });

  return fiscalYear;
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
    plan,
    fiscalYearStart,
  } = data;

  const now = new Date();
  const currentYear = now.getFullYear();

  email = adminEmail.trim().toLowerCase();
  adminEmail = adminEmail.trim().toLowerCase();

  const invitePassword =
    typeof adminPassword === "string" && adminPassword.length > 0
      ? adminPassword
      : randomBytes(16).toString("hex");

  try {
    // ─── 1️⃣ CHECK IF COMPANY EMAIL EXISTS ───
    const existingCompany = await prisma.company.findUnique({
      where: { email },
      select: {
        email: true,
        users:{select:{email:true}}
      }
    });

    if (existingCompany?.email) {
      return {
        success: false,
        message:
          "هذا البريد الإلكتروني مسجل مسبقاً لشركة أخرى. إذا كنت تمتلك حساباً، يمكنك تسجيل الدخول.",
      };
    }

    
    // ─── 3️⃣ CREATE COMPANY ───
    const company = await prisma.company.create({
      include: {
        branches: true,
      },
      data: {
        name,
        email,
        phone,
        address,
        city,
        country,
        isActive: true,
        base_currency,
        branches: {
          create: {
            location: address ?? "",
            name: "الفرع الرئيسي",
          },
        },
        plan: normalizeSubscriptionPlan(plan),
      },
    });

    // ─── 4️⃣ CREATE FISCAL YEAR ───
    await createFiscalYearAndPeriods(company.id, fiscalYearStart);

    // ─── 5️⃣ SETUP CURRENCY ───
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

    await createOrUpdateCompanySubscription(
      company.id,
      normalizeSubscriptionPlan(plan),
    );

    // ─── 6️⃣ CREATE ADMIN USER ───
    const user = await prisma.user.create({
      data: {
        companyId: company.id,
        email: adminEmail,
        name: adminName,
        phoneNumber: phone,
        password: invitePassword,
        supabaseId,
        role: "admin",
        isActive: false,
      },
    });

    // ─── 7️⃣ CREATE INVITE TOKEN ───
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

    // ─── 8️⃣ SEND EMAIL ───
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
        fiscal_periods: {
          where: {
            is_closed: false,
          },
          select: {
            is_closed: true,
          },
        },
        branches: {
          // where: {
          //   cashiers: {
          //     some: { id: user.userId },
          //   },
          // },

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
