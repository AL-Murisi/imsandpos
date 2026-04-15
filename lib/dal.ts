// lib/dal.ts
"use server";
import { cache } from "react";
import { getSession } from "@/lib/session";

export const verifySession = cache(async () => {
  const session = await getSession();

  // Return the session data directly instead of redirecting
  if (!session?.userId) {
    return { isAuth: false, userId: null, userRole: null }; // ➡️ Return a clear failure state
  }

  return { isAuth: true, userId: session.userId, userRole: session.role };
});
