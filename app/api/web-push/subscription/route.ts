import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const userinf = await getSession();

    if (!userinf) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userinf.userId },
      select: { companyId: true, roles: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { subscription } = body;

    console.log(
      "[API] Received subscription:",
      JSON.stringify(subscription, null, 2),
    );

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription - missing endpoint" },
        { status: 400 },
      );
    }

    // Extract keys from subscription
    const keys = subscription.keys;

    if (!keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: "Invalid subscription - missing keys" },
        { status: 400 },
      );
    }

    console.log("[API] Saving subscription for user:", userinf.userId);

    // Save or update subscription in database
    const savedSubscription = await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: userinf.userId,
        company_id: user.companyId,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        company_id: user.companyId,
        userId: userinf.userId,
      },
    });

    console.log("[API] Subscription saved:", savedSubscription.id);

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

// Delete subscription
export async function DELETE(request: Request) {
  try {
    const userinf = await getSession();

    if (!userinf) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint } = await request.json();

    console.log("[API] Deleting subscription for endpoint:", endpoint);

    await prisma.pushSubscription.deleteMany({
      where: {
        userId: userinf.userId,
        endpoint: endpoint,
      },
    });

    console.log("[API] Subscription deleted successfully");

    return NextResponse.json({ message: "Subscription deleted" });
  } catch (error) {
    console.error("[API] Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 },
    );
  }
}
