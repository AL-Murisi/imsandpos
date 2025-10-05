import { NextRequest, NextResponse } from "next/server";
import { generateDebtSalesPDF } from "@/lib/debtSalesPdfExport";
import { FetchDebtSales } from "@/app/actions/sells";
import { Prisma } from "@prisma/client";
import { ParsedSort } from "@/hooks/sort";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to, usersquery = "" } = body;

    console.log("Fetching debt sales data...");

    const filter: Prisma.SaleWhereInput = {
      paymentStatus: { in: ["partial"] },
    };

    // Fetch all matching debt sales
    const sales = await FetchDebtSales(filter, usersquery, from, to, 0, 10000);

    console.log(`Found ${sales.length} debt sales`);

    // Generate PDF directly from sales array
    const pdfBuffer = await generateDebtSalesPDF(sales);

    console.log("PDF generated successfully");

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="debt-sales-report-${
          new Date().toISOString().split("T")[0]
        }.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating debt sales PDF:", error);

    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const usersquery = searchParams.get("usersquery") || "";
    const sort = searchParams.get("sort") || "";

    console.log("Fetching debt sales data...");

    const filter: Prisma.SaleWhereInput = {
      paymentStatus: { in: ["partial"] },
    };

    const parsedSort = ParsedSort(sort);
    const sales = await FetchDebtSales(
      filter,
      usersquery,
      from,
      to,
      0,
      10000,
      parsedSort,
    );

    console.log(`Found ${sales.length} debt sales`);

    // Generate PDF (same function)
    const pdfBuffer = await generateDebtSalesPDF(sales);

    console.log("PDF generated successfully");

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="debt-sales-report-${
          new Date().toISOString().split("T")[0]
        }.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating debt sales PDF:", error);

    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs"; // ensure Puppeteer runs in Node runtime
export const maxDuration = 60;
