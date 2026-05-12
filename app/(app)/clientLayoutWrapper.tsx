"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { useCompany } from "@/hooks/useCompany";
import { usePathname } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import dynamic from "next/dynamic";
import { Provider } from "react-redux";
import { store } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Appheader from "@/app/AppHeader/appheader";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useFirebaseForegroundNotifications } from "@/hooks/useFirebaseForegroundNotifications";
import { AppSidebar } from "@/components/appside-bar";
import PullToRefreshCurrentPage from "@/components/refresh";
import { useEffect, useState } from "react";

const BottomBar = dynamic(
  () => import("@/components/bottom-bar").then((m) => m.BottomBar),
  { ssr: false },
);

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, loggingOut } = useAuth();
  useOfflineSync();
  useFirebaseForegroundNotifications();

  useEffect(() => {
    const loader = document.getElementById("initial-loader");
    if (loader) {
      loader.style.display = "none";
    }
  }, []);

  // Auth loading still handled after mount
  // if (loading || loggingOut) {
  //   return <IMSLoader />;
  // }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "17rem",
          "--sidebar-width-mobile": "1rem",
        } as React.CSSProperties
      }
    >
      <SidebarInset>
        <Appheader />
        <ScrollArea className="group @container/main flex flex-col" dir="rtl">
          <Provider store={store}>
            <NuqsAdapter>{children}</NuqsAdapter>
          </Provider>
          <div className="mt-12 md:mt-0 md:hidden">
            <BottomBar />
          </div>
        </ScrollArea>
      </SidebarInset>
      <AppSidebar
        variant="floating"
        className="text-2xl"
        side="right"
        dir="rtl"
      />
    </SidebarProvider>
  );
}
