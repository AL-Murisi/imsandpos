import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const token = typeof body?.token === "string" ? body.token : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const confirmPassword =
      typeof body?.confirmPassword === "string" ? body.confirmPassword : "";
    // if (!user) {
    //   return new Response(JSON.stringify({ error: "Unauthorized" }), {
    //     status: 401,
    //   });
    // }
    if (!token || !email || password.length < 8 || confirmPassword.length < 8) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 },
      );
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

    if (invite.email.trim().toLowerCase() !== email) {
      return NextResponse.json(
        { error: "Invitation email does not match" },
        { status: 400 },
      );
    }

    if (!invite.company.isActive) {
      return NextResponse.json(
        { error: "Account is inactive" },
        { status: 403 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: invite.userId },
        data: { password, isActive: true },
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
