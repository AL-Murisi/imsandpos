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
    {
      title: t("home"),
      url: "/dashboard",
    },
    {
      title: t("home"),
      url: "/dashboardUser",
    },
    {
      title: t("users"),
      url: "/company",
    },
    {
      title: t("inventory"),
      url: "/inventory",
    },
    {
      title: t("products"),
      url: "/products",
    },
    {
      title: `${t("products")}/${t("new")}`,
      url: "/products/new",
    },
    {
      title: t("categories"), // Categories
      url: "/categories",
    },
    {
      title: t("sales"),
      url: "/sells",
    },
    {
      title: t("warehouses"), // Warehouses
      url: "/warehouses",
    },
    {
      title: t("suppliers"), // Suppliers
      url: "/suppliers",
    },
    {
      title: t("sales"),
      url: "/cashiercontrol",
    },
    {
      title: t("reservedOrders"),
      url: "/sells/reservation",
    },

    {
      title: t("profile"),
      url: "/profile",
    },
    {
      title: t("settings"),
      url: "/settings",
    },
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
