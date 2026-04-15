// app/api/company/update-logo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { assertCompanySubscriptionActive } from "@/lib/actions/subscription";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const body = await request.json();
    const { companyId, logoUrl } = body;

    if (!companyId || !logoUrl) {
      return NextResponse.json(
        { success: false, message: "Company ID and logo URL are required" },
        { status: 400 },
      );
    }

    if (!session || session.companyId !== companyId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (session.subscriptionActive === false) {
      return NextResponse.json(
        { success: false, message: "Subscription inactive" },
        { status: 403 },
      );
    }
    await assertCompanySubscriptionActive(companyId);

    // Update company with logo URL
    const updatedCompany = await prisma.company.update({
      where: {
        id: companyId,
      },
      data: {
        logoUrl: logoUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Logo updated successfully",
      company: updatedCompany,
    });
  } catch (error) {
    console.error("Error updating logo:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update logo" },
      { status: 500 },
    );
  }
}
