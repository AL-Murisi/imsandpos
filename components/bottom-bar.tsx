"use client";

import Link from "next/link";
import {
  ShoppingCart,
  User,
  Menu,
  Package,
  BarChart3,
  Receipt,
  NotebookPen,
  Notebook,
  User2,
  Home,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/lib/context/AuthContext";

export function BottomBar() {
  const { toggleSidebar } = useSidebar();
  const { hasAnyRole } = useAuth();
  const canAccess = (allowed: string[]) => hasAnyRole(allowed);

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 border-t bg-[#0b142a] px-4 py-2 text-white">
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center text-xs"
        >
          <Menu size={22} />
          <span>القائمة</span>
        </button>{" "}
        {canAccess(["admin", "cashier"]) && (
          <Link
            href="/salesDashboard"
            className="flex flex-col items-center text-xs"
          >
            <Home size={22} />
            <span>المبيعات</span>
          </Link>
        )}{" "}
        {canAccess([
          "admin",
          "cashier",
          "manager_wh",
          "accountant",
          "supplier",
        ]) && (
          <Link href="/reports" className="flex flex-col items-center text-xs">
            <BarChart3 size={22} />
            <span>التقرير</span>
          </Link>
        )}
        {canAccess(["accountant"]) && (
          <Link href="/voucher" className="flex flex-col items-center text-xs">
            <NotebookPen size={22} />
            <span>السندات</span>
          </Link>
        )}{" "}
        {canAccess(["accountant"]) && (
          <Link href="/expenses" className="flex flex-col items-center text-xs">
            <Receipt size={22} />
            <span>المصاريف</span>
          </Link>
        )}{" "}
        {canAccess(["accountant"]) && (
          <Link
            href="/chartOfAccount"
            className="flex flex-col items-center text-xs"
          >
            <Notebook size={22} />
            <span>الحسابات</span>
          </Link>
        )}
        {canAccess(["cashier"]) && (
          <Link
            href="/cashiercontrol"
            className="flex flex-col items-center text-xs"
          >
            <ShoppingCart size={22} />
            <span>كاشير</span>
          </Link>
        )}
        {canAccess(["cashier"]) && (
          <Link href="/customer" className="flex flex-col items-center text-xs">
            <User2 size={22} />
            <span>العملاء</span>
          </Link>
        )}
        {canAccess(["admin", "manager_wh"]) && (
          <Link
            href="/inventory"
            className="flex flex-col items-center text-xs"
          >
            <Package size={22} />
            <span> المخازن</span>
          </Link>
        )}
        {canAccess(["admin"]) && (
          <Link href="/company" className="flex flex-col items-center text-xs">
            <User size={22} />
            <span>حسابي</span>
          </Link>
        )}
      </div>
    </div>
  );
}
