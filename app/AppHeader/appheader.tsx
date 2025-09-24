import { Button } from "@/components/ui/button";
import { ModeToggle } from "../../components/toggoletheme";
import { Input } from "../../components/ui/input";
import { SidebarTrigger } from "../../components/ui/sidebar";
import React from "react";
import { AiFillProduct } from "react-icons/ai";
import { Separator } from "@/components/ui/separator";
export default function Appheader() {
  return (
    <div
      className="dark:bg-accent dark:text-foreground text-sidebar flex h-15 shrink-0 items-center gap-2 border-b bg-gray-800 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
      dir="rtl"
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Documents</h1>
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
    </div>
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
