import React from "react";
import { Provider } from "react-redux";
import { store } from "@/lib/store";
import SalesLayout from "./_components/provider";
export default function SaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SalesLayout>{children}</SalesLayout>;
}
