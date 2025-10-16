// app/api/log-activity/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { companyId, userId, action, details, ip, userAgent } =
    await req.json();
  await prisma.activityLogs.create({
    data: { companyId, userId, action, details, ip, userAgent },
  });
  return NextResponse.json({ success: true });
}
