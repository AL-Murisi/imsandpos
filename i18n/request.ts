import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { currencyConfig } from "@/currency/config"; // ✅ your existing config
import { getUserLocale } from "@/lib/local";

// ✅ Cache translations at build time
const messagesCache = new Map<string, any>();

async function getMessages(locale: string) {
  if (messagesCache.has(locale)) return messagesCache.get(locale);

  try {
    const messages = (await import(`../messages/${locale}.json`)).default;
    messagesCache.set(locale, messages);
    return messages;
  } catch {
    // Fallback to Arabic if not found
    if (!messagesCache.has("ar")) {
      const fallback = (await import(`../messages/ar.json`)).default;
      messagesCache.set("ar", fallback);
    }
    return messagesCache.get("ar");
  }
}

// ✅ Detect currency from locale (fallback if cookie not set)
function detectCurrency(locale: string): keyof typeof currencyConfig {
  if (locale.startsWith("en-US")) return "USD";
  if (locale.startsWith("ar-SA")) return "SAR";
  return "YER";
}

export default getRequestConfig(async () => {
  const cookieStore = cookies();
  const locale = await getUserLocale();
  const messages = await getMessages(locale);

  // ✅ Get currency from cookies, fallback based on locale
  const currency = ((await cookieStore).get("NEXT_CURRENCY")?.value ||
    "YER") as keyof typeof currencyConfig;
  // ✅ Optionally store currency in cookie if missing

  return {
    locale,
    messages,
    timeZone: "Asia/Riyadh",
    now: new Date(),
    currency: currencyConfig[currency],
  };
});
