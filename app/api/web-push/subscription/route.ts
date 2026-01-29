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
import { NextResponse } from "next/server";
import type { PushSubscription } from "web-push";

let subscription: PushSubscription | null = null;

export async function POST(request: Request) {
  const body = await request.json();
  subscription = body.subscription;

  return NextResponse.json({ message: "Subscription saved" });
}
