// app/dashboard/userroles/loading.tsx
import DashboardTabs from "@/components/common/Tabs";

import TableSkeleton from "@/components/common/TableSkeleton";

export default function Loading() {
  return (
    <main>
      <TableSkeleton />
    </main>
  );
}
