import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const companyId = user.companyId;

  const [customers, suppliers, accounts, banks, users] = await Promise.all([
    prisma.customer.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.accounts.findMany({
      where: { company_id: companyId },
      select: { id: true, account_name_ar: true, account_name_en: true },
      orderBy: { account_name_en: "asc" },
    }),
    prisma.bank.findMany({
      where: { companyId },
      select: { id: true, name: true, accountId: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return Response.json({
    customers,
    suppliers,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.account_name_ar || a.account_name_en || "Account",
    })),
    banks,
    users,
  });
}
