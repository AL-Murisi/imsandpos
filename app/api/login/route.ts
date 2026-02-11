// Updated app/api/login/route.ts (without bcryptjs dependency)
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createSession } from "@/lib/session";
import { logActivity } from "@/lib/actions/activitylogs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { email, password, accessToken } = await req.json();

    if (accessToken) {
      const {
        data: { user: supabaseUser },
        error: supabaseError,
      } = await supabase.auth.getUser(accessToken);

      if (supabaseError || !supabaseUser?.id || !supabaseUser.email) {
        return NextResponse.json(
          { error: "Invalid Supabase session" },
          { status: 401 },
        );
      }

      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { supabaseId: supabaseUser.id },
            { email: supabaseUser.email.toLowerCase() },
          ],
        },
        select: {
          id: true,
          name: true,
          email: true,
          companyId: true,
          supabaseId: true,
          roles: { include: { role: true } },
        },
      });

      if (!user) {
        return NextResponse.json(
          { error: "No app user linked to this Supabase account" },
          { status: 401 },
        );
      }

      if (!user.supabaseId) {
        await prisma.user.update({
          where: { id: user.id },
          data: { supabaseId: supabaseUser.id },
        });
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
        "تسجيل الدخول",
        "قام المستخدم بتسجيل الدخول (Supabase)",
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
    }

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
