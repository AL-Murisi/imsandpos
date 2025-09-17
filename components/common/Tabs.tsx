"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { ReactNode } from "react";

type TabItem = {
  value: string;
  label: string;
  content?: ReactNode; // 👈 allow passing content for each tab
};

type DashboardTabsProps = {
  currentTab: string;
  tabs: TabItem[];
  children?: ReactNode; // 👈 optional children (if you want manual control)
};

export default function DashboardTabs({
  currentTab,
  tabs,
  children,
}: DashboardTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    // set the new tab
    params.set("tab", value);

    // delete filters
    [
      "from",
      "to",
      "sort",
      "query",
      "limit",
      "supplierId",
      "warehouseId",
      "categoryId",
    ].forEach((param) => params.delete(param));

    router.replace(`?${params.toString()}`);
  }

  return (
    <Tabs
      value={currentTab}
      onValueChange={handleChange}
      className="py-2 px-2 "
      dir="rtl"
    >
      <TabsList>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className="data-[state=active]:border-b-2 data-[state=active]:border-amber-500"
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Render children if passed manually */}
      {children}

      {/* Or auto-render content from tabs prop */}
      {tabs.map(
        (tab) =>
          tab.content && (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          )
      )}
    </Tabs>
  );
}
