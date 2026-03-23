import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token || password.length < 8) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const invite = await prisma.userInvite.findFirst({
      where: {
        token,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: true, company: true },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Invalid or expired invite" },
        { status: 400 },
      );
    }

    if (!invite.user.isActive || !invite.company.isActive) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: invite.userId },
        data: { password },
      }),
      prisma.userInvite.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite accept failed:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
