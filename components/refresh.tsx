"use client";

import PullToRefresh from "pulltorefreshjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PullToRefreshCurrentPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    PullToRefresh.init({
      mainElement: "#ptr-root",
      onRefresh() {
        router.refresh(); // ✅ refresh current page only
      },
    });

    return () => PullToRefresh.destroyAll();
  }, [router]);

  return (
    <div id="ptr-root" className="overflow-auto overscroll-y-auto">
      {children}
    </div>
  );
}
