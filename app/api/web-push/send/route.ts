import webpush from "web-push";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // 1. Check keys INSIDE the function
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

  // 2. Set details only when needed
  webpush.setVapidDetails(subject, publicKey, privateKey);

  try {
    const { subscription, title, body } = await request.json();

    if (!subscription) {
      return NextResponse.json({ error: "No subscription" }, { status: 400 });
    }

    const payload = JSON.stringify({
      title,
      body,
      data: { sound: "/sounds/notification.wav" }, // Adding your WAV sound here!
    });

    await webpush.sendNotification(subscription, payload);

    return NextResponse.json({ message: "Push sent" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to send push" }, { status: 500 });
  }
}
