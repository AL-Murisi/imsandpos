// lib/session.ts
"use server";

import { auth as nextAuth } from "@/auth";

export interface SessionData {
  userId: string;
  roles: string[];
  name: string;
  email: string;
  companyId: string;
  subscriptionActive?: boolean;
  subscriptionEndsAt?: string | null;
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
        isActive?: boolean;
        companyActive?: boolean;
        subscriptionActive?: boolean;
        subscriptionEndsAt?: string | null;
      }
    | undefined;

  if (
    !user?.userId ||
    !user?.companyId ||
    user.isActive === false ||
    user.companyActive === false
  ) {
    return null;
  }

  return {
    userId: user.userId,
    roles: user.roles ?? [],
    name: user.name ?? "",
    email: user.email ?? "",
    companyId: user.companyId,
    subscriptionActive: user.subscriptionActive ?? true,
    subscriptionEndsAt: user.subscriptionEndsAt ?? null,
  };
}
