"use client";

import Link from "next/link";
import {
  Home,
  ShoppingCart,
  User,
  Menu,
  Package,
  BarChart3,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

export function BottomBar() {
  const { toggleSidebar } = useSidebar();

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 border-t bg-[#0b142a] px-4 py-2 text-white">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/reports" className="flex flex-col items-center text-xs">
          <BarChart3 size={22} />
          <span>التقرير</span>
        </Link>

        <Link
          href="/sells/salesDashboard"
          className="flex flex-col items-center text-xs"
        >
          <ShoppingCart size={22} />
          <span>المبيعات</span>
        </Link>

        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center text-xs"
        >
          <Menu size={22} />
          <span>القائمة</span>
        </button>

        <Link
          href="/inventory/manageStocks"
          className="flex flex-col items-center text-xs"
        >
          <Package size={22} />
          <span> المخازن</span>
        </Link>
        <Link
          href="/users/company"
          className="flex flex-col items-center text-xs"
        >
          <User size={22} />
          <span>حسابي</span>
        </Link>
      </div>
    </div>
  );
}
