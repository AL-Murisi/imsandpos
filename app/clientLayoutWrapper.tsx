"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { redirect, usePathname } from "next/navigation";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "../components/ui/sidebar";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AppSidebar } from "@/components/appside-bar";
import { Provider } from "react-redux";
import { store } from "@/lib/store";
import Appheader from "./AppHeader/appheader";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { verifySession } from "@/lib/dal";

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
      <div className="flex items-center justify-center">
        <div className="text-accent min-h-screen w-full animate-pulse border-b-2 bg-gray-500">
          weclome to ims
        </div>
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
        <div className="flex flex-col">
          <ScrollArea className="@container/main flex flex-col" dir="rtl">
            <Appheader />
            <NuqsAdapter>
              <Provider store={store}> {children}</Provider>
            </NuqsAdapter>
          </ScrollArea>
        </div>
      </SidebarInset>
      {/* {" "}
      <SidebarTrigger /> */}
      <AppSidebar variant="inset" className="text-2xl" side="right" dir="rtl" />
    </SidebarProvider>
    // </div>
  );
}
