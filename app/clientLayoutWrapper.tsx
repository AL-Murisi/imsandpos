"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { usePathname } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";

import { AppSidebar } from "@/components/appside-bar";
import { Provider } from "react-redux";
import { store } from "@/lib/store";

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // Routes that don't need sidebar and header
  const authRoutes = ["/login", "/signup"];
  const isAuthRoute = authRoutes.includes(pathname);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If it's an auth route or user is not authenticated, show simple layout
  if (isAuthRoute || !user) {
    return <div className="min-h-screen">{children}</div>;
  }

  // Main app layout with sidebar and header
  return (
    // // <div className=" h-screen overflow-hidden bg-accent  ">
    //   {/* <Appheader /> */}

    //   {/* <PWARegister /> */}

    <SidebarProvider
      style={
        {
          "--sidebar-width": "15rem",
          "--sidebar-width-mobile": "15rem",
        } as React.CSSProperties
      }
    >
      <SidebarInset>
        {/* */}
        <div className="flex flex-col">
          <div className="@container/main flex flex-col">
            <Provider store={store}>{children}</Provider>
          </div>
        </div>
      </SidebarInset>
      <SidebarTrigger />
      <AppSidebar
        className="text-2xl"
        side="right"
        dir="rtl"
        variant="sidebar"
      />
    </SidebarProvider>
    // </div>
  );
}
