// lib/session.ts
"use server";
import { logActivity } from "@/app/actions/activitylogs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { useAuth } from "./context/AuthContext";
import { redirect } from "next/navigation";

const secretKey = process.env.ENCRYPTION_SECRET;
const encodedKey = new TextEncoder().encode(secretKey);

export interface SessionData {
  userId: string;
  roles: string[];
  name: string;
  email: string;
  companyId: string;
  [key: string]: any; // Add index signature for JWT compatibility
}

export async function encrypt(payload: SessionData): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function decrypt(
  session: string | undefined = "",
): Promise<SessionData | null> {
  if (!session || !session.includes(".")) {
    // Not a valid JWT format
    return null;
  }

  try {
    const { payload } = await jwtVerify(session, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as SessionData;
  } catch (error) {
    return null;
  }
}

export async function createSession(userData: SessionData) {
  const session = await encrypt(userData);
  const cookieStore = await cookies();

  cookieStore.set("session", session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}

export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  return await decrypt(session);
}
