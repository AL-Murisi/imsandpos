// app/api/log-activity/route.ts
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId, action, details } = await req.json();
  await prisma.activityLogs.create({ data: { userId, action, details } });
  return NextResponse.json({ success: true });
}
