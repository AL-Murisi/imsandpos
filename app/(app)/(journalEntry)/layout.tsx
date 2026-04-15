"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/context/AuthContext";

export default function StocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { hasAnyRole } = useAuth();

  const navItems = [
    {
      label: "قيود يومية",
      href: "/journal",
      roles: ["admin", "accountant"],
    },
    {
      label: "قيد يدوي",
      href: "/menualjournal",
      roles: ["admin", "accountant"],
    },
    {
      label: "سنة مالية",
      href: "/fiscalYears",
      roles: ["admin", "accountant"],
    },
    {
      label: "السندات",
      href: "/voucher",
      roles: ["admin", "accountant"],
    },
    {
      label: "المصاريف",
      href: "/expenses",
      roles: ["admin", "accountant"],
    },
  ];

  const visibleItems = navItems.filter((item) => hasAnyRole(item.roles));

  return (
    <div className="space-y-2">
      <div className="border-primary flex flex-wrap gap-2 rounded-2xl border-1 p-1">
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

      <ScrollArea className="h-[90vh] transition-opacity duration-300">
        {children}
      </ScrollArea>
    </div>
  );
}
