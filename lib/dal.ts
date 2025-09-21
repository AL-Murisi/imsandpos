// lib/dal.ts
"use server";
import { cache } from "react";
import { cookies } from "next/headers";
import { decrypt, SessionData } from "@/lib/session";
import { redirect } from "next/navigation"; // ➡️ Keep this import if Dashboard.tsx uses it

export const verifySession = cache(async () => {
  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);

  // Return the session data directly instead of redirecting
  if (!session?.userId) {
    return { isAuth: false, userId: null, userRole: null }; // ➡️ Return a clear failure state
  }

  return { isAuth: true, userId: session.userId, userRole: session.roles };
});
