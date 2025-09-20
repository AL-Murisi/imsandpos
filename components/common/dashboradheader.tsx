"use client";

import { Bell, LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DateRangeFilter } from "./testting";
import CardSelector from "./cardslex";
import NotificationBell from "../NotificationBell";
import { useSearchParams } from "next/navigation";

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
    <div className="top-0 z-10 flex items-center justify-between rounded-2xl py-4">
      {/* Left side: Logo */}
      <div className="flex items-center space-x-2">
        {/* <img
          src="/icons/ims.png" // replace with your logo path
          alt="Company Logo"
          className="h-8 w-auto"
        /> */}
        <span className="text-xl font-bold">MyCompany</span>
      </div>

      {/* Middle (optional search) */}
      <div className="hidden flex-1 justify-center px-4 md:flex">
        <div className="mb-4 flex items-center gap-4">
          <DateRangeFilter fromKey={`${card}From`} toKey={`${card}To`} />

          <CardSelector sections={sections} chartConfigs={chartConfigs} />
        </div>
      </div>

      {/* Right side: Profile + Notifications */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <NotificationBell />
        </Button>

        <DropdownMenu>
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
        </DropdownMenu>
      </div>
    </div>
  );
}
