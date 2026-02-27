import React from "react";
import { Building2, FolderKanban, Package, Users } from "lucide-react";
import { CollapsibleContent } from "./ui/collapsible";
import {
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
} from "./ui/sidebar";
import Link from "next/link";
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
export default function Invonterynav() {
  const items = [
    {
      title: " المخزون",
      url: "/inventory",
      icon: <FolderKanban className="h-4 w-4 text-orange-500" />,
    },
    {
      title: "المنتجات",
      url: "/products",
      icon: <Package className="h-4 w-4 text-teal-600" />,
    },
    {
      title: "الفئات",
      url: "/categories",
      icon: <FolderKanban className="h-4 w-4 text-orange-500" />,
    },

    {
      title: "الموردون",
      url: "/suppliers",
      icon: <Users className="h-4 w-4 text-purple-500" />,
    },
    {
      title: "المخازن",
      url: "/warehouses",
      icon: <Building2 className="h-4 w-4 text-pink-500" />,
    },
  ];

  return (
    <SidebarGroupContent>
      <SidebarGroupLabel className="dark:text-foreground text-background text-[15px] font-bold">
        المخزون
      </SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild>
              {/* Replaced Next.js Link with standard <a> tag */}
              <Link href={item.url}>
                {item.icon}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroupContent>
  );
}
