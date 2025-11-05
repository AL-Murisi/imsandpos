// app/api/export-debt-sales/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generateDebtSalesPDF } from "@/lib/debtSalesPdfExport";
import { FetchDebtSales } from "@/lib/actions/sells";
import { Prisma } from "@prisma/client";
import { ParsedSort } from "@/hooks/sort";
import { getSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, to, usersquery = "" } = body;

    console.log("Fetching debt sales data...");
    const user = await getSession();
    if (!user) return;
    // Build filter
    const filter: Prisma.SaleWhereInput = {
      paymentStatus: {
        in: ["partial"],
      },
    };

    // Parse sort

    // Fetch all debt sales (no pagination for export)
    const sales = await FetchDebtSales(
      user.companyId,
      filter,
      usersquery,
      from,
      to,
      0, // pageIndex
      10000, // Large page size to get all records
    );

    console.log(`Found ${sales.length} debt sales`);

    // Calculate summary
    const summary = {
      totalDebt: sales.reduce((sum, sale) => sum + Number(sale.amountDue), 0),
      totalSales: sales.reduce(
        (sum, sale) => sum + Number(sale.totalAmount),
        0,
      ),
      totalPaid: sales.reduce((sum, sale) => sum + Number(sale.amountPaid), 0),
      customerCount: new Set(sales.map((sale) => sale.customerId)).size,
    };

    // Prepare data for PDF
    const pdfData = {
      sales: sales.map((sale) => ({
        id: sale.id,
        saleDate: sale.saleDate,
        totalAmount: Number(sale.totalAmount),
        amountPaid: Number(sale.amountPaid),
        amountDue: Number(sale.amountDue),
        paymentStatus: sale.paymentStatus,
        customer: sale.customer
          ? {
              name: sale.customer.name,
              phoneNumber: sale.customer.phoneNumber || undefined,
              customerType: sale.customer.customerType || undefined,
            }
          : undefined,
        createdAt: sale.createdAt,
      })),
      summary,
      dateRange: {
        from: from || undefined,
        to: to || undefined,
      },
    };

    console.log("Generating PDF...");

    // Generate PDF
    const pdfBuffer = await generateDebtSalesPDF(pdfData);

    console.log("PDF generated successfully");

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="debt-sales-report-${new Date().toISOString().split("T")[0]}.pdf"`,
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

// Optional: GET method
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const usersquery = searchParams.get("usersquery") || "";
    const sort = searchParams.get("sort") || "";

    console.log("Fetching debt sales data...");

    const filter: Prisma.SaleWhereInput = {
      paymentStatus: {
        in: ["partial"],
      },
    };
    const user = await getSession();
    if (!user) return;
    const parsedSort = ParsedSort(sort);

    const sales = await FetchDebtSales(
      user.companyId,
      filter,
      usersquery,
      from,
      to,
      0,
      10000,
      parsedSort,
    );

    const summary = {
      totalDebt: sales.reduce((sum, sale) => sum + Number(sale.amountDue), 0),
      totalSales: sales.reduce(
        (sum, sale) => sum + Number(sale.totalAmount),
        0,
      ),
      totalPaid: sales.reduce((sum, sale) => sum + Number(sale.amountPaid), 0),
      customerCount: new Set(sales.map((sale) => sale.customerId)).size,
    };

    const pdfData = {
      sales: sales.map((sale) => ({
        id: sale.id,
        saleDate: sale.saleDate,
        totalAmount: Number(sale.totalAmount),
        amountPaid: Number(sale.amountPaid),
        amountDue: Number(sale.amountDue),
        paymentStatus: sale.paymentStatus,
        customer: sale.customer
          ? {
              name: sale.customer.name,
              phoneNumber: sale.customer.phoneNumber || undefined,
              customerType: sale.customer.customerType || undefined,
            }
          : undefined,
        createdAt: sale.createdAt,
      })),
      summary,
      dateRange: {
        from,
        to,
      },
    };

    console.log("Generating PDF...");

    const pdfBuffer = await generateDebtSalesPDF(pdfData);

    console.log("PDF generated successfully");

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="debt-sales-report-${new Date().toISOString().split("T")[0]}.pdf"`,
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
