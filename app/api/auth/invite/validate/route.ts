import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // 1️⃣ Extract token from URL Search Params, not req.json()
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  try {
    const invite = await prisma.userInvite.findUnique({
      where: { token },
      select: {
        email: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    // 2️⃣ Check if it exists
    if (!invite) {
      return NextResponse.json({ error: "دعوة غير صالحة" }, { status: 404 });
    }

    // 3️⃣ Check if already used (Soft Invalidation check)
    if (invite.usedAt) {
      return NextResponse.json(
        { error: "تم استخدام هذا الرابط مسبقاً" },
        { status: 400 },
      );
    }

    // 4️⃣ Check if expired
    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: "انتهت صلاحية هذا الرابط" },
        { status: 400 },
      );
    }

    // 5️⃣ Success: Return the email for pre-filling
    return NextResponse.json({
      success: true,
      email: invite.email,
    });
  } catch (error) {
    console.error("Validation Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
