"use client";

import { useAuth } from "@/lib/context/AuthContext";
import { useCompany } from "@/hooks/useCompany";
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
import { useFirebaseForegroundNotifications } from "@/hooks/useFirebaseForegroundNotifications";
import { AppSidebar } from "@/components/appside-bar";
import PullToRefreshCurrentPage from "@/components/refresh";

// const AppSidebar = dynamic(
//   () => import("@/components/appside-bar").then((m) => m.AppSidebar),
//   { ssr: false },
// );
const BottomBar = dynamic(
  () => import("@/components/bottom-bar").then((m) => m.BottomBar),
  { ssr: false },
);
// const PullToRefreshCurrentPage = dynamic(() => import("@/components/refresh"), {
//   ssr: false,
// });

function ShellContentFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <IMSLoader />
    </div>
  );
}

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, loggingOut, initialized } = useAuth();
  const { loading: companyLoading } = useCompany();
  const pathname = usePathname();
  useOfflineSync();
  useFirebaseForegroundNotifications();

  // Routes that don't need sidebar and header
  const authRoutes = ["/login", "/signup"];
  const isAuthRoute = authRoutes.includes(pathname);
  if (!initialized) {
    return <IMSLoader />; // ✅ blocks white screen completely
  }

  if (loading || loggingOut) {
    return <IMSLoader />;
  }

  if (user && companyLoading) {
    return <IMSLoader />;
  }

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
          {" "}
          <Provider store={store}>
            <NuqsAdapter>{children} </NuqsAdapter>
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
