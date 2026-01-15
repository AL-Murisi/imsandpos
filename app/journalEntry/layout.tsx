"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function StocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  // Navigation items configuration
  const navItems = [
    { label: "قيود يوميه", href: "/journalEntry/journal" },
    { label: "قيد يدوي", href: "/journalEntry/menualjournal" },
    { label: " سنه ماليه", href: "/journalEntry/fiscalYears" },
    { label: "السندات", href: "/journalEntry/voucher" },
  ];

  const handleNavigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div className="p-1">
      {/* --- Tab Buttons --- */}
      <div className="flex flex-wrap gap-2 border-b p-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              variant={isActive ? "default" : "outline"}
              disabled={isPending} // Prevents double-clicking
              className={cn(
                "relative transition-all duration-200",
                isActive && "shadow-inner",
              )}
            >
              {item.label}
              {/* Optional: Show tiny loader inside the active button if pending */}
              {/* {isPending && isActive && (
                <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
              )} */}
            </Button>
          );
        })}
      </div>

      {/* --- Global Loading Overlay (Optional) --- */}
      {/* {isPending && (
        <div className="text-muted-foreground flex animate-pulse items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          جاري التحميل...
        </div>
      )} */}

      {/* --- Content Area --- */}
      <ScrollArea
        className={cn(
          "h-[90vh] transition-opacity duration-300",
          isPending ? "opacity-50" : "opacity-100",
        )}
      >
        {children}
      </ScrollArea>
    </div>
  );
}
