"use client";

import UserClinet from "./Table";

import UserActivityTable from "./userActivityLogs";
import DashboardTabs from "@/components/common/Tabs";
import TableSkeleton from "@/components/common/TableSkeleton";
import Role from "./roleTable";
import UpdateCompanyForm from "./updateCompany";

export default function UserTab({
  data,
  roless,
  logs,
  roles,
  company,
}: {
  data: any[];
  roless: any[];
  logs: any[];
  roles: any[];
  company:
    | {
        id: string;
        name: string;

        email: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        country: string | null;
        logoUrl: string | null;
      }
    | undefined;
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
        {
          value: "companyinfo",
          label: " بيانات الشركة",
          content: <UpdateCompanyForm company={company} />,
        },
      ]}
    />
  );
}
