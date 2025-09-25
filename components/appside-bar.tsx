// components/appside-bar.tsx (Updated with Role-Based Access)
"use client";

import {
  Building2,
  Calendar,
  ChevronDown,
  FolderKanban,
  Home,
  Package,
  Search,
  Settings,
  Users,
  ShoppingCart,
  User,
  Truck,
  LogOut,
  Warehouse,
  Clock,
  Receipt,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarFooter,
} from "./ui/sidebar";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { useAuth } from "@/lib/context/AuthContext";
import { ModeToggle } from "./toggoletheme";
import { logActivity } from "@/app/actions/activitylogs";
import { usePathname } from "next/navigation";
import { LanguageSelector } from "./common/lanSelect";

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

// Define menu items with role requirements
const menuItems = [
  {
    title: "الرئيسية", // Home
    url: "/dashboard",
    icon: () => <Home className="text-indigo-600" />,
    roles: ["admin"],
  },
  {
    title: "الرئيسية", // Home
    url: "/inventory/dashboardUser",
    icon: () => <Home className="text-indigo-600" />,
    roles: ["manager_wh"],
  },
  {
    title: "المستخدمون", // Users
    url: "/users",
    icon: () => <Users className="text-red-600" />,
    roles: ["admin"], // Only admin can see users
  },
  {
    title: "اداره المخازن", // Inventory
    icon: () => <IMSLogoIcon className="text-blue-600" />,
    roles: ["admin", "manager_wh"],
    isDropdown: true,
    subItems: [
      {
        title: "إدارة المخزون", // Products
        url: "/inventory/manageinvetory",
        icon: <Warehouse className="h-4 w-4 text-green-600" />,
        roles: ["admin", "manager_wh"],
      },

      {
        title: "الفئات", // Categories
        url: "/inventory/categories",
        icon: <FolderKanban className="h-4 w-4 text-purple-600" />,
        roles: ["admin", "manager_wh"],
      },
      {
        title: "الموردون", // Suppliers
        url: "/inventory/suppliers",
        icon: <Users className="h-4 w-4 text-orange-600" />,
        roles: ["admin", "manager_wh"],
      },
      {
        title: "المستودعات", // Warehouses
        url: "/inventory/warehouses",
        icon: <Building2 className="h-4 w-4 text-cyan-600" />,
        roles: ["admin", "manager_wh"],
      },
    ],
  },
  {
    title: "المنتجات", // Products
    url: "/inventory/products",
    icon: () => <Package className="h-4 w-4 text-green-600" />,
    roles: ["admin", "manager_wh"],
  },
  {
    title: "المبيعات", // Sales
    // url: "/sells/cashiercontrol",
    icon: () => <ShoppingCart className="text-green-600" />,
    roles: ["admin", "cashier"],
    isDropdown: true,
    subItems: [
      {
        title: " الرئيسية الكاشير", //المبيعات", // Sells
        url: "/sells",
        icon: <ShoppingCart className="text-blue-500" />,
        roles: ["admin", "cashier"],
      },
      {
        title: "الكاشير", //المبيعات", // Sells
        url: "/sells/cashiercontrol",
        icon: <ShoppingCart className="text-blue-500" />,
        roles: ["admin", "cashier"],
      },
      {
        title: " المحجوزة", // Reserved Orders
        url: "/sells/reservation",
        icon: <Clock className="h-4 w-4 text-teal-600" />,
        roles: ["admin", "cashier"],
      },
      {
        title: "الدين", // Due / Credit Sales
        url: "/sells/debtSell",
        icon: <Receipt className="text-orange-500" size={50} />,
        roles: ["admin", "cashier"],
      },
    ],
  },

  // {
  //   title: "طلبات العملاء", // Customer Orders
  //   url: "/customer/orders",
  //   icon: () => <Package className="text-purple-600" />,
  //   roles: ["customer", "admin"],
  // },
  // {
  //   title: "منتجات المورد", // Supplier Products
  //   url: "/supplier/products",
  //   icon: () => <Truck className="text-orange-600" />,
  //   roles: ["supplier", "admin"],
  // },
  // {
  //   title: "طلبات المورد", // Supplier Orders
  //   url: "/supplier/orders",
  //   icon: () => <Calendar className="text-cyan-600" />,
  //   roles: ["supplier", "admin"],
  // },
  {
    title: "الملف الشخصي", // Profile
    url: "/profile",
    icon: () => <User className="text-pink-600" />,
    roles: ["customer", "supplier"],
  },
  // {
  //   title: "بحث", // Search
  //   url: "/search",
  //   icon: () => <Search className="text-yellow-500" />,
  //   roles: ["admin", "worker", "customer"],
  // },
  {
    title: "الإعدادات", // Settings
    url: "/settings",
    icon: () => <Settings className="w-40 text-gray-600" />,
    roles: ["admin"],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, hasAnyRole, logout } = useAuth();
  const pathname = usePathname();

  // If no user, don't render sidebar
  if (!user) {
    return null;
  }

  // Filter menu items based on user roles
  const visibleMenuItems = menuItems.filter((item) => {
    return hasAnyRole(item.roles);
  });
  // const visibleMenuItems = menuItems.filter((item) => {
  //   return item.roles.includes("admin"); // Hardcoded
  // });
  const handelLogout = async () => {
    await logActivity(user.userId, "logout", "user out");
  };
  const filterSubItems = (subItems: any[]) => {
    return subItems.filter((subItem) => hasAnyRole(subItem.roles));
  };

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="dark:bg-accent dark:text-foreground text-sidebar bg-gray-800"
    >
      <SidebarContent className="dark:bg-accent dark:text-foreground text-sidebar bg-gray-800">
        <SidebarGroup>
          <div className="flex items-center gap-2 transition-all">
            <div
              className={
                "flex aspect-square size-8 items-center justify-center rounded-lg bg-amber-400"
              }
            >
              <Package className="text-2xl" />
            </div>

            <div className="flex items-center gap-1 text-left text-sm leading-tight">
              <span className="text-sidebar truncate text-[15px] font-semibold dark:text-amber-50">
                Stockly
              </span>
            </div>
          </div>
          <SidebarGroupLabel className="dark:text-foreground text-sidebar text-xs">
            مرحباً {user.name}
          </SidebarGroupLabel>
          <SidebarGroupLabel className="dark:text-foreground text-sidebar mb-2 text-xs">
            الأدوار: {user.roles.join(", ")}
          </SidebarGroupLabel>
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
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.title}
                            className="text-[18px]"
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
                                  className={` ${
                                    pathname === subItem.url
                                      ? "w-40 rounded-l-lg border-r-4 border-r-orange-600 bg-orange-400 text-white"
                                      : "text-white hover:bg-orange-300/20"
                                  } !justify-start !pr-4 !pl-8`}
                                >
                                  <Link href={subItem.url || "#"}>
                                    {subItem.icon}
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuButton>
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
                      className={` ${
                        pathname === item.url
                          ? "w-52 rounded-l-lg border-r-4 border-r-orange-600 bg-orange-400 text-white"
                          : "text-white hover:bg-orange-300/20"
                      } !justify-start !pr-4 !pl-8 text-[18px]`}
                    >
                      <Link href={item.url || "#"}>
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
              })}
            </SidebarMenu>
          </SidebarGroupContent>
          <LanguageSelector />
        </SidebarGroup>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => {
                  (logout(), handelLogout());
                }}
                className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950"
              >
                <LogOut />
                <span>تسجيل الخروج</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <ModeToggle />
        </SidebarFooter>
      </SidebarContent>

      {/* Sidebar Footer with Logout */}
    </Sidebar>
  );
}
