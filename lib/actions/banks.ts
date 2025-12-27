"use server";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { getSession } from "../session";
import { BankForm } from "../zod";
import { getUserCompany } from "./chartOfaccounts";
import { revalidatePath } from "next/cache";

export async function fetchBanks() {
  try {
    const { companyId } = await getUserCompany();

    const banks = await prisma.bank.findMany({
      where: {
        companyId,
      },
      include: {
        account: {
          select: {
            id: true,
            account_name_ar: true,
            account_name_en: true,
            balance: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      data: banks,
    };
  } catch (error) {
    console.error("Fetch banks error:", error);
    return {
      success: false,
      error: "فشل في جلب بيانات البنوك",
    };
  }
}
export async function createBank(data: BankForm, companyId: string) {
  try {
    await prisma.bank.create({
      data: {
        ...data,
        companyId,
      },
    });

    return { success: true };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        success: false,
        error: "اسم البنك موجود مسبقًا داخل الشركة",
      };
    }
    revalidatePath("/banks");
    return {
      success: false,
      error: "حدث خطأ أثناء إضافة البنك",
    };
  }
}

export async function updateBank(id: string, data: any, companyId: string) {
  try {
    await prisma.bank.update({
      where: { id, companyId },
      data: {
        ...data,
      },
    });
    revalidatePath("/banks");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
export async function deletBnk(id: string, companyId: string) {
  try {
    await prisma.bank.delete({
      where: { id, companyId },
    });
    revalidatePath("/banks");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
export async function getbanks() {
  const company = await getSession();
  if (!company) return [];
  const expenseAccounts = await prisma.accounts.findMany({
    where: {
      company_id: company.companyId,
      is_active: true,
      account_category: "BANK",
    },
    select: {
      id: true,
      account_name_en: true,
    },
    orderBy: {
      account_code: "asc",
    },
  });
  const name = expenseAccounts.map((i) => ({
    id: i.id,
    name: i.account_name_en,
  }));
  return name;
}
export async function Fetchbanks() {
  const company = await getSession();
  if (!company) return [];
  const banks = await prisma.bank.findMany({
    where: {
      companyId: company.companyId,
      isActive: true,
    },
    select: {
      accountId: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  const name = banks.map((i) => ({
    id: i.accountId,
    name: i.name,
  }));
  return name;
}
