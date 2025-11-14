"use client";

const UserClinet = dynamic(() => import("./Table"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
import DashboardTabs from "@/components/common/Tabs";
import TableSkeleton from "@/components/common/TableSkeleton";
import dynamic from "next/dynamic";
import UpdateCompanyForm from "./updateCompany";

const UserActivityTable = dynamic(() => import("./userActivityLogs"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
const Role = dynamic(() => import("./roleTable"), {
  ssr: false,
  loading: () => <TableSkeleton />,
});
export default function UserTab({
  data,
  roless,
  logs,
  roles,
  totalLogs,
  company,
}: {
  data: any[];
  roless: any[];
  logs: any[];
  roles: any[];
  totalLogs: number;
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
            <UserActivityTable logs={logs} total={totalLogs} sort={[]} />
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
