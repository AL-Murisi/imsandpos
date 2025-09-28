"use client";

import { Button } from "@/components/ui/button";

import CardSelector from "./cardslex";
import NotificationBell from "../NotificationBell";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
const DateRangeFilter = dynamic(
  () => import("./testting").then((mod) => mod.DateRangeFilter),
  {
    ssr: false, // Don't render on the server
    loading: () => <input type="date" />, // Fallback while loading
  },
);

export default function DashboardHeader({
  sections,
  chartConfigs,
}: {
  // card: string;
  sections: any;
  chartConfigs: any;
}) {
  const searchParams = useSearchParams();
  const card = searchParams.get("card") || "all";
  return (
    <div className="top-0 z-10 flex justify-between rounded-2xl py-4" dir="rtl">
      {/* Left side: Logo */}

      {/* Middle (optional search) */}
      <div className="flex-1 justify-center px-4 md:flex">
        <div className="mb-4 flex-1/2 items-center gap-6 md:flex md:gap-4">
          <DateRangeFilter fromKey={`${card}From`} toKey={`${card}To`} />

          <CardSelector sections={sections} chartConfigs={chartConfigs} />
        </div>
      </div>

      {/* Right side: Profile + Notifications */}
      <div className="flex items-center space-x-4" dir="ltr">
        <Button variant="ghost" size="icon">
          <NotificationBell />
        </Button>

        {/* <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="cursor-pointer">
              <AvatarImage src="" alt="User" />
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> */}
      </div>
    </div>
  );
}
