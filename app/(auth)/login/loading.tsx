import React from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import {
  Package,
  ShoppingCart,
  BarChart3,
  Wallet,
  PackageSearch,
  Receipt,
  Users,
  Building2,
} from "lucide-react";

const LoginSkeleton = () => {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0f1d]"
      dir="rtl"
    >
      {/* --- Background Icons (Static, low opacity) --- */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.02]">
        <Package className="absolute top-10 left-10 h-32 w-32 rotate-12" />
        <ShoppingCart className="absolute right-20 bottom-20 h-40 w-40 -rotate-12" />
        <BarChart3 className="absolute top-1/4 right-1/4 h-24 w-24 rotate-45" />
        <Wallet className="absolute bottom-1/4 left-1/4 h-28 w-28 -rotate-6" />
        <PackageSearch className="absolute top-1/2 left-10 h-20 w-20" />
        <Receipt className="absolute bottom-10 left-1/2 h-24 w-24 rotate-12" />
        <Users className="absolute top-20 left-1/3 h-16 w-16" />
        <Building2 className="absolute right-10 bottom-1/3 h-32 w-32" />
      </div>

      {/* --- Skeleton Card --- */}
      <Card className="z-10 w-full max-w-md border-gray-800 bg-[#111827]/80 backdrop-blur-md">
        <CardHeader className="space-y-4 text-center">
          {/* Logo Circle Skeleton */}
          <div className="mb-2 flex justify-center">
            <div className="h-24 w-24 animate-pulse rounded-full bg-gray-800 ring-4 ring-gray-800/20" />
          </div>
          {/* Title and Description Skeletons */}
          <div className="mx-auto h-8 w-3/4 animate-pulse rounded-md bg-gray-800" />
          <div className="mx-auto h-4 w-1/2 animate-pulse rounded-md bg-gray-800/50" />
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Email Input Skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-800" />
            <div className="h-10 w-full animate-pulse rounded-lg border border-gray-800 bg-gray-900/50" />
          </div>

          {/* Password Input Skeleton */}
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-800" />
            <div className="h-10 w-full animate-pulse rounded-lg border border-gray-800 bg-gray-900/50" />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4 pt-4">
          {/* Login Button Skeleton */}
          <div className="h-12 w-full animate-pulse rounded-lg bg-blue-900/30" />

          {/* Links Skeleton */}
          <div className="mx-auto h-4 w-40 animate-pulse rounded bg-gray-800/50" />

          {/* Divider Skeleton */}
          <div className="relative w-full py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="h-4 w-10 animate-pulse rounded bg-[#111827] px-4" />
            </div>
          </div>

          {/* Google Button Skeleton */}
          <div className="h-11 w-full animate-pulse rounded-lg border border-gray-800 bg-transparent" />
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginSkeleton;
