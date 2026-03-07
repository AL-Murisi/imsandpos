import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Legacy login endpoint removed. Use /api/auth/signin." },
    { status: 410 },
  );
}
