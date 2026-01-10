"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import { getSession } from "../session";
import { Prisma } from "@prisma/client";
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
export async function setCurrency(key: string) {
  (await cookies()).set("NEXT_CURRENCY", key, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  // Optional: revalidate so UI updates
  revalidatePath("/");
}

export async function getLatestExchangeRate({
  fromCurrency,
  toCurrency,
}: {
  fromCurrency: string;
  toCurrency: string;
}) {
  const user = await getSession();
  if (!user) return;
  // نفس العملة → سعر 1
  if (fromCurrency === toCurrency) {
    return {
      rate: 1,
      from_currency: fromCurrency,
      to_currency: toCurrency,
      date: new Date(),
    };
  }

  const rate = await prisma.exchange_rates.findFirst({
    where: {
      company_id: user.companyId,
      from_currency: fromCurrency,
      to_currency: toCurrency,
    },
    orderBy: {
      date: "desc", // 🔑 أحدث سعر
    },
  });
  const d = serializeData(rate);
  return d;
}
// export async function getforgeincurrncy ({
//   amount,
//   fromCurrency,
//   toCurrency,
// }: {
//   amount: number;
//   fromCurrency: string;
//   toCurrency: string;
// }) {
//   const rate = await getLatestExchangeRate({ fromCurrency, toCurrency });
//   if (!rate) return null;
//   return {
//     amount: amount * rate.rate,
//     currency: toCurrency,
//   };
// }
