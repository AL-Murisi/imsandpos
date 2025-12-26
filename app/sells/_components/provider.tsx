"use client";
import React from "react";

import { Provider } from "react-redux";
import { store } from "@/lib/store";
export default function SalesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Provider store={store}> {children}</Provider>;
}
