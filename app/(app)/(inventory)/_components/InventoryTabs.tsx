"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
};

export default function InventoryTabs({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 border-b p-2">
      {items.map((item) => {
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
  );
}
