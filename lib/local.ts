// "use server";

// import { cookies } from "next/headers";
// import { Locale, defaultLocale } from "@/i18n/config";

// // In this example the locale is read from a cookie. You could alternatively
// // also read it from a database, backend service, or any other source.
// const COOKIE_NAME = "NEXT_LOCALE";

// export async function getUserLocale() {
//   return (await cookies()).get(COOKIE_NAME)?.value || defaultLocale;
// }

// export async function setUserLocale(locale: Locale) {
//   (await cookies()).set(COOKIE_NAME, locale);
// }
"use server";

import { cookies } from "next/headers";
import { Locale, defaultLocale } from "@/i18n/config";

const COOKIE_NAME = "NEXT_LOCALE";

// ✅ Cache the cookie jar to reduce async overhead
let cachedCookieStore: Awaited<ReturnType<typeof cookies>> | null = null;

export async function getUserLocale(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const locale = cookieStore.get(COOKIE_NAME)?.value as Locale | undefined;
    return locale && isValidLocale(locale) ? locale : defaultLocale;
  } catch {
    return defaultLocale;
  }
}

export async function setUserLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, locale, {
    maxAge: 31536000, // 1 year
    path: "/",
    sameSite: "lax",
  });
}

// ✅ Type guard for locale validation
function isValidLocale(value: string): value is Locale {
  return ["en", "ar"].includes(value);
}
