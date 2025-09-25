"use client";

import { useState, useEffect } from "react";

type LanguageOption = {
  code: string;
  label: string;
};

const languages: LanguageOption[] = [
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" },
];

interface LanguageSelectorProps {
  defaultLanguage?: string;
  onChange?: (code: string) => void;
}

export function LanguageSelector({
  defaultLanguage = "en",
  onChange,
}: LanguageSelectorProps) {
  const [selected, setSelected] = useState(defaultLanguage);

  useEffect(() => {
    // Load saved language from localStorage if exists
    const savedLang = localStorage.getItem("lang");
    if (savedLang) setSelected(savedLang);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelected(code);
    localStorage.setItem("lang", code);
    if (onChange) onChange(code);
  };

  return (
    <select
      value={selected}
      onChange={handleChange}
      className="rounded-md border bg-white px-3 py-2 dark:bg-gray-800 dark:text-white"
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.label}
        </option>
      ))}
    </select>
  );
}
