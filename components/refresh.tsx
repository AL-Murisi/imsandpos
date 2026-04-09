"use client";

import PullToRefresh from "pulltorefreshjs";
import { useRouter } from "next/navigation";
import { useEffect, useId } from "react";

export default function PullToRefreshCurrentPage({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pullRootId = `ptr-root-${useId().replace(/:/g, "")}`;

  useEffect(() => {
    const mainElement = `#${pullRootId}`;

    const isTouchDevice = () => {
      if (typeof window === "undefined") return false;

      return (
        window.matchMedia("(pointer: coarse)").matches ||
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0
      );
    };

    const getActiveScrollViewport = () => {
      const viewports = Array.from(
        document.querySelectorAll<HTMLElement>(
          "[data-slot='scroll-area-viewport']",
        ),
      );

      return (
        viewports.find((viewport) => {
          const style = window.getComputedStyle(viewport);
          const canScroll =
            viewport.scrollHeight > viewport.clientHeight &&
            /(auto|scroll)/.test(style.overflowY);

          return canScroll;
        }) ?? null
      );
    };

    PullToRefresh.init({
      mainElement,
      triggerElement: mainElement,
      distThreshold: 80,
      distMax: 120,
      distReload: 60,
      shouldPullToRefresh() {
        if (!isTouchDevice()) {
          return false;
        }

        const viewport = getActiveScrollViewport();

        if (viewport) {
          return viewport.scrollTop <= 0;
        }

        return window.scrollY <= 0;
      },
      onRefresh() {
        router.refresh(); // ✅ refresh current page only
      },
    });

    return () => PullToRefresh.destroyAll();
  }, [pullRootId, router]);

  return (
    <div id={pullRootId} className="min-h-full">
      {children}
    </div>
  );
}
