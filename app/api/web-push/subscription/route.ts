// import webpush from "web-push";
// import type { PushSubscription } from "web-push";

// if (
//   !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
//   !process.env.NEXT_PUBLIC_VAPID_PRIVATE_KEY
// ) {
//   throw new Error("Missing VAPID keys");
// }

// webpush.setVapidDetails(
//   "mail@example.com",
//   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
//   process.env.NEXT_PUBLIC_VAPID_PRIVATE_KEY,
// );
// let subscription: PushSubscription;

// export async function POST(request:Request) {
//   const { pathname } = new URL(request.url);
//   switch (pathname) {
//     case '/api/web-push/subscription':
//       return setSubscription(request);
//     case '/api/web-push/send':
//       return sendPush(request);
//     default:
//       return notFoundApi();
//   }
// }

// async function setSubscription(request:Request) {
//   const body: { subscription: PushSubscription } = await request.json();
//   subscription = body.subscription;
//   return new Response(JSON.stringify({ message: 'Subscription set.' }), {});
// }

// async function sendPush(request:Request) {
//   const body = await request.json();
//   const pushPayload = JSON.stringify(body);
//   await webpush.sendNotification(subscription, pushPayload);
//   return new Response(JSON.stringify({ message: 'Push sent.' }), {});
// }
// import { NextResponse } from "next/server";
// import type { PushSubscription } from "web-push";

// let subscription: PushSubscription | null = null;

// export async function POST(request: Request) {
//   const body = await request.json();
//   subscription = body.subscription;

//   return NextResponse.json({ message: "Subscription saved" });
// }
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const userinf = await getSession(); // Get authenticated user

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

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: "Invalid subscription" },
        { status: 400 },
      );
    }

    // Extract keys from subscription
    const keys = subscription.keys;

    // Save or update subscription in database
    const savedSubscription = await prisma.pushSubscription.upsert({
      where: {
        endpoint: subscription.endpoint,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
      create: {
        endpoint: subscription.endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        company_id: user.companyId,
        userId: userinf.userId,
        // role: user.roles[0], // or determine primary role
      },
    });

    return NextResponse.json({
      message: "Subscription saved successfully",
      subscription: savedSubscription,
    });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 },
    );
  }
}

// Delete subscription
export async function DELETE(request: Request) {
  try {
    const userinf = await getSession(); // Get authenticated user

    if (!userinf) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { endpoint } = await request.json();

    await prisma.pushSubscription.delete({
      where: {
        userId: userinf.userId,
        endpoint: endpoint,
      },
    });

    return NextResponse.json({ message: "Subscription deleted" });
  } catch (error) {
    console.error("Error deleting subscription:", error);
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 },
    );
  }
}
