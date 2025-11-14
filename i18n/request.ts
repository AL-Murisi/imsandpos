import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { currencyConfig } from "@/currency/config";
import { getUserLocale } from "@/lib/local";

const messagesCache = new Map<string, any>();

async function getMessages(locale: string) {
  if (messagesCache.has(locale)) return messagesCache.get(locale);

  try {
    const messages = (await import(`../messages/${locale}.json`)).default;
    messagesCache.set(locale, messages);
    return messages;
  } catch {
    if (!messagesCache.has("ar")) {
      const fallback = (await import(`../messages/ar.json`)).default;
      messagesCache.set("ar", fallback);
    }
    return messagesCache.get("ar");
  }
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = await getUserLocale();
  const messages = await getMessages(locale);

  // ✅ Read currency from cookie per user
  const currencyCookie = cookieStore.get("NEXT_CURRENCY")
    ?.value as keyof typeof currencyConfig;
  const currency =
    currencyCookie ||
    (locale.startsWith("en-US")
      ? "USD"
      : locale.startsWith("ar-SA")
        ? "SAR"
        : "YER");

  return {
    locale,
    messages,
    timeZone: "Asia/Riyadh",
    now: new Date(),
    currency: currencyConfig[currency],
  };
});
