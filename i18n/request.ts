// import { getUserLocale } from "@/lib/local";
// import { getRequestConfig } from "next-intl/server";

// // Supported locales

// export default getRequestConfig(async () => {
//   // Use fallback 'en' if locale is missing or invalid
//   const locale = await getUserLocale();

//   return {
//     locale, // ✅ guaranteed string
//     messages: (await import(`../messages/${locale}.json`)).default,
//   };
// // });
// import enMessages from "../messages/en.json";
// import arMessages from "../messages/ar.json";
// import { getUserLocale } from "@/lib/local";
// import { getRequestConfig } from "next-intl/server";
// import { locales, type Locale } from "@/i18n/config";

// const messagesMap: Record<Locale, any> = {
//   en: enMessages,
//   ar: arMessages,
// };

// export default getRequestConfig(async () => {
//   const userLocale = await getUserLocale();

//   // Narrow the type: fallback to "en" if userLocale is invalid
//   const locale: Locale = locales.includes(userLocale as Locale)
//     ? (userLocale as Locale)
//     : "en";

//   return {
//     locale,
//     messages: messagesMap[locale],
//   };
// });
import { getUserLocale } from "@/lib/local";
import { getRequestConfig } from "next-intl/server";

// ✅ Pre-load and cache translations at build time
const messagesCache = new Map<string, any>();

async function getMessages(locale: string) {
  if (messagesCache.has(locale)) {
    return messagesCache.get(locale);
  }

  try {
    const messages = (await import(`../messages/${locale}.json`)).default;
    messagesCache.set(locale, messages);
    return messages;
  } catch {
    // Fallback to default locale
    if (!messagesCache.has("ar")) {
      const fallback = (await import(`../messages/ar.json`)).default;
      messagesCache.set("ar", fallback);
    }
    return messagesCache.get("ar");
  }
}

export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  const messages = await getMessages(locale);

  return {
    locale,
    messages,
    timeZone: "Asia/Riyadh", // ✅ Add if using Arabic locale primarily
    now: new Date(),
  };
});
