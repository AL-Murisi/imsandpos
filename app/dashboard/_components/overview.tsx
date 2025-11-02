// import React from "react";
// import TopSellingChartWrapper from "./test";
"use client";
import dynamic from "next/dynamic";

// import Chart from "../_components/chart";
type chart = {
  //   combinedChartData: any;
  topProducts: any;
  formData: any;
};

const TopSellingChartWrapper = dynamic(
  () => import("@/components/common/Barchart"),
  {
    ssr: false,
  },
);
export default function Charts({
  //   combinedChartData,
  topProducts,
  formData,
}: chart) {
  return (
    <TopSellingChartWrapper
      data={topProducts}
      formData={formData}
      color="var(--chart-3)"
      title="Top Sales"
      width="w-full "
      widthco="w-full sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-2xl 2xl:max-w-4xl"
      dataKey="quantity"
      paramKey="topItems"
    />
  );
}
