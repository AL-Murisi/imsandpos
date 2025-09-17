"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter, useSearchParams } from "next/navigation";

export default function DashboardTabs({ currentTab }: { currentTab: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    params.delete("from");
    params.delete("to");
    params.delete("sort");
    params.delete("query");
    params.delete("limit");
    params.delete("supplierId");
    params.delete("warehouseId");
    params.delete("categoryId");
    router.replace(`?${params.toString()}`);
  }

  return (
    <Tabs value={currentTab} onValueChange={handleChange} className="py-2">
      <TabsList>
        <TabsTrigger value="Invontery">Invontery</TabsTrigger>
        <TabsTrigger value="movement">movement</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
