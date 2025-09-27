// export type Locale = (typeof locales)[number];

// export const locales = ["en", "ar"] as const;
// export const defaultLocale: Locale = "ar";
export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";

// ✅ Preload configuration for better performance
export const localeConfig = {
  locales,
  defaultLocale,
  localeDetection: false, // Disable automatic detection for speed
} as const;
