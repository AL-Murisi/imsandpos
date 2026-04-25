import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { assertCompanySubscriptionActive } from "@/lib/actions/subscription";
import {
  deletePushDeviceTokenByUserAndToken,
  upsertPushDeviceToken,
} from "@/lib/firebase/device-tokens";

const NOTIFICATION_TOKEN_COOKIE = "ims.notification.token";
const NOTIFICATION_TOKEN_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type SubscriptionPayload = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  try {
    const userinf = await getSession();

    if (!userinf) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (userinf.subscriptionActive === false) {
      return NextResponse.json(
        { error: "Subscription inactive" },
        { status: 403 },
      );
    }
    await assertCompanySubscriptionActive(userinf.companyId);

    const user = await prisma.user.findUnique({
      where: { id: userinf.userId },
      select: {
        companyId: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const subscription = body.subscription as SubscriptionPayload | undefined;
    const fcmToken =
      typeof body.fcmToken === "string" ? body.fcmToken.trim() : "";

    const rolePriority = ["admin", "manager_wh", "cashier", "accountant"];
    const normalizedRoles = user.role;

    const primaryRole =
      rolePriority.find((role) => normalizedRoles.includes(role)) ??
      normalizedRoles[0] ??
      null;

    if (fcmToken) {
      const savedToken = await upsertPushDeviceToken({
        token: fcmToken,
        companyId: user.companyId,
        userId: userinf.userId,
        role: primaryRole,
        provider: "fcm",
      });

      const response = NextResponse.json({
        message: "FCM token saved successfully",
        token: savedToken?.token ?? fcmToken,
      });
      response.cookies.set(NOTIFICATION_TOKEN_COOKIE, fcmToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: NOTIFICATION_TOKEN_COOKIE_MAX_AGE,
      });
      return response;
    }

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription - missing endpoint" },
        { status: 400 },
      );
    }

    const keys = subscription.keys;
    if (!keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Invalid subscription - missing keys" },
        { status: 400 },
      );
    }

    const savedSubscription = await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: userinf.userId,
        company_id: user.companyId,
        role: primaryRole,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        company_id: user.companyId,
        userId: userinf.userId,
        role: primaryRole,
      },
    });

    return NextResponse.json({
      message: "Subscription saved successfully",
      subscription: {
        id: savedSubscription.id,
        endpoint: savedSubscription.endpoint,
      },
    });
  } catch (error) {
    console.error("[API] Error saving subscription:", error);
    return NextResponse.json(
      {
        error: "Failed to save subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const userinf = await getSession();

    if (!userinf) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (userinf.subscriptionActive === false) {
      return NextResponse.json(
        { error: "Subscription inactive" },
        { status: 403 },
      );
    }
    await assertCompanySubscriptionActive(userinf.companyId);

    const { endpoint, fcmToken } = await request.json();

    if (typeof fcmToken === "string" && fcmToken.trim()) {
      await deletePushDeviceTokenByUserAndToken(
        userinf.userId,
        fcmToken.trim(),
      );
      const response = NextResponse.json({ message: "FCM token deleted" });
      response.cookies.set(NOTIFICATION_TOKEN_COOKIE, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: userinf.userId,
        endpoint,
      },
    });

    return NextResponse.json({ message: "Subscription deleted" });
  } catch (error) {
    console.error("[API] Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 },
    );
  }
}
