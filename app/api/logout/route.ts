import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Legacy logout endpoint removed. Use /api/auth/signout." },
    { status: 410 },
  );
}
