// lib/session.ts
"use server";

import { auth as nextAuth } from "@/auth";

export interface SessionData {
  userId: string;
  roles: string[];
  name: string;
  email: string;
  companyId: string;
  [key: string]: any;
}

export async function getSession(): Promise<SessionData | null> {
  const session = await nextAuth();
  const user = session?.user as
    | {
        userId?: string;
        roles?: string[];
        name?: string | null;
        email?: string | null;
        companyId?: string;
      }
    | undefined;

  if (!user?.userId || !user?.companyId) {
    return null;
  }

  return {
    userId: user.userId,
    roles: user.roles ?? [],
    name: user.name ?? "",
    email: user.email ?? "",
    companyId: user.companyId,
  };
}
