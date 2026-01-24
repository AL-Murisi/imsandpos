"use client";

import { useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/context/AuthContext"; // استيراد سياق المصادقة

export default function StocksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const { hasAnyRole } = useAuth(); // جلب دالة التحقق من الأدوار

  // 1. إعداد تكوين العناصر مع إضافة الصلاحيات (roles)
  const navItems = [
    {
      label: "المخزون",
      href: "/inventory/manageStocks/inventory",
      roles: ["admin", "manager_wh"],
    },
    {
      label: "التوريد",
      href: "/inventory/manageStocks/purchases",
      roles: ["admin", "manager_wh"],
    },
    {
      label: "حركات المخزون",
      href: "/inventory/manageStocks/movement",
      roles: ["admin"],
    },
    {
      label: "المنتجات",
      href: "/inventory/products",
      roles: ["admin", "manager_wh", "cashier"],
    },
    {
      label: "أصناف",
      href: "/inventory/categories",
      roles: ["admin", "manager_wh"],
    },
    {
      label: "مخازن",
      href: "/inventory/warehouses",
      roles: ["admin"],
    },
  ];

  // 2. تصفية التبويبات بناءً على صلاحيات المستخدم الحالي
  const visibleTabs = navItems.filter((item) => hasAnyRole(item.roles));

  const handleNavigate = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <div className="p-1">
      {/* --- Tab Buttons --- */}
      <div className="flex flex-wrap gap-2 border-b p-2">
        {visibleTabs.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              variant={isActive ? "default" : "outline"}
              disabled={isPending}
              className={cn(
                "relative transition-all duration-200",
                isActive && "shadow-inner",
              )}
            >
              {item.label}
            </Button>
          );
        })}
      </div>

      {/* --- Content Area --- */}
      <div
        className={cn(
          "transition-opacity duration-300",
          isPending ? "opacity-50" : "opacity-100",
        )}
      >
        {children}
      </div>
    </div>
  );
}
