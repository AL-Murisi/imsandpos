"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function StocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "معلومات الشركة", href: "/company" },
    { label: "الأدوار", href: "/userroles" },
    { label: "المستخدمين", href: "/user" },
    { label: "أنشطة المستخدم", href: "/userActiviteslogs" },
    { label: "الفروع", href: "/branches" },
  ];

  return (
    <div className="p-1">
      <div className="flex flex-wrap gap-2 border-b p-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Button
              key={item.href}
              asChild
              variant={isActive ? "default" : "outline"}
              className={cn(
                "relative transition-all duration-200",
                isActive && "shadow-inner",
              )}
            >
              <Link href={item.href} prefetch>
                {item.label}
              </Link>
            </Button>
          );
        })}
      </div>

      <div className="transition-opacity duration-300">{children}</div>
    </div>
  );
}
