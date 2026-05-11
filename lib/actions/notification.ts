"use server";

import prisma from "../prisma";
import { getSession } from "../session";
import { getUserCompany } from "./chartOfaccounts";
const webpush = require("web-push");
// ✅ Initialize VAPID details
webpush.setVapidDetails(
  "mailto:moham714854@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

// export async function subscribeUser(sub: PushSubscriptionJSON) {
//   try {
//     const company = await getSession();
//     if (!company) {
//       console.error("❌ No session found");
//       return { success: false, error: "Not authenticated" };
//     }

//     // Validate subscription data
//     if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
//       console.error("❌ Invalid subscription payload:", sub);
//       return { success: false, error: "Invalid subscription data" };
//     }

//     const endpoint = sub.endpoint;
//     const p256dh = sub.keys.p256dh;
//     const auth = sub.keys.auth;

//     // Upsert subscription in database
//     await prisma.pushSubscription.upsert({
//       where: { endpoint },
//       update: {
//         userId: company.userId,
//         role: company.userRole,
//         company_id: company.companyId,
//         p256dh,
//         auth,
//       },
//       create: {
//         endpoint,
//         p256dh,
//         auth,
//         userId: company.userId,
//         role: company.userRole,
//         company_id: company.companyId,
//       },
//     });

//     console.log("✅ Subscription saved for user:", company.userId);
//     return { success: true };
//   } catch (error) {
//     console.error("❌ Error subscribing user:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }

// export async function unsubscribeUser() {
//   try {
//     const company = await getSession();
//     if (!company) {
//       return { success: false, error: "Not authenticated" };
//     }

//     // Delete user's subscriptions
//     await prisma.pushSubscription.deleteMany({
//       where: {
//         userId: company.userId,
//         company_id: company.companyId,
//       },
//     });

//     console.log("✅ Subscription removed for user:", company.userId);
//     return { success: true };
//   } catch (error) {
//     console.error("❌ Error unsubscribing user:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }

export async function sendTestNotifications(message: string) {
  try {
    const company = await getSession();
    if (!company) {
      return { success: false, error: "Not authenticated" };
    }

    // Get all subscriptions for the company
    const subs = await prisma.pushSubscription.findMany({
      where: {
        company_id: company.companyId,
      },
    });

    if (subs.length === 0) {
      console.warn("⚠️ No subscriptions found");
      return { success: false, error: "No subscriptions found" };
    }

    const payload = JSON.stringify({
      title: "إشعار تجريبي",
      body: message,
      url: "/sells",
      icon: "/icon.png",
      badge: "/badge.png",
      timestamp: Date.now(),
    });

    console.log(`📤 Sending to ${subs.length} subscriptions`);

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subs.map((sub) => sendToSubscription(sub, payload)),
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    console.log(`✅ Sent: ${successful}, ❌ Failed: ${failed}`);

    return {
      success: true,
      sent: successful,
      failed,
    };
  } catch (error) {
    console.error("❌ Error sending notifications:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function sendToSubscription(sub: any, payload: string) {
  try {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };

    await webpush.sendNotification(pushSubscription, payload, {
      TTL: 3600, // ✅ REQUIRED for FCM
    });
    console.log("✅ Notification sent to:", sub.endpoint.substring(0, 50));
  } catch (err: any) {
    console.error("❌ Failed to send to subscription:", err);

    // Remove expired subscriptions

    throw err;
  }
}

// // Generic notification sender
// export async function sendNotificationToUser(
//   userId: string,
//   title: string,
//   body: string,
//   url = "/",
// ) {
//   try {
//     const subs = await prisma.pushSubscription.findMany({
//       where: { userId },
//     });

//     if (subs.length === 0) {
//       return { success: false, error: "No subscriptions for user" };
//     }

//     const payload = JSON.stringify({
//       title,
//       body,
//       url,
//       icon: "/icon.png",
//       badge: "/badge.png",
//     });

//     await Promise.allSettled(subs.map((s) => sendToSubscription(s, payload)));

//     return { success: true };
//   } catch (error) {
//     console.error("❌ Error sending notification:", error);
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }

// export async function subscribeUser(sub: PushSubscriptionJSON) {
//   const company = await getSession();
//   if (!company) {
//     console.error("❌ No session found");
//     return { success: false, error: "Not authenticated" };
//   }
//   if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
//     console.error("❌ Invalid subscription payload:", sub);
//     return { success: false, error: "Invalid subscription data" };
//   }

//   await prisma.pushSubscription.upsert({
//     where: { endpoint: sub.endpoint },
//     update: {},
//     create: {
//       endpoint: sub.endpoint,
//       p256dh: sub.keys!.p256dh,
//       auth: sub.keys!.auth,
//       company_id: company.companyId,
//       userId: company.userId,
//       role: company.userRole,
//     },
//   });
// }

// export async function unsubscribeUser(endpoint: string) {
//   await prisma.pushSubscription.deleteMany({
//     where: { endpoint },
//   });
// }
