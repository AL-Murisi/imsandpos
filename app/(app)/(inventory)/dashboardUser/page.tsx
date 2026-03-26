import type { Metadata, Viewport } from "next";

import Chart from "./_components/chart";

export const metadata: Metadata = {
  title: "لوحة تحكم المخزن",
  themeColor: "#0b142a",
};

export const viewport: Viewport = {
  themeColor: "#0b142a",
};

export default function Dashboard() {
  return <Chart />;
}
