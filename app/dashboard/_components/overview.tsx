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
    //     // <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-4 pb-2">
    //     //   <div className="lg:col-span-2  shadow-2xl border-primary rounded-2xl">
    //     //     <Chart combinedChartData={combinedChartData} />
    //     //   </div>

    //     //   <div className="lg:row-span-1 border-primary bg-accent rounded-2xl">
    //     //     <TopSellingChartWrapper
    //     //       data={topProducts}
    //     //       formData={formData}
    //     //       title="Top Sales"
    //     //       width="min-w-3xl md:max-w-sm"
    //     //       dataKey="quantity"
    //     //       paramKey="topItems"
    //     //     />
    //     //   </div>
    //     // </div>
    //     // <div className="grid grid-cols-1 lg:grid-cols-3 md:grid-cols-2 gap-4 pb-2">

    //       <TopSellingChartWrapper
    //         data={topProducts}
    //         formData={formData}
    //         title="Top Sales"
    //         width=" md:min-w-5xl max-w-2xl"
    //         dataKey="quantity"
    //         paramKey="topItems"
    //       />
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
