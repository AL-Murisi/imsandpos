// app/dashboard/userroles/loading.tsx
import DashboardTabs from "@/components/common/Tabs";

import TableSkeleton from "@/components/common/TableSkeleton";

export default function Loading() {
  return (
    <DashboardTabs
      defualt={"userDashboard"}
      tabs={[
        { value: "userDashboard", label: "Dashboard" },
        { value: "useractivity", label: "useractivity" },
        { value: "userroles", label: "userroles" },
      ]}
    >
      <TableSkeleton />;
    </DashboardTabs>
  );
}
