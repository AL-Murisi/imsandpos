"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/context/AuthContext";

export default function StocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { hasAnyRole } = useAuth();

  const navItems = [
    { label: "معلومات الشركة", href: "/company", roles: ["admin"] },
    { label: "الأدوار", href: "/userroles", roles: ["admin"] },
    { label: "المستخدمين", href: "/user", roles: ["admin"] },
    {
      label: "أنشطة المستخدم",
      href: "/userActiviteslogs",
      roles: ["admin"],
    },
    { label: "الفروع", href: "/branches", roles: ["admin"] },
  ];

  const visibleItems = navItems.filter((item) => hasAnyRole(item.roles));

  return (
    <div className="p-1">
      <div className="flex flex-wrap gap-2 border-b p-2">
        {visibleItems.map((item) => {
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
