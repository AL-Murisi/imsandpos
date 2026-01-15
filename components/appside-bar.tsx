// components/appside-bar.tsx (Updated with Role-Based Access)
"use client";

import { useCompany } from "@/hooks/useCompany"; // adjust if different path
import {
  Banknote,
  BarChart3,
  Building2,
  ChevronDown,
  CreditCard,
  FolderKanban,
  Handshake,
  Home,
  LogOut,
  Notebook,
  NotebookPen,
  Package,
  PackageSearch,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
  UserCircle,
  Users,
} from "lucide-react";
import Image from "next/image";

import { useSidebar } from "@/components/ui/sidebar";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "./ui/sidebar";

import { useAuth } from "@/lib/context/AuthContext";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import LocaleSwitcher from "./common/LocaleSwitcher";
import { ModeToggle } from "./toggoletheme";

const IMSLogoIcon = ({ className = "", size = 24, color = "currentColor" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      className={`inline-block align-middle ${className}`}
      aria-hidden="true"
    >
      <g transform="scale(0.8) translate(2.5, 2.5)">
        <path d="M20 6H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zM4 8h16v2H4V8zm0 4h16v2H4v-2zm0 4h16v2H4v-2z" />
        <path d="M20 4H4c-1.1 0-2 .9-2 2v.5c0 .28.22.5.5.5h19c.28 0 .5-.22.5-.5V6c0-1.1-.9-2-2-2z" />
      </g>
    </svg>
  );
};

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import CurrencySwitcher from "./common/CurrencySwitcher";
import { useCurrency } from "./CurrencyProvider";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, hasAnyRole, logoutAndRedirect } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("menu");
  const { currency } = useCurrency();

  // Format the price according to the selected currency

  // If no user, don't render sidebar
  if (!user) {
    return null;
  }

  const menuItems = [
    {
      title: t("home"),
      url: "/dashboard",
      icon: () => <Home className="text-indigo-600" />,
      roles: ["admin"],
    },
    {
      title: t("home"),
      url: "/inventory/dashboardUser",
      icon: () => <Home className="text-indigo-600" />,
      roles: ["manager_wh"],
    },

    {
      title: t("users"),
      url: "/users/company",
      icon: () => <Users className="text-blue-600" />,
      roles: ["admin"],
    },

    {
      title: t("inventory"),
      icon: () => <Package className="text-yellow-600" />, // Boxes = Inventory
      roles: ["admin", "manager_wh"],
      isDropdown: true,

      subItems: [
        {
          title: t("manageInventory"),
          url: "/inventory/manageStocks/inventory",
          icon: <PackageSearch className="h-4 w-4 text-green-600" />,
          roles: ["admin", "manager_wh"],
        },
        {
          title: t("categories"),
          url: "/inventory/categories",
          icon: <FolderKanban className="h-4 w-4 text-purple-600" />,
          roles: ["admin", "manager_wh"],
        },
        {
          title: t("warehouses"),
          url: "/inventory/warehouses",
          icon: <Building2 className="h-4 w-4 text-cyan-600" />,
          roles: ["admin", "manager_wh"],
        },
      ],
    },

    {
      title: t("products"),
      url: "/products",
      icon: () => <Package className="h-4 w-4 text-emerald-600" />,
      roles: ["admin", "manager_wh"],
    },

    {
      title: t("suppliers"),
      url: "/suppliers",
      icon: () => <Handshake className="h-4 w-4 text-orange-600" />,
      roles: ["admin", "manager_wh"],
    },

    {
      title: t("expenses"),
      url: "/expenses",
      icon: () => <Receipt className="h-4 w-4 text-red-600" />,
      roles: ["admin"],
    },

    {
      title: t("customer"),
      url: "/customer",
      icon: () => <User className="h-4 w-4 text-sky-500" />,
      roles: ["admin", "cashier"],
    },
    {
      title: "البنوك",
      url: "/banks",
      icon: () => <Banknote className="h-4 w-4 text-sky-500" />,
      roles: ["admin"],
    },
    {
      title: t("cashierMain"),
      url: "/sells/salesDashboard",
      icon: () => <ShoppingCart className="text-blue-500" />,
      roles: ["cashier"],
    },

    // {
    //   title: t("debt"),
    //   url: "/debt",
    //   icon: () => <CreditCard className="h-4 w-4 text-green-600" />,
    //   roles: ["admin", "cashier"],
    // },

    {
      title: "التقرير",
      url: "/reports",
      icon: () => <BarChart3 className="h-4 w-4 text-green-600" />,
      roles: ["admin", "cashier"],
    },

    {
      title: t("chartofaccount"),
      url: "/chartOfAccount",
      icon: () => <Notebook className="text-pink-600" />,
      roles: ["admin", "supplier"],
    },

    {
      title: t("journalEntry"),
      url: "/journalEntry/journal",
      icon: () => <NotebookPen className="text-pink-600" />,
      roles: ["admin"],
    },

    {
      title: t("sales"),
      icon: () => <ShoppingBag className="text-green-600" />,
      roles: ["admin", "cashier"],
      isDropdown: true,

      subItems: [
        {
          title: t("cashierMain"),
          url: "/sells/salesDashboard",
          icon: <ShoppingCart className="text-indigo-500" />,
          roles: ["admin"],
        },
        {
          title: t("cashier"),
          url: "/sells/cashiercontrol",
          icon: <ShoppingCart className="text-blue-500" />,
          roles: ["admin"],
        },
        // {
        //   title: t("pos"),
        //   url: "/sells/pos",
        //   icon: <Store className="text-blue-500" />,
        //   roles: ["admin"],
        // },
      ],
    },

    {
      title: t("profile"),
      url: "/profile",
      icon: () => <UserCircle className="text-pink-600" />,
      roles: ["customer", "supplier"],
    },

    {
      title: t("settings"),
      url: "/settings",
      icon: () => <Settings className="text-gray-600" />,
      roles: ["admin"],
    },
  ];

  // Filter menu items based on user roles
  const visibleMenuItems = menuItems.filter((item) => {
    return hasAnyRole(item.roles);
  });

  // const visibleMenuItems = menuItems.filter((item) => {
  //   return item.roles.includes("admin"); // Hardcoded
  // });
  const { open } = useSidebar();

  const isCollapsed = !open;

  const router = useRouter();
  // const handelLogout = async () => {
  //   if (!user) return;

  //   try {
  //     await fetch("/api/log-activity", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify({
  //         userId: user.userId,
  //         action: "logout",
  //         details: "User logged out",
  //         ip: "",
  //         userAgent: navigator.userAgent,
  //       }),
  //     });

  //     await logout();
  //     router.push("/login"); // <--- redirect to login
  //   } catch (err) {
  //     console.error("Failed to log logout activity:", err);
  //   }
  // };
  const filterSubItems = (subItems: any[]) => {
    return subItems.filter((subItem) => hasAnyRole(subItem.roles));
  };
  const { company } = useCompany();
  if (!company) return;

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="dark:bg-accent dark:text-foreground text-sidebar bg-[#0b142a] py-4"
    >
      <SidebarHeader
        data-state={isCollapsed ? "collapsed" : "expanded"}
        className="flex items-center bg-[#0b142a]"
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-full transition-all duration-300",
            isCollapsed ? "h-8 w-8" : "h-16 w-16",
          )}
        >
          {company.logoUrl ? (
            <Image
              src={company.logoUrl}
              alt="Company Logo"
              fill
              sizes="100px"
              className="rounded-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center rounded-full bg-amber-400 transition-all duration-300 data-[state=collapsed]:h-8 data-[state=collapsed]:w-8 data-[state=expanded]:h-14 data-[state=expanded]:w-14">
              <Package className="text-white" />
            </div>
          )}
          {/* <div className="flex flex-col">
            <SidebarGroupLabel className="text-sm text-white">
              {company?.name ?? ""}
            </SidebarGroupLabel>
            <SidebarGroupLabel className="text-xs text-gray-300">
              {t("welcome")} {user.name}
            </SidebarGroupLabel>
          </div> */}
        </div>
      </SidebarHeader>
      <SidebarHeader className="bg-[#0b142a]">
        <SidebarGroupLabel className="dark:text-foreground text-sidebar text-xs">
          {company.name}
        </SidebarGroupLabel>
        <SidebarGroupLabel className="dark:text-foreground text-sidebar text-xs">
          {t("welcome")} {user?.name}
        </SidebarGroupLabel>
      </SidebarHeader>{" "}
      <div className="dark:bg-accent dark:text-foreground text-sidebar flex h-[calc(100vh-8rem)] flex-col justify-between bg-[#0b142a]">
        {/* Scrollable menu area */}
        {/* <ScrollArea className="h-full pr-2" dir="rtl"> */}
        <SidebarContent className="dark:bg-accent dark:text-foreground text-sidebar h-full rounded-sm bg-[#0b142a] p-1">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleMenuItems.map((item) => {
                  if (item.isDropdown && item.subItems) {
                    const visibleSubItems = filterSubItems(item.subItems);

                    if (visibleSubItems.length === 0) {
                      return null; // Don't show dropdown if no sub-items are visible
                    }

                    return (
                      <Collapsible key={item.title} asChild defaultOpen={false}>
                        <SidebarMenuItem>
                          <CollapsibleTrigger>
                            <SidebarMenuButton
                              tooltip={item.title}
                              className="text-[15px]"
                            >
                              <item.icon />
                              <span>{item.title}</span>
                              <ChevronDown className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {visibleSubItems.map((subItem) => (
                                <SidebarMenuItem
                                  key={subItem.title}
                                  className="text-[15px]"
                                >
                                  <SidebarMenuButton
                                    asChild
                                    className={`${
                                      pathname === subItem.url
                                        ? "w-40 rounded-l-lg border-r-4 border-r-orange-600 bg-orange-400 text-white"
                                        : "text-white hover:bg-orange-300/20"
                                    } !justify-start !pr-4 !pl-8`}
                                  >
                                    <Link href={subItem.url || "/"}>
                                      {subItem.icon}
                                      <span>{subItem.title}</span>
                                    </Link>
                                  </SidebarMenuButton>

                                  {/* <SidebarMenuButton
                                    asChild
                                    className={` ${
                                      pathname === subItem.url
                                        ? "w-40 rounded-l-lg border-r-4 border-r-orange-600 bg-orange-400 text-white"
                                        : "text-white hover:bg-orange-300/20"
                                    } !justify-start !pr-4 !pl-8`}
                                  >
                                    <Link href={subItem.url || "#"} dir="rtl">
                              
                                    
                                    </Link>
                                  </SidebarMenuButton> */}
                                </SidebarMenuItem>

                                // <SidebarMenuSubItem key={subItem.title}>
                                //   <SidebarMenuButton asChild isActive>
                                //     <Link href={subItem.url}>
                                //       {subItem.icon}
                                //       <span>{subItem.title}</span>
                                //     </Link>
                                //   </SidebarMenuButton>
                                // </SidebarMenuSubItem>
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title} className="text-[20px]">
                      <Link href={item.url ?? ""} className="block">
                        <SidebarMenuButton
                          className={`${
                            pathname === item.url
                              ? "w-52 rounded-l-lg border-r-4 border-r-orange-600 bg-orange-400 text-white"
                              : "text-white hover:bg-orange-300/20"
                          }`}
                        >
                          <>
                            <item.icon />
                            <span>{item.title}</span>
                          </>
                        </SidebarMenuButton>
                      </Link>
                    </SidebarMenuItem>

                    // <SidebarMenuItem key={item.title}>
                    //   <SidebarMenuButton asChild isActive>
                    //     <Link href={item.url || "#"}>
                    //       <item.icon />
                    //       <span>{item.title}</span>
                    //     </Link>
                    //   </SidebarMenuButton>
                    // </SidebarMenuItem>
                  );
                })}{" "}
              </SidebarMenu>
            </SidebarGroupContent>
            <SidebarGroupContent>
              <SidebarMenu className="flex gap-3">
                {/* Logout */}
                {/* Language */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="hover:bg-orange-300/20">
                    <LocaleSwitcher />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {/* Currency */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="hover:bg-orange-300/20">
                    <CurrencySwitcher />
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {/* Theme */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="hover:bg-orange-300/20">
                    <ModeToggle />
                  </SidebarMenuButton>
                </SidebarMenuItem>{" "}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    tooltip={t("logout")}
                    onClick={() => logoutAndRedirect()}
                    className="text-red-600 hover:bg-orange-300/20 hover:text-red-700"
                  >
                    <LogOut className="h-5 w-5" />
                    {t("logout")}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        {/* </ScrollArea> */}
      </div>
    </Sidebar>
  );
}
