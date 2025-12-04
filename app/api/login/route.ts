// Updated app/api/login/route.ts (without bcryptjs dependency)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { logActivity } from "@/lib/actions/activitylogs";
import { includes } from "zod";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true, // Needed for comparison
        companyId: true, // <-- FETCH THE COMPANY ID
        roles: { include: { role: true } },
        company: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
            logoUrl: true,
          },
        },
      },
    });
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    // Simple password comparison (you should implement proper hashing in production)
    // For now, comparing plain text passwords
    if (user.password !== password) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const roleNames = user.roles.map((r) => r.role.name);

    await createSession({
      userId: user.id,
      roles: roleNames,
      name: user.name,
      email: user.email,
      companyId: user.companyId,
    });

    await logActivity(
      user.id,
      user.companyId,
      "تسجيل الدخول", // loging
      "قام المستخدم بتسجيل الدخول", // user loging
      "889",
      "وكيل المستخدم",
    );
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: roleNames,
        companyId: user.companyId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
