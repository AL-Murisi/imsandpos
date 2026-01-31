// import webpush from "web-push";
// import { NextResponse } from "next/server";

// export async function POST(request: Request) {
//   // 1. Check keys INSIDE the function
//   const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
//   const privateKey = process.env.VAPID_PRIVATE_KEY;
//   const subject = process.env.VAPID_SUBJECT;

//   if (!publicKey || !privateKey || !subject) {
//     console.error("VAPID keys are missing in environment variables");
//     return NextResponse.json(
//       { error: "Server configuration error" },
//       { status: 500 },
//     );
//   }

//   // 2. Set details only when needed
//   webpush.setVapidDetails(subject, publicKey, privateKey);

//   try {
//     const { subscription, title, body } = await request.json();

//     // if (!subscription) {
//     //   return NextResponse.json({ error: "No subscription" }, { status: 400 });
//     // }

//     const payload = JSON.stringify({
//       title,
//       body,
//       data: { sound: "/sounds/notification.wav" }, // Adding your WAV sound here!
//     });

//     await webpush.sendNotification(subscription, payload);

//     return NextResponse.json({ message: "Push sent" });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ error: "Failed to send push" }, { status: 500 });
//   }
// }

// import webpush from "web-push";
// import prisma from "@/lib/prisma";
// import { NextResponse } from "next/server";

// export async function POST(req: Request) {
//   const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
//   const privateKey = process.env.VAPID_PRIVATE_KEY;
//   const subject = process.env.VAPID_SUBJECT;

//   if (!publicKey || !privateKey || !subject) {
//     return NextResponse.json(
//       { error: "Missing VAPID configuration" },
//       { status: 500 },
//     );
//   }

//   webpush.setVapidDetails(subject, publicKey, privateKey);

//   const { companyId, roles, title, body } = await req.json();

//   if (!companyId || !title || !body) {
//     return NextResponse.json(
//       { error: "Missing required fields" },
//       { status: 400 },
//     );
//   }

//   const subscriptions = await prisma.pushSubscription.findMany({
//     where: {
//       company_id: companyId,
//     },
//   });

//   if (!subscriptions.length) {
//     return NextResponse.json({ success: true, sent: 0 });
//   }

//   const payload = JSON.stringify({ title, body });

//   let sent = 0;

//   for (const sub of subscriptions) {
//     try {
//       await webpush.sendNotification(
//         {
//           endpoint: sub.endpoint,
//           keys: {
//             p256dh: sub.p256dh,
//             auth: sub.auth,
//           },
//         },
//         payload,
//       );
//       sent++;
//     } catch (err: any) {
//       // 🔥 Remove expired / invalid subscriptions
//       if (err?.statusCode === 404 || err?.statusCode === 410) {
//         await prisma.pushSubscription.delete({
//           where: { endpoint: sub.endpoint },
//         });
//       }
//     }
//   }

//   return NextResponse.json({ success: true, sent });
// }
import webpush from "web-push";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  // 1. Check VAPID keys
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    console.error("VAPID keys are missing in environment variables");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  // 2. Set VAPID details
  webpush.setVapidDetails(subject, publicKey, privateKey);

  try {
    const { companyId, role, title, body } = await request.json();

    if (!companyId || !title || !body) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 3. Get all push subscriptions for this company and role
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        company_id: companyId,
        // ...(role && { role: role }),
      },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { message: "No subscriptions found for the target users" },
        { status: 200 },
      );
    }

    // 4. Prepare notification payload
    const payload = JSON.stringify({
      title,
      body,
      //   icon: "/icon-192x192.png",
      //   badge: "/badge-72x72.png",
      data: {
        url: "/",
        sound: "/sounds/notification.wav",
      },
    });

    // 5. Send to all subscriptions
    const sendPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, payload);
        return { success: true, endpoint: sub.endpoint };
      } catch (error: any) {
        console.error(`Failed to send to ${sub.endpoint}:`, error);

        // If subscription is invalid (410 Gone), delete it
        if (error.statusCode === 410) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id },
          });
        }

        return { success: false, endpoint: sub.endpoint, error: error.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter((r) => r.success).length;

    return NextResponse.json({
      message: `Push notifications sent`,
      total: subscriptions.length,
      successful: successCount,
      failed: subscriptions.length - successCount,
      results,
    });
  } catch (err) {
    console.error("Error sending push notifications:", err);
    return NextResponse.json(
      { error: "Failed to send push notifications" },
      { status: 500 },
    );
  }
}
