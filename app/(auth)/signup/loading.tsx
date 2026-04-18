import React from "react";
import { Card } from "@/components/ui/card";
import {
  Building2,
  Package,
  ShoppingCart,
  BarChart3,
  Wallet,
  Banknote,
  FolderKanban,
  Settings,
  ShoppingBag,
  NotebookPen,
  Boxes,
  User,
  Mail,
  Lock,
  Phone,
} from "lucide-react";

const SignupSkeleton = () => {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#0a0f1d] p-4 text-white md:p-8"
      dir="rtl"
    >
      {/* --- Background Icons (Low Opacity) --- */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.02]">
        <Package className="absolute top-10 left-10 h-32 w-32 rotate-12" />
        <ShoppingCart className="absolute right-20 bottom-20 h-40 w-40 -rotate-12" />
        <BarChart3 className="absolute top-1/4 right-[5%] h-24 w-24 rotate-45" />
        <Wallet className="absolute bottom-1/4 left-[5%] h-28 w-28 -rotate-6" />
        <Banknote className="absolute top-1/2 right-10 h-20 w-20" />
        <FolderKanban className="absolute top-20 right-1/3 h-24 w-24" />
        <Settings className="absolute bottom-10 left-1/3 h-16 w-16 rotate-90" />
        <ShoppingBag className="absolute top-1/3 left-1/4 h-32 w-32" />
        <NotebookPen className="absolute right-1/4 bottom-[10%] h-20 w-20" />
        <Boxes className="absolute top-10 right-1/4 h-16 w-16" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Header Section Skeleton */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-20 w-20 animate-pulse rounded-2xl bg-gray-800" />
          <div className="mx-auto h-10 w-64 animate-pulse rounded-lg bg-gray-800" />
          <div className="mx-auto mt-3 h-4 w-48 animate-pulse rounded bg-gray-800/50" />
        </div>

        {/* Pricing Plan Skeleton */}
        <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900/20 p-4">
          <div className="mx-auto mb-3 h-4 w-32 animate-pulse rounded bg-gray-800/50" />
          <div className="grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-gray-800 bg-gray-800/20"
              />
            ))}
          </div>
        </div>

        {/* Main Form Card Skeleton */}
        <div className="rounded-3xl border border-gray-800 bg-[#111827]/80 p-6 backdrop-blur-xl md:p-10">
          <div className="space-y-10">
            {/* Section 1: Company Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                <div className="h-5 w-5 animate-pulse rounded bg-blue-900/40" />
                <div className="h-6 w-32 animate-pulse rounded bg-gray-800" />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-800" />
                    <div className="h-11 w-full animate-pulse rounded-lg border border-gray-800 bg-gray-900/50" />
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Admin Info */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
                <div className="h-5 w-5 animate-pulse rounded bg-indigo-900/40" />
                <div className="h-6 w-40 animate-pulse rounded bg-gray-800" />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded bg-gray-800" />
                    <div className="h-11 w-full animate-pulse rounded-lg border border-gray-800 bg-gray-900/50" />
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button Skeleton */}
            <div className="pt-4">
              <div className="h-14 w-full animate-pulse rounded-2xl bg-blue-900/30" />
              <div className="mx-auto mt-6 h-4 w-40 animate-pulse rounded bg-gray-800/50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupSkeleton;
