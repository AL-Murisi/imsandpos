// // import webpush from "web-push";
// // import { NextResponse } from "next/server";
// // import type { PushSubscription } from "web-push";

// // if (
// //   !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
// //   !process.env.VAPID_PRIVATE_KEY
// // ) {
// //   throw new Error("Missing VAPID keys");
// // }

// // webpush.setVapidDetails(
// //   process.env.VAPID_SUBJECT!,
// //   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
// //   process.env.VAPID_PRIVATE_KEY!,
// // );

// // // ⚠️ TEMP ONLY – replace with DB fetch
// // let subscription: PushSubscription | null = null;

// // export async function POST(request: Request) {
// //   const { subscription, title, body } = (await request.json()) as {
// //     subscription: PushSubscription;
// //     title: string;
// //     body: string;
// //   };

// //   if (!subscription) {
// //     return NextResponse.json(
// //       { error: "No subscription provided" },
// //       { status: 400 },
// //     );
// //   }

// //   const payload = JSON.stringify({ title, body });
// //   console.log(payload);
// //   await webpush.sendNotification(subscription, payload);

// //   return NextResponse.json({ message: "Push sent" });
// // }
// import webpush from "web-push";
// import { NextResponse } from "next/server";
// import type { PushSubscription } from "web-push";

// // ⚠️ Only the public key should be exposed to client
// if (
//   !process.env.VAPID_PRIVATE_KEY ||
//   !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
//   !process.env.VAPID_SUBJECT
// ) {
//   throw new Error("Missing VAPID keys");
// }

// webpush.setVapidDetails(
//   process.env.VAPID_SUBJECT,
//   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
//   process.env.VAPID_PRIVATE_KEY,
// );

// export async function POST(request: Request) {
//   try {
//     const { subscription, title, body } = (await request.json()) as {
//       subscription: PushSubscription;
//       title: string;
//       body: string;
//     };

//     if (!subscription) {
//       return NextResponse.json(
//         { error: "No subscription provided" },
//         { status: 400 },
//       );
//     }

//     const payload = JSON.stringify({ title, body });

//     await webpush.sendNotification(subscription, payload);

//     return NextResponse.json({ message: "Push sent" });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ error: "Failed to send push" }, { status: 500 });
//   }
// }
import webpush from "web-push";
import { NextResponse } from "next/server";
import type { PushSubscription } from "web-push";

// ⚠️ Only the public key should be exposed to client
if (
  !process.env.VAPID_PRIVATE_KEY ||
  !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  !process.env.VAPID_SUBJECT
) {
  throw new Error("Missing VAPID keys");
}

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

export async function POST(request: Request) {
  try {
    const { subscription, title, body } = (await request.json()) as {
      subscription: PushSubscription;
      title: string;
      body: string;
    };

    if (!subscription) {
      return NextResponse.json(
        { error: "No subscription provided" },
        { status: 400 },
      );
    }

    const payload = JSON.stringify({ title, body });

    await webpush.sendNotification(subscription, payload);

    return NextResponse.json({ message: "Push sent" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send push" }, { status: 500 });
  }
}
