"use client";

import UserClinet from "./Table";

import UserActivityTable from "./userActivityLogs";
import DashboardTabs from "@/components/common/Tabs";
import TableSkeleton from "@/components/common/TableSkeleton";
import Role from "./roleTable";

export default function UserTab({
  data,
  roless,
  logs,
  roles,
}: {
  data: any[];
  roless: any[];
  logs: any[];
  roles: any[];
}) {
  return (
    <DashboardTabs
      loader={<TableSkeleton />}
      defaultTab="userDashboard"
      tabs={[
        {
          value: "userDashboard",
          label: "المستخدمين",
          content: <UserClinet users={data} total={0} role={roless} />,
        },
        {
          value: "useractivity",
          label: "أنشطة المستخدمين",
          content: (
            <UserActivityTable logs={logs} total={logs.length} sort={[]} />
          ),
        },
        {
          value: "userroles",
          label: "أدوار المستخدمين",
          content: <Role Role={roles} />,
        },
      ]}
    />
  );
}
