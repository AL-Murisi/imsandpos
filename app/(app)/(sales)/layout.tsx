"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function StocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "المبيعات", href: "/salesDashboard" },
    { label: "الكاشير", href: "/cashiercontrol" },
  ];

  return (
    <div className="space-y-2">
      <div className="px-5">
        <div className="border-primary flex flex-wrap gap-2 rounded-2xl border-1 p-1">
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
      </div>

      <ScrollArea className="h-[90vh] transition-opacity duration-300">
        {children}
      </ScrollArea>
    </div>
  );
}
