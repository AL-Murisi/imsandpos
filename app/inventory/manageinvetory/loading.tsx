import TableSkeleton from "@/components/common/TableSkeleton";
import DashboardTabs from "@/components/common/Tabs";

export default function Loading() {
  return (
    <DashboardTabs
      tabs={[
        { value: "Invontery", label: "Invontery" },
        { value: "movement", label: "Movement" },
      ]}
    >
      <div className="flex flex-col p-3">
        <TableSkeleton />
      </div>
    </DashboardTabs>
  );
}
