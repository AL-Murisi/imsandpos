"use client";

import { usePathname, useRouter } from "next/navigation"; // Added useRouter
import { useTransition } from "react"; // Added useTransition
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/context/AuthContext";
import { Loader2 } from "lucide-react"; // Assuming you use lucide-react for a spinner

export default function StocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // startTransition: function to trigger the update
  // isPending: boolean that is true while the transition is running
  const [isPending, startTransition] = useTransition();

  const { hasAnyRole } = useAuth();

  const navItems = [
    { label: "المستخدمين", href: "/user", roles: ["admin"] },
    { label: "العملاء", href: "/customer", roles: ["admin"] },
    { label: "الموظفين", href: "/employee", roles: ["admin"] },
    { label: "أنشطة المستخدم", href: "/userActiviteslogs", roles: ["admin"] },
  ];

  const visibleItems = navItems.filter((item) => hasAnyRole(item.roles));

  const handleNavigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div className="space-y-2">
      <div className="px-5">
        <div className="border-primary flex flex-wrap items-center gap-2 rounded-2xl border-1 p-1">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Button
                key={item.href}
                variant={isActive ? "default" : "outline"}
                disabled={isPending} // Disable buttons during transition
                onClick={() => handleNavigate(item.href)}
                className={cn(
                  "relative transition-all duration-200",
                  isActive && "shadow-inner",
                  isPending && "cursor-wait opacity-70",
                )}
              >
                {item.label}
              </Button>
            );
          })}

          {/* Optional: Visual indicator that a transition is happening */}
          {isPending && (
            <Loader2 className="text-primary h-4 w-4 animate-spin" />
          )}
        </div>
      </div>

      {/* Fade the content area while pending */}
      <div
        className={cn(
          "transition-opacity duration-300",
          isPending ? "pointer-events-none opacity-50" : "opacity-100",
        )}
      >
        {children}
      </div>
    </div>
  );
}
