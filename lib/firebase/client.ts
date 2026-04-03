"use client";

import { getApps, initializeApp } from "firebase/app";
import { getMessaging, isSupported, Messaging } from "firebase/messaging";

function readClientEnv(name: string): string | undefined {
  const envMap: Record<string, string | undefined> = {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_VAPID_KEY: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
  };

  const raw = envMap[name];
  if (!raw) {
    return undefined;
  }

  return raw.trim().replace(/^['"]|['"]$/g, "");
}

const firebaseConfig = {
  apiKey: readClientEnv("NEXT_PUBLIC_FIREBASE_API_KEY"),
  authDomain: readClientEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: readClientEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: readClientEnv("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: readClientEnv("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: readClientEnv("NEXT_PUBLIC_FIREBASE_APP_ID"),
};

export function firebaseClientConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId,
  );
}

export async function getFirebaseMessagingClient(): Promise<Messaging | null> {
  if (!firebaseClientConfigured()) {
    console.error("[Firebase Client] Missing browser config", {
      hasApiKey: Boolean(firebaseConfig.apiKey),
      hasAuthDomain: Boolean(firebaseConfig.authDomain),
      hasProjectId: Boolean(firebaseConfig.projectId),
      hasStorageBucket: Boolean(firebaseConfig.storageBucket),
      hasMessagingSenderId: Boolean(firebaseConfig.messagingSenderId),
      hasAppId: Boolean(firebaseConfig.appId),
    });
    return null;
  }

  const supported = await isSupported();
  if (!supported) {
    console.error("[Firebase Client] firebase/messaging is not supported on this browser/device");
    return null;
  }

  try {
    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    return getMessaging(app);
  } catch (error) {
    console.error("[Firebase Client] Failed to initialize Firebase messaging", error);
    return null;
  }
}
