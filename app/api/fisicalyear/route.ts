// app/api/fiscal-year/close/route.ts
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fiscalYearId } = await req.json();

    if (!fiscalYearId) {
      return Response.json(
        { error: "fiscalYearId is required" },
        { status: 400 },
      );
    }

    // Validate fiscal year
    const fiscalYear = await prisma.fiscal_periods.findUnique({
      where: { id: fiscalYearId },
      select: {
        id: true,
        company_id: true,
        period_name: true,
        start_date: true,
        end_date: true,
        is_closed: true,
      },
    });

    if (!fiscalYear) {
      return Response.json(
        { error: "السنة المالية غير موجودة" },
        { status: 404 },
      );
    }

    if (fiscalYear.company_id !== session.companyId) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (fiscalYear.is_closed) {
      return Response.json(
        { error: "السنة المالية مغلقة بالفعل" },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        // 1️⃣ Get all accounts with balances
        const accounts = await tx.accounts.findMany({
          where: { company_id: session.companyId },
          select: {
            id: true,
            account_name_ar: true,
            account_name_en: true,
            account_type: true,
            balance: true,
          },
        });

        // 2️⃣ Get customers with balances
        const customers = await tx.customer.findMany({
          where: { companyId: session.companyId },
          select: {
            id: true,
            name: true,
            outstandingBalance: true,
            balance: true,
          },
        });

        // 3️⃣ Get suppliers with balances
        const suppliers = await tx.supplier.findMany({
          where: { companyId: session.companyId },
          select: {
            id: true,
            name: true,
            outstandingBalance: true,
            totalPaid: true,
            totalPurchased: true,
          },
        });

        // 4️⃣ Close fiscal year
        await tx.fiscal_periods.update({
          where: { id: fiscalYearId },
          data: {
            is_closed: true,
            closed_by: session.id,
            closed_at: new Date(),
          },
        });

        // 5️⃣ Create CLOSING journal event
        const closingEvent = await tx.journalEvent.create({
          data: {
            companyId: session.companyId,
            eventType: "fiscal-year-close",
            entityType: "fiscal-year",
            entityId: fiscalYearId,
            status: "pending",
            processed: false,
            payload: {
              companyId: session.companyId,
              fiscalYearId: fiscalYear.id,
              fiscalPeriod: fiscalYear.period_name,
              closingDate: fiscalYear.end_date,
              userId: session.id,
              accounts: accounts
                .filter((a) => Number(a.balance) !== 0)
                .map((a) => ({
                  id: a.id,
                  name_ar: a.account_name_ar,
                  name_en: a.account_name_en,
                  type: a.account_type,
                  balance: a.balance,
                })),
            },
          },
        });

        // 6️⃣ Create OPENING journal event for next period
        const nextYearStart = new Date(fiscalYear.end_date);
        nextYearStart.setDate(nextYearStart.getDate() + 1);

        const openingEvent = await tx.journalEvent.create({
          data: {
            companyId: session.companyId,
            eventType: "fiscal-year-open",
            entityType: "fiscal-year",
            entityId: fiscalYearId,
            status: "pending",
            processed: false,
            payload: {
              companyId: session.companyId,
              previousFiscalYearId: fiscalYear.id,
              openingDate: nextYearStart,
              userId: session.id,
              accounts: accounts
                .filter(
                  (a) =>
                    ["ASSET", "LIABILITY", "EQUITY"].includes(a.account_type) &&
                    Number(a.balance) !== 0,
                )
                .map((a) => ({
                  id: a.id,
                  name_ar: a.account_name_ar,
                  name_en: a.account_name_en,
                  type: a.account_type,
                  balance: a.balance,
                })),
              customers: customers
                .filter(
                  (c) =>
                    Number(c.outstandingBalance) !== 0 ||
                    Number(c.balance) !== 0,
                )
                .map((c) => ({
                  id: c.id,
                  name: c.name,
                  outstandingBalance: c.outstandingBalance.toString(),
                  balance: c.balance?.toString() || "0",
                })),
              suppliers: suppliers
                .filter((s) => Number(s.outstandingBalance) !== 0)
                .map((s) => ({
                  id: s.id,
                  name: s.name,
                  outstandingBalance: s.outstandingBalance.toString(),
                  totalPaid: s.totalPaid.toString(),
                  totalPurchased: s.totalPurchased.toString(),
                })),
            },
          },
        });

        return {
          success: true,
          message: "تم إغلاق السنة المالية وإنشاء قيود الإقفال والافتتاح",
          closingEventId: closingEvent.id,
          openingEventId: openingEvent.id,
        };
      },
      {
        timeout: 30000,
      },
    );

    return Response.json(result);
  } catch (error: any) {
    console.error("❌ Error closing fiscal year:", error);
    return Response.json(
      {
        success: false,
        error: error.message || "Failed to close fiscal year",
      },
      { status: 500 },
    );
  }
}

// // app/api/fiscal-year/open/route.ts
// export async function POST_OPEN_FISCAL_YEAR(req: NextRequest) {
//   try {
//     const session = await getSession();
//     if (!session) {
//       return Response.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { periodName, startDate, endDate } = await req.json();

//     if (!periodName || !startDate || !endDate) {
//       return Response.json(
//         { error: "periodName, startDate, and endDate are required" },
//         { status: 400 },
//       );
//     }

//     // Check if period already exists
//     const existing = await prisma.fiscal_periods.findUnique({
//       where: {
//         company_id_period_name: {
//           company_id: session.companyId,
//           period_name: periodName,
//         },
//       },
//     });

//     if (existing) {
//       return Response.json(
//         { error: "السنة المالية موجودة بالفعل" },
//         { status: 400 },
//       );
//     }

//     // Create new fiscal year
//     const newFiscalYear = await prisma.fiscal_periods.create({
//       data: {
//         company_id: session.companyId,
//         period_name: periodName,
//         start_date: new Date(startDate),
//         end_date: new Date(endDate),
//         is_closed: false,
//       },
//     });

//     return Response.json({
//       success: true,
//       message: "تم فتح السنة المالية الجديدة بنجاح",
//       fiscalYear: newFiscalYear,
//     });
//   } catch (error: any) {
//     console.error("❌ Error opening fiscal year:", error);
//     return Response.json(
//       {
//         success: false,
//         error: error.message || "Failed to open fiscal year",
//       },
//       { status: 500 },
//     );
//   }
// }
