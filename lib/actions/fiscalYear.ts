// app/actions/fiscalYear.ts
"use server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function createFiscalYear(startDate: string, endDate: string) {
  const user = await getSession();
  if (!user) return;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const period_name = `${start.getFullYear()}-${end.getFullYear()}`;

  const existing = await prisma.fiscal_periods.findUnique({
    where: {
      company_id_period_name: {
        company_id: user.companyId,
        period_name,
      },
    },
  });

  if (existing) {
    throw new Error("السنة المالية موجودة بالفعل");
  }

  const fy = await prisma.fiscal_periods.create({
    data: {
      company_id: user.companyId,
      period_name,
      start_date: start,
      end_date: end,
      is_closed: false,
    },
  });

  return fy;
}

export async function getFiscalYears() {
  const user = await getSession();
  if (!user) return;
  return await prisma.fiscal_periods.findMany({
    where: { company_id: user.companyId },
    orderBy: { start_date: "desc" },
  });
}
export async function getAllFiscalYears() {
  const user = await getSession();
  if (!user) return;
  const fiscalYear = await prisma.fiscal_periods.findMany({
    where: {
      company_id: user.companyId,
    },
    select: { start_date: true, end_date: true },
  });
  return fiscalYear;
}
export async function setActiveFiscalYear(fyId: string) {
  const user = await getSession();
  if (!user) return;

  await prisma.fiscal_periods.updateMany({
    where: { company_id: user.companyId, is_closed: false },
    data: { is_closed: true },
  });

  return await prisma.fiscal_periods.update({
    where: { id: fyId },
    data: {
      is_closed: false,
      closed_by: null,
      closed_at: null,
    },
  });
}
export async function getActiveFiscalYears() {
  const user = await getSession();
  if (!user) return;
  return await prisma.fiscal_periods.findFirst({
    where: { company_id: user.companyId, is_closed: false },
    orderBy: { start_date: "desc" },
  });
}
export async function validateFiscalYear(
  companyId: string,
  targetDate?: Date | string | null,
) {
  const effectiveDate = targetDate ? new Date(targetDate) : new Date();
  const activeYear = await prisma.fiscal_periods.findFirst({
    where: {
      company_id: companyId,
      is_closed: false,
      start_date: { lte: effectiveDate },
      end_date: { gte: effectiveDate },
    },
  });

  if (!activeYear) {
    throw new Error(
      "لا يمكن إجراء هذه العملية: لا توجد سنة مالية مفتوحة حالياً لهذا التاريخ.",
    );
  }
  return activeYear;
}
