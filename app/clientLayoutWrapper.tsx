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
import IMSLoader from "@/components/loadinf";
import { BottomBar } from "@/components/bottom-bar";

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
    return <IMSLoader />;
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
          "--sidebar-width": "17rem",
          "--sidebar-width-mobile": "1rem",
        } as React.CSSProperties
      }
    >
      <SidebarInset>
        <div className="flex flex-col">
          <ScrollArea className="group @container/main flex flex-col" dir="rtl">
            <Appheader />
            <NuqsAdapter>
              <Provider store={store}> {children}</Provider>{" "}
              <div className="mt-12 md:mt-0 md:hidden">
                <BottomBar />
              </div>
            </NuqsAdapter>
          </ScrollArea>
        </div>
      </SidebarInset>
      {/* {" "}
      <SidebarTrigger /> */}
      <AppSidebar
        variant="floating"
        className="text-2xl"
        side="right"
        dir="rtl"
      />
    </SidebarProvider>
    // </div>
  );
}
