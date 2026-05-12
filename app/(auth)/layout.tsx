"use client";
import { Provider } from "react-redux";
import { store } from "@/lib/store";
import { useEffect, useState } from "react";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    // Remove inline loader on auth pages too, guard against double-removal
    const loader = document.getElementById("initial-loader");
    if (loader) {
      loader.style.display = "none";
    }
  }, []);
  return (
    <div className="min-h-screen">
      <Provider store={store}> {children}</Provider>{" "}
    </div>
  );
}
