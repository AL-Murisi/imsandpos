"use client";

import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";

// THIS WILL WORK

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
