// components/appside-bar.tsx (Updated with Role-Based Access)
"use client";

import { useCompany } from "@/hooks/useCompany"; // adjust if different path
import {
  Banknote,
  BarChart3,
  Building2,
  ChevronDown,
  FolderKanban,
  Handshake,
  Home,
  LogOut,
  Loader2,
  Notebook,
  NotebookPen,
  Package,
  PackageSearch,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  User,
  Users,
  Wallet,
  Building,
  InfoIcon,
  BriefcaseBusiness,
  Users2,
  User2,
  UserLock,
  Shield,
  UserCog,
  Activity,
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

import { cn } from "@/lib/utils";
import CurrencySwitcher from "./common/CurrencySwitcher";
import Logout from "./logout";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout, hasAnyRole, logoutAndRedirect, loggingOut } = useAuth();
  const pathname = usePathname();
  const t = useTranslations("menu");

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
      title: "لوحة المخزن",
      url: "/dashboardUser",
      icon: () => <Home className="text-indigo-600" />,
      roles: ["manager_wh"],
    },
    {
      title: t("manageInventory"),
      url: "/inventory",
      icon: () => <PackageSearch className="h-4 w-4 text-green-600" />,
      roles: ["manager_wh"],
    },
    {
      title: t("categories"),
      url: "/categories",
      icon: () => <FolderKanban className="h-4 w-4 text-purple-600" />,
      roles: ["manager_wh"],
    },
    {
      title: t("warehouses"),
      url: "/warehouses",
      icon: () => <Building2 className="h-4 w-4 text-cyan-600" />,
      roles: ["manager_wh"],
    },
    {
      title: t("products"),
      url: "/products",
      icon: () => <Package className="h-4 w-4 text-emerald-600" />,
      roles: ["manager_wh"],
    },
    {
      title: t("suppliers"),
      url: "/suppliers",
      icon: () => <Handshake className="h-4 w-4 text-orange-600" />,
      roles: ["manager_wh"],
    },

    {
      title: t("companyinfo"),
      icon: () => <BriefcaseBusiness className="text-shadow-rose-500" />, // Boxes = Inventory
      roles: ["admin"],
      isDropdown: true,

      subItems: [
        {
          title: t("company"),
          url: "/company",
          icon: <Building className="text-blue-600" />,
          roles: ["admin"],
        },

        {
          title: "الأدوار",
          url: "/userroles",
          icon: <UserCog className="text-blue-600" />,
          roles: ["admin"],
        },
        {
          title: t("branches"),
          url: "/branches",
          icon: <Building2 className="text-blue-600" />,
          roles: ["admin"],
        },
      ],
    },

    {
      title: t("inventory"),
      icon: () => <Package className="text-yellow-600" />, // Boxes = Inventory
      roles: ["admin"],
      isDropdown: true,

      subItems: [
        {
          title: "لوحة المخزن",
          url: "/dashboardUser",
          icon: <Home className="text-indigo-600" />,
          roles: ["admin"],
        },
        {
          title: t("manageInventory"),
          url: "/inventory",
          icon: <PackageSearch className="h-4 w-4 text-green-600" />,
          roles: ["admin"],
        },
        {
          title: t("categories"),
          url: "/categories",
          icon: <FolderKanban className="h-4 w-4 text-purple-600" />,
          roles: ["admin"],
        },
        {
          title: t("warehouses"),
          url: "/warehouses",
          icon: <Building2 className="h-4 w-4 text-cyan-600" />,
          roles: ["admin"],
        },
        {
          title: t("products"),
          url: "/products",
          icon: <Package className="h-4 w-4 text-emerald-600" />,
          roles: ["admin"],
        },
        {
          title: t("suppliers"),
          url: "/suppliers",
          icon: <Handshake className="h-4 w-4 text-orange-600" />,
          roles: ["admin"],
        },
      ],
    },
    {
      title: "المستخدمين",
      icon: () => <Users2 className="text-shadow-rose-500" />, // Boxes = Inventory
      roles: ["admin"],
      isDropdown: true,

      subItems: [
        {
          title: t("users"),
          url: "/user",
          icon: <Users className="text-blue-600" />,
          roles: ["admin"],
        },
        {
          title: t("customer"),
          url: "/customer",
          icon: <User className="h-4 w-4 text-sky-500" />,
          roles: ["admin"],
        },

        {
          title: "الموظفون",
          url: "/employee",
          icon: <User className="text-blue-600" />,
          roles: ["admin"],
        },
        {
          title: "أنشطة المستخدم",
          url: "/userActiviteslogs",
          icon: <Activity className="text-blue-600" />,
          roles: ["admin"],
        },
      ],
    },
    {
      title: t("customer"),
      url: "/customer",
      icon: () => <User className="h-4 w-4 text-sky-500" />,
      roles: ["cashier"],
    },
    {
      title: "الرئيسية",
      url: "/customer-portal",
      icon: () => <Home className="text-indigo-600" />,
      roles: ["customer"],
    },
    {
      title: "الفواتير",
      url: "/customer-portal/receipts",
      icon: () => <Receipt className="h-4 w-4 text-amber-600" />,
      roles: ["customer"],
    },
    {
      title: "السندات",
      url: "/customer-portal/vouchers",
      icon: () => <Wallet className="h-4 w-4 text-blue-600" />,
      roles: ["customer"],
    },
    {
      title: "كشف الحساب",
      url: "/customer-portal/statement",
      icon: () => <Notebook className="h-4 w-4 text-pink-600" />,
      roles: ["customer"],
    },
    {
      title: "التقارير",
      url: "/customer-portal/reports",
      icon: () => <BarChart3 className="h-4 w-4 text-green-600" />,
      roles: ["customer"],
    },

    {
      title: t("financials"), // or t("accounting")
      icon: () => <Wallet className="text-blue-600" />, // Wallet or Landmark icon fits well here
      roles: ["admin"],
      isDropdown: true,
      subItems: [
        {
          title: t("banks"), // Used t("banks") for consistency, or "البنوك"
          url: "/banks",
          icon: <Banknote className="h-4 w-4 text-sky-500" />,
          roles: ["admin"],
        },
        {
          title: t("expenses"),
          url: "/expenses",
          icon: <Receipt className="h-4 w-4 text-red-600" />,
          roles: ["admin"],
        },
        {
          title: t("generalLedger"),
          url: "/journal",
          icon: <NotebookPen className="h-4 w-4 text-pink-600" />,
          roles: ["admin"],
        },
        {
          title: t("vouchers"),
          url: "/voucher",
          icon: <Receipt className="h-4 w-4 text-amber-600" />,
          roles: ["admin"],
        },
      ],
    },
    {
      title: t("vouchers"),
      url: "/voucher",
      icon: () => <Receipt className="h-4 w-4 text-amber-600" />,
      roles: ["accountant"],
    },
    {
      title: t("cashierMain"),
      url: "/salesDashboard",
      icon: () => <ShoppingCart className="text-blue-500" />,
      roles: ["cashier"],
    },
    {
      title: t("cashier"),
      url: "/cashiercontrol",
      icon: () => <ShoppingCart className="text-fuchsia-600" />,
      roles: ["cashier"],
    },

    {
      title: "التقرير",
      url: "/reports",
      icon: () => <BarChart3 className="h-4 w-4 text-green-600" />,
      roles: ["admin", "cashier", "manager_wh", "accountant", "supplier"],
    },

    {
      title: t("chartOfAccount"),
      url: "/chartOfAccount",
      icon: () => <Notebook className="text-pink-600" />,
      roles: ["admin", "supplier", "accountant"],
    },

    {
      title: t("sales"),
      icon: () => <ShoppingBag className="text-green-600" />,
      roles: ["admin"],
      isDropdown: true,

      subItems: [
        {
          title: t("cashierMain"),
          url: "/salesDashboard",
          icon: <ShoppingCart className="text-indigo-500" />,
          roles: ["admin"],
        },
        {
          title: t("cashier"),
          url: "/cashiercontrol",
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
      title: t("expenses"),
      url: "/expenses",
      icon: () => <Receipt className="h-4 w-4 text-red-600" />,
      roles: ["accountant"],
    },
    {
      title: t("generalLedger"),
      url: "/journal",
      icon: () => <NotebookPen className="h-4 w-4 text-pink-600" />,
      roles: ["accountant"],
    },

    // {
    //   title: t("profile"),
    //   url: "/profile",
    //   icon: () => <UserCircle className="text-pink-600" />,
    //   roles: ["customer", "supplier"],
    // },

    {
      title: t("settings"),
      icon: () => <Settings className="text-gray-600" />,
      roles: ["admin"],
      isDropdown: true,
      subItems: [
        {
          title: "أسعار الصرف",
          url: "/settings",
          icon: <Settings className="h-4 w-4 text-gray-600" />,
          roles: ["admin"],
        },
        {
          title: "العملات",
          url: "/settings/currencies",
          icon: <Settings className="h-4 w-4 text-gray-600" />,
          roles: ["admin"],
        },
        {
          title: "الاشتراك",
          url: "/settings/subscription",
          icon: <Settings className="h-4 w-4 text-gray-600" />,
          roles: ["admin"],
        },
      ],
    },
  ];

  // Filter menu items based on user roles
  const visibleMenuItems = menuItems
    .filter((item) => hasAnyRole(item.roles)) // Filter parent items
    .map((item) => {
      // If it has sub-items, filter them too
      if (item.subItems) {
        return {
          ...item,
          subItems: item.subItems.filter((sub) => hasAnyRole(sub.roles)),
        };
      }
      return item;
    })
    // Final check: if a dropdown has 0 visible sub-items, hide the parent too
    .filter(
      (item) => !item.isDropdown || (item.subItems && item.subItems.length > 0),
    );
  // const visibleMenuItems = menuItems.filter((item) => {
  //   return item.roles.includes("admin"); // Hardcoded
  // });
  const { open } = useSidebar();

  const isCollapsed = !open;

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
  if (!company) {
    return null;
  }

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="bg-background text-foreground py-4"
    >
      <SidebarHeader
        data-state={isCollapsed ? "collapsed" : "expanded"}
        className="flex items-center"
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
              priority={true}
              sizes="100px"
              className="rounded-full object-cover"
              unoptimized={true}
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
      <SidebarHeader className="">
        <SidebarGroupLabel className="text-foreground text-xs">
          {company.name}
        </SidebarGroupLabel>
        <SidebarGroupLabel className="text-foreground text-xs">
          {t("welcome")} {user?.name}
        </SidebarGroupLabel>
      </SidebarHeader>{" "}
      <div className="text-foreground flex h-[calc(100vh-8rem)] flex-col justify-between">
        {/* Scrollable menu area */}
        {/* <ScrollArea className="h-full pr-2" dir="rtl"> */}
        <SidebarContent className="text-foreground h-full rounded-sm p-1">
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
                                        : "text-foreground hover:bg-orange-300/20"
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
                      <SidebarMenuButton
                        asChild
                        className={`${
                          pathname === item.url
                            ? "w-52 rounded-l-lg border-r-4 border-r-orange-600 bg-orange-400 text-white"
                            : "text-foreground hover:bg-orange-300/20"
                        }`}
                      >
                        <Link href={item.url ?? "/"}>
                          <item.icon />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
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
                {/* <SidebarMenuItem>
                  <SidebarMenuButton asChild className="hover:bg-orange-300/20">
                    <CurrencySwitcher />
                  </SidebarMenuButton>
                </SidebarMenuItem> */}
                {/* Theme */}
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="hover:bg-orange-300/20">
                    <ModeToggle />
                  </SidebarMenuButton>
                </SidebarMenuItem>{" "}
                <SidebarMenuItem>
                  <Logout />
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
