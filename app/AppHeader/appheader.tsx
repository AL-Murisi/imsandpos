"use client";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "../../components/toggoletheme";
import { usePathname } from "next/navigation";
import { SidebarTrigger } from "../../components/ui/sidebar";
import React from "react";
import { AiFillProduct } from "react-icons/ai";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";

export default function Appheader() {
  const t = useTranslations("menu");
  const menuItems = [
    {
      title: t("home"),
      url: "/dashboard",
    },
    {
      title: t("home"),
      url: "/inventory/dashboardUser",
    },
    {
      title: t("users"),
      url: "/users",
    },
    {
      title: t("inventory"),
      url: "/inventory/manageinvetory",
    },
    {
      title: t("products"),
      url: "/inventory/products",
    },
    {
      title: `${t("products")}/${t("new")}`,
      url: "/inventory/products/new",
    },
    {
      title: t("categories"), // Categories
      url: "/inventory/categories",
    },
    {
      title: t("sales"),
      url: "/sells",
    },
    {
      title: t("warehouses"), // Warehouses
      url: "/inventory/warehouses",
    },
    {
      title: t("suppliers"), // Suppliers
      url: "/inventory/suppliers",
    },
    {
      title: t("sales"),
      url: "/sells/cashiercontrol",
    },
    {
      title: t("reservedOrders"),
      url: "/sells/reservation",
    },
    {
      title: t("debt"),
      url: "/debt",
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
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">{pageTitle}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            {/* <a
              href="https://github.com/shadcn-ui/ui/tree/main/apps/v4/app/(examples)/dashboard"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a> */}
          </Button>
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
