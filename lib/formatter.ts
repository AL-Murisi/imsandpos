export const AR_LOCALE = "ar-EG";
export const EN_LOCALE = "en-US";
export const DEFAULT_PAGE = "1";
export const DEFAULT_LIMIT = "13";
export const CHART_HEIGHT = 300;

export const HERO_GRADIENT =
  "linear-gradient(135deg, #0b142a 0%, #132347 55%, #18325f 100%)";

export const formatCurrency = (value: number, digits = 0) =>
  value.toLocaleString(EN_LOCALE, { maximumFractionDigits: digits });

export const formatDate = (date: string | Date, locale = "ar-EG") =>
  new Date(date).toLocaleDateString(locale);

export const formatShortDate = (date: string) =>
  new Date(date).toLocaleDateString("ar-EG", { weekday: "short" });

export const formatTooltipDate = (date: string) =>
  new Date(date).toLocaleDateString("ar-EG", {
    day: "numeric",
    month: "short",
  });
