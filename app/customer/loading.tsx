// app/dashboard/userroles/loading.tsx
import DashboardTabs from "@/components/common/Tabs";

import TableSkeleton from "@/components/common/TableSkeleton";

export default function Loading() {
  return (
    <div className="flex flex-col p-3">
      <TableSkeleton />
    </div>
  );
}
