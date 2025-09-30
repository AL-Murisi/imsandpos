// import React from "react";
// import TopSellingChartWrapper from "./test";

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
    loading: () => (
      <div className="h-60 animate-pulse rounded-lg bg-gray-200" />
    ),
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
      title="Top Sales"
      width=" sm:w-sm w-2xs md:w-3xl lg:w-5xl "
      widthco=" xl:w-2xl 2xl:w-4xl lg:w-5xs  sm:w-md md:w-sm w-2xs  "
      dataKey="quantity"
      paramKey="topItems"
    />
  );
}
