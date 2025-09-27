import { getUserLocale } from "@/lib/local";
import { getRequestConfig } from "next-intl/server";

// Supported locales

export default getRequestConfig(async () => {
  // Use fallback 'en' if locale is missing or invalid
  const locale = await getUserLocale();

  return {
    locale, // ✅ guaranteed string
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
