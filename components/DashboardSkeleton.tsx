import Link from "next/link";
import DashboardHeader from "./common/dashboradheader";
import { ExportDashboardButtonAPI } from "./ExportDashboardButton";
import { Button } from "./ui/button";

export function DashboardSkeleton() {
  return (
    <div className="">
      <div className="grid grid-cols-1 gap-4 px-2 py-2 sm:grid-cols-2 xl:grid-cols-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg bg-gray-200"
            />
          ))}
      </div>
      <div className="grid w-80 grid-cols-2 gap-4 py-4 sm:w-sm md:w-md md:grid-cols-4 lg:w-full">
        <ExportDashboardButtonAPI role={"admin"} filters={{}} />
        <Button asChild>
          <Link href="/company" prefetch={false}>
            إدارة المستخدمين
          </Link>
        </Button>
        <Button asChild>
          <Link href="/inventory" prefetch={false}>
            إدارة المخزون
          </Link>
        </Button>
        <Button asChild>
          <Link href="/customer" prefetch={false}>
            عرض الديون
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="col-span-2 h-[50vh] animate-pulse rounded-lg bg-gray-200" />
          <div className="col-span-1 h-[50vh] animate-pulse rounded-lg bg-gray-200" />
        </div>
        <div className="flex flex-col gap-6 lg:col-span-1">
          <div className="h-[50vh] animate-pulse rounded-lg bg-gray-200" />
          <div className="h-[50vh] animate-pulse rounded-lg bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
