// ClientDashboardContent.tsx
"use client";

import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import dynamic from "next/dynamic";
import { Suspense } from "react";
const DashboardContent = dynamic(() => import("./DashboardContent"), {
  ssr: false, // ensures it only loads on the client
  loading: () => <DashboardSkeleton />, // optional fallback
});
// const DashboardContent = dynamic(
//   () => import("./_components/DashboardContent"),
//   {
//     ssr: false,
//     loading: () => <p>Loading dashboard...</p>,
//   },
// );

export default function ClientDashboardContent({ result }: any) {
  return (
    <Suspense>
      <DashboardContent result={result} />
    </Suspense>
  );
}
