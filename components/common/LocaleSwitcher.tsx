import { useLocale, useTranslations } from "next-intl";
import LocaleSwitcherSelect from "./lanSelect";

export default function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const locale = useLocale();

  return (
    <LocaleSwitcherSelect
      defaultValue={locale}
      items={[
        {
          value: "en",
          label: "en",
        },
        {
          value: "ar",
          label: "ar",
        },
      ]}
      label={t("label")}
    />
  );
}
