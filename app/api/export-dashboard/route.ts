// app/api/export-dashboard/route.ts
import { fetchDashboardData } from "@/app/actions/dashboard";
import { generatePDFFromData } from "@/lib/pdfExport";
import { getSession } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

// import { auth } from '@/lib/auth'; // Uncomment if you have auth

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication
    // const session = await auth();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { role, filters, pagination } = body;

    // Validate required fields
    if (!role) {
      return NextResponse.json({ error: "Role is required" }, { status: 400 });
    }

    // Fetch dashboard data
    const dashboardData = await fetchDashboardData(role, filters, pagination);

    // Generate PDF
    const pdfBuffer = await generatePDFFromData(dashboardData);

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="dashboard-report-${new Date().toISOString().split("T")[0]}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);

    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Optional: GET method for direct URL access
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication
    // const session = await auth();
    // if (!session) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const searchParams = request.nextUrl.searchParams;
    const role = searchParams.get("role") || "user";
    const user = await getSession();
    // Build filters from query params
    const filters = {
      allFrom: searchParams.get("allFrom") || undefined,
      allTo: searchParams.get("allTo") || undefined,
      salesFrom: searchParams.get("salesFrom") || undefined,
      salesTo: searchParams.get("salesTo") || undefined,
      purchasesFrom: searchParams.get("purchasesFrom") || undefined,
      purchasesTo: searchParams.get("purchasesTo") || undefined,
      revenueFrom: searchParams.get("revenueFrom") || undefined,
      revenueTo: searchParams.get("revenueTo") || undefined,
      debtFrom: searchParams.get("debtFrom") || undefined,
      debtTo: searchParams.get("debtTo") || undefined,
    };

    console.log("Fetching dashboard data...");
    if (!user) return;
    // Fetch dashboard data
    const dashboardData = await fetchDashboardData(
      user.companyId,
      role,
      filters,
    );

    console.log("Generating PDF...");

    // Generate PDF
    const pdfBuffer = await generatePDFFromData(dashboardData);

    console.log("PDF generated successfully");

    // Return PDF
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="dashboard-report-${new Date().toISOString().split("T")[0]}.pdf"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Error generating PDF:", error);

    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Optional: Rate limiting configuration
export const runtime = "nodejs"; // Specify Node.js runtime for Puppeteer
export const maxDuration = 60; // Maximum execution time in seconds
