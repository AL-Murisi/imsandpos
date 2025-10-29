// app/api/company/update-logo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { companyId, logoUrl } = body;

    if (!companyId || !logoUrl) {
      return NextResponse.json(
        { success: false, message: "Company ID and logo URL are required" },
        { status: 400 },
      );
    }

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
