"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/settings", label: "أسعار الصرف" },
  { href: "/settings/currencies", label: "العملات" },
  { href: "/settings/subscription", label: "الاشتراك" },
];

export default function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-2" dir="rtl">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
