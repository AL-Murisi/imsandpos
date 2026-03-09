import { NextResponse } from "next/server";
import { sendRoleBasedNotification } from "@/lib/push-notifications";

type SendBody = {
  companyId?: string;
  role?: string;
  targetRoles?: string[];
  targetUserIds?: string[];
  title?: string;
  body?: string;
  url?: string;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SendBody;
    const { companyId, role, targetRoles, targetUserIds, title, body, url } =
      payload;

    if (!companyId || !title || !body) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const roles = [
      ...(targetRoles ?? []),
      ...(role ? [role] : []),
    ].filter(Boolean);

    const result = await sendRoleBasedNotification(
      {
        companyId,
        targetRoles: roles,
        targetUserIds,
      },
      {
        title,
        body,
        url: url ?? "/",
      },
    );

    return NextResponse.json({
      message: "Push notifications processed",
      ...result,
    });
  } catch (err) {
    console.error("Error sending push notifications:", err);
    return NextResponse.json(
      { error: "Failed to send push notifications" },
      { status: 500 },
    );
  }
}

