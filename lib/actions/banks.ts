"use server";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { getSession } from "../session";
import { BankForm } from "../zod";
import { getUserCompany } from "./chartOfaccounts";
import { revalidatePath } from "next/cache";
import { Currency } from "lucide-react";
import { date } from "zod";
import webpush from "web-push";

export async function sendTestNotifications({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const subscriptions = await prisma.pushSubscription.findMany();

  const payload = JSON.stringify({
    title,
    body,
  });

  await Promise.all(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payload,
      ),
    ),
  );
}
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
export async function fetchBanks() {
  try {
    const { companyId } = await getUserCompany();

    const banks = await prisma.bank.findMany({
      where: {
        companyId,
      },
      select: {
        id: true,
        name: true,
        iban: true,
        swiftCode: true,
        preferred_currency: true,
        accountNumber: true,
        isActive: true,
        type: true,
        account: {
          select: {
            id: true,
            account_name_ar: true,
            account_name_en: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    const bank = serializeData(banks);
    return {
      success: true,
      data: bank,
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
    revalidatePath("/banks");
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
  if (!company) return { banks: [], branches: [] }; // Consistency: always return the object

  const expenseAccounts = await prisma.accounts.findMany({
    where: {
      company_id: company.companyId,
      is_active: true,
      account_category: { in: ["BANK", "CASH"] },
    },
    select: {
      id: true,
      account_name_en: true,
    },
    orderBy: {
      account_code: "asc",
    },
  });

  const branches = await prisma.points_of_sale.findMany({
    where: {
      company_id: company.companyId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  const name = expenseAccounts.map((i) => ({
    id: i.id,
    name: i.account_name_en,
  }));

  return { banks: name, branches };
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
export async function fetchPayments() {
  const company = await getSession();
  if (!company) return { banks: [], cashAccounts: [] };

  // Fetch banks
  const banks = await prisma.bank.findMany({
    where: {
      companyId: company.companyId,
      isActive: true,
      type: "BANK",
    },
    select: {
      id: true,
      accountId: true,
      name: true,
      account: { select: { currency_code: true } },
    },
    orderBy: {
      name: "asc",
    },
  });

  // Map banks to { id, name }
  const mappedBanks = banks.map((i) => ({
    id: i.id,
    name: i.name,
    accountId: i.accountId,
  }));

  // Fetch cash accounts
  const cashAccounts = await prisma.bank.findMany({
    where: {
      companyId: company.companyId,
      type: "CASH", // adjust category if needed
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      accountId: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const mappedCash = cashAccounts.map((i) => ({
    id: i.id,
    name: i.name,
    accountId: i.accountId,
  }));

  return { banks: mappedBanks, cashAccounts: mappedCash };
}

export async function createExchangeRate({
  companyId,
  fromCurrency,
  toCurrency,
  rate,
}: {
  companyId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}) {
  return prisma.exchange_rates.create({
    data: {
      company_id: companyId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      rate,
    },
  });
}
export async function getLatestExchangeRate({
  fromCurrency,
  toCurrency,
}: {
  fromCurrency: string;
  toCurrency: string;
}) {
  const company = await getSession();
  const exchange_rates = await prisma.exchange_rates.findFirst({
    where: {
      company_id: company?.id,
      from_currency: fromCurrency,
      to_currency: toCurrency,
    },
    orderBy: {
      date: "desc",
    },
  });
  const rate = serializeData(exchange_rates);
  return rate;
}
export async function getExchangeRate() {
  const session = await getSession();
  if (!session) return;
  const exchange_rates = await prisma.exchange_rates.findMany({
    where: {
      company_id: session.companyId,
    },
    select: {
      id: true,
      from_currency: true,
      to_currency: true,
      rate: true,
      date: true,
    },
    orderBy: {
      date: "desc",
    },
  });
  const rate = serializeData(exchange_rates);
  return rate;
}
export async function fetchAccountsForSelect() {
  const session = await getSession();
  if (!session) return;
  const accounts = await prisma.accounts.findMany({
    where: {
      company_id: session.companyId,
      is_active: true,
    },
    select: {
      id: true,
      account_name_en: true,
    },
    orderBy: {
      account_code: "asc",
    },
  });

  const acount = accounts.map((acc) => ({
    id: acc.id,
    name: acc.account_name_en,
  }));
  return acount;
}
