"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { usePathname } from "next/navigation";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import dynamic from "next/dynamic";
import { Provider } from "react-redux";
import { store } from "@/lib/store";
import { ScrollArea } from "@/components/ui/scroll-area";
import IMSLoader from "@/components/loadinf";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Appheader from "@/app/AppHeader/appheader";
import { useOfflineSync } from "@/hooks/useOfflineSync";

const AppSidebar = dynamic(
  () => import("@/components/appside-bar").then((m) => m.AppSidebar),
  { ssr: false },
);
const BottomBar = dynamic(
  () => import("@/components/bottom-bar").then((m) => m.BottomBar),
  { ssr: false },
);
const PullToRefreshCurrentPage = dynamic(() => import("@/components/refresh"), {
  ssr: false,
});

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  useOfflineSync();

  // Routes that don't need sidebar and header
  const authRoutes = ["/login", "/signup"];
  const isAuthRoute = authRoutes.includes(pathname);

  if (loading) {
    return <IMSLoader />;
  }

  return (
    <Provider store={store}>
      <NuqsAdapter>
        {/* If it's an auth route or user is not authenticated, show simple layout */}
        {isAuthRoute || !user ? (
          <div className="min-h-screen">{children}</div>
        ) : (
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
                <ScrollArea
                  className="group @container/main flex flex-col"
                  dir="rtl"
                >
                  <Appheader />
                  <PullToRefreshCurrentPage>
                    {children}
                    <div className="mt-12 md:mt-0 md:hidden">
                      <BottomBar />
                    </div>
                  </PullToRefreshCurrentPage>
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
        )}{" "}
      </NuqsAdapter>
    </Provider>
  );
}
