"use client";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "../../components/toggoletheme";
import { usePathname } from "next/navigation";
import { SidebarTrigger, useSidebar } from "../../components/ui/sidebar";
import React from "react";
import { AiFillProduct } from "react-icons/ai";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import PushNotificationManager from "@/components/NotificationBell";
import { Menu } from "lucide-react";

export default function Appheader() {
  const t = useTranslations("menu");

  const menuItems = [
    // --- الرئيسية ---
    { title: t("home"), url: "/dashboard" },
    { title: t("home"), url: "/dashboardUser" },

    // --- إدارة المستخدمين والشركة (Users & Company) ---
    { title: t("company"), url: "/company" },
    { title: t("userManagement"), url: "/user" },
    { title: t("branches"), url: "/branches" },
    { title: t("userActivities"), url: "/userActiviteslogs" },
    { title: t("userRoles"), url: "/userroles" },

    // --- المخزون (Inventory) ---
    { title: t("manageInventory"), url: "/inventory" },
    { title: t("manageStocks"), url: "/manageStocks" },
    { title: t("brand"), url: "/brand" },
    { title: t("categories"), url: "/categories" },
    { title: t("products"), url: "/products" },
    { title: t("suppliers"), url: "/suppliers" },
    { title: t("warehouses"), url: "/warehouses" },
    { title: t("cashierMain"), url: "/salesDashboard" }, // مضاف
    { title: t("cashier"), url: "/cashiercontrol" }, //
    // --- القيود المحاسبية (Journal Entries) ---
    { title: t("fiscalYears"), url: "/fiscalYears" },
    { title: t("journal"), url: "/journal" },
    { title: t("manualJournal"), url: "/menualjournal" },
    { title: t("vouchers"), url: "/voucher" },

    // --- المالية والتقارير ---
    { title: t("balanceSheet"), url: "/balanceSheet" },
    { title: t("banks"), url: "/banks" },
    { title: t("chartOfAccount"), url: "/chartOfAccount" },
    { title: t("expenses"), url: "/expenses" },
    { title: t("customer"), url: "/customer" },
    { title: t("reports"), url: "/reports" },
    { title: t("settings"), url: "/settings" },
  ];
  type MenuItem = (typeof menuItems)[number];
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  function usePageTitle() {
    // Recursively find title by url
    const findTitle = (items: MenuItem[], path: string): string | null => {
      for (const item of items) {
        if (item.url === path) return item.title;
      }
      return null;
    };

    const title = findTitle(menuItems, pathname) ?? "";

    return title;
  }
  const pageTitle = usePageTitle();

  return (
    <header
      className="dark:bg-accent dark:text-foreground text-sidebar flex h-10 shrink-0 items-center gap-2 border-b bg-[#0b142a] transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
      dir="rtl"
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center text-xs"
        >
          <Menu size={22} />
        </button>{" "}
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{pageTitle}</h1>
        <div className="ml-auto flex items-center gap-2">
          <PushNotificationManager />
        </div>
      </div>
    </header>
  );
}
function AppLogo() {
  return (
    <div className="flex items-center gap-2 transition-all">
      <div
        className={
          "bg-primary text-primary-foreground flex aspect-square size-10 items-center justify-center rounded-lg"
        }
      >
        <AiFillProduct className="text-xl" />
      </div>

      <div className="flex items-center gap-1 text-left text-sm leading-tight">
        <span className="truncate text-[24px] font-semibold">Stockly</span>
      </div>
    </div>
  );
}
