"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type CurrencyOption = {
  id: string;
  name: string;
  symbol?: string | null;
  decimals?: number | null;
};

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export async function getCompanyCurrencies() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const [company, currencies, companyCurrencies] = await Promise.all([
    prisma.company.findUnique({
      where: { id: session.companyId },
      select: { base_currency: true },
    }),
    prisma.currency.findMany({
      orderBy: { code: "asc" },
    }),
    prisma.companyCurrency.findMany({
      where: { companyId: session.companyId },
      select: { currencyCode: true, isBase: true },
    }),
  ]);

  const enabledMap = new Map(
    companyCurrencies.map((c) => [c.currencyCode, c.isBase]),
  );

  const items = currencies.map((c) => ({
    code: c.code,
    name: c.name,
    symbol: c.symbol,
    decimals: c.decimals,
    enabled: enabledMap.has(c.code),
    isBase: enabledMap.get(c.code) || c.code === company?.base_currency,
  }));

  return {
    baseCurrency: company?.base_currency || "",
    items,
  };
}

export async function listCurrencyOptions() {
  const session = await getSession();
  if (!session) return [] as CurrencyOption[];

  const companyCurrencies = await prisma.companyCurrency.findMany({
    where: { companyId: session.companyId },
    include: { currency: true },
  });

  if (companyCurrencies.length > 0) {
    return companyCurrencies.map((c) => ({
      id: c.currency.code,
      name: `${c.currency.name} (${c.currency.code})`,
      symbol: c.currency.symbol,
      decimals: c.currency.decimals,
    }));
  }

  const currencies = await prisma.currency.findMany({
    orderBy: { code: "asc" },
  });

  return currencies.map((c) => ({
    id: c.code,
    name: `${c.name} (${c.code})`,
    symbol: c.symbol,
    decimals: c.decimals,
  }));
}

export async function createCurrency(data: {
  code: string;
  name: string;
  symbol?: string | null;
  decimals?: number | null;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const code = normalizeCode(data.code);
  if (!code || code.length !== 3) {
    throw new Error("Currency code must be 3 letters");
  }

  await prisma.currency.upsert({
    where: { code },
    update: {
      name: data.name.trim(),
      symbol: data.symbol ?? null,
      decimals: data.decimals ?? 2,
    },
    create: {
      code,
      name: data.name.trim(),
      symbol: data.symbol ?? null,
      decimals: data.decimals ?? 2,
    },
  });

  revalidatePath("/settings/currencies");
}

export async function updateCurrency(
  code: string,
  data: {
    name?: string;
    symbol?: string | null;
    decimals?: number | null;
  },
) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const normalized = normalizeCode(code);
  await prisma.currency.update({
    where: { code: normalized },
    data: {
      ...(data.name ? { name: data.name.trim() } : {}),
      ...(data.symbol !== undefined ? { symbol: data.symbol } : {}),
      ...(data.decimals !== undefined ? { decimals: data.decimals ?? 2 } : {}),
    },
  });

  revalidatePath("/settings/currencies");
}

export async function deleteCurrency(code: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const normalized = normalizeCode(code);
  const inUse = await prisma.companyCurrency.count({
    where: { currencyCode: normalized },
  });

  if (inUse > 0) {
    throw new Error("Currency is in use by a company");
  }

  await prisma.currency.delete({
    where: { code: normalized },
  });

  revalidatePath("/settings/currencies");
}

export async function enableCompanyCurrency(code: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const normalized = normalizeCode(code);
  await prisma.companyCurrency.upsert({
    where: {
      companyId_currencyCode: {
        companyId: session.companyId,
        currencyCode: normalized,
      },
    },
    update: {},
    create: {
      companyId: session.companyId,
      currencyCode: normalized,
      isBase: false,
    },
  });

  revalidatePath("/settings/currencies");
}

export async function disableCompanyCurrency(code: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const normalized = normalizeCode(code);
  const base = await prisma.company.findUnique({
    where: { id: session.companyId },
    select: { base_currency: true },
  });

  if (base?.base_currency === normalized) {
    throw new Error("Cannot disable base currency");
  }

  await prisma.companyCurrency.delete({
    where: {
      companyId_currencyCode: {
        companyId: session.companyId,
        currencyCode: normalized,
      },
    },
  });

  revalidatePath("/settings/currencies");
}

export async function setCompanyBaseCurrency(code: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const normalized = normalizeCode(code);

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: session.companyId },
      data: { base_currency: normalized },
    });

    await tx.companyCurrency.upsert({
      where: {
        companyId_currencyCode: {
          companyId: session.companyId,
          currencyCode: normalized,
        },
      },
      update: { isBase: true },
      create: {
        companyId: session.companyId,
        currencyCode: normalized,
        isBase: true,
      },
    });

    await tx.companyCurrency.updateMany({
      where: {
        companyId: session.companyId,
        currencyCode: { not: normalized },
      },
      data: { isBase: false },
    });
  });

  revalidatePath("/settings/currencies");
}
