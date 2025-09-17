"use client";

import { useInView } from "react-intersection-observer";
import { Suspense } from "react";

export function LazySection({
  children,
  height = 300,
}: {
  children: React.ReactNode;
  height?: number;
}) {
  const { ref, inView } = useInView({ triggerOnce: true });

  return (
    <div
      ref={ref}
      style={{ minHeight: height }}
      className="lg:col-span-3 flex flex-col gap-x-6 gap-y-6 col-span-2"
    >
      {inView ? (
        <Suspense
          fallback={
            <div className="h-60 bg-gray-200 rounded-lg animate-pulse" />
          }
        >
          {children}
        </Suspense>
      ) : (
        <Suspense
          fallback={
            <div className="h-60 bg-gray-200 rounded-lg animate-pulse" />
          }
        ></Suspense>
      )}
    </div>
  );
}
