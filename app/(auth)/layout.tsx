"use client";
import { Provider } from "react-redux";
import { store } from "@/lib/store";
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {" "}
      <Provider store={store}> {children}</Provider>{" "}
    </div>
  );
}
