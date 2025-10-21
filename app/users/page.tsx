import { TabsContent } from "@/components/ui/tabs";

import { fetechUser } from "../actions/users";
import UserClinet from "./_compoent/Table";

import UserActivityTable from "./_compoent/userActivityLogs";
import { getActivityLogs } from "../actions/activitylogs";
import DashboardTabs from "@/components/common/Tabs";

import { getSession } from "@/lib/session";
import { fetchRoles, fetchRolesForSelect } from "../actions/roles";
import Role from "./_compoent/roleTable";

type Users = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
    usersquery?: string;
    sort?: string;
    supplierId?: string;
    warehouseId?: string;
    categoryId?: string;
    role?: string;
  }>;
};
export default async function User({ searchParams }: Users) {
  const param = await searchParams;
  const {
    from,
    to,
    usersquery = "",
    page = "1",
    limit = "12",
    sort,
    supplierId,
    warehouseId,
    categoryId,
    role,
  } = param || {};
  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);
  const name = (await searchParams).usersquery;
  const user = await getSession();
  if (!user) return;
  const data = await fetechUser(
    user.companyId,
    usersquery,
    role,
    from,
    to,
    pageIndex,
    pageSize,
    // parsedSort
  );
  const logs = await getActivityLogs(user.companyId, pageIndex, pageSize);

  // const data = await fetechUser();
  const roless = await fetchRolesForSelect();
  const roles = await fetchRoles(pageIndex, pageSize);
  return (
    <DashboardTabs
      defualt={"userDashboard"}
      tabs={[
        { value: "userDashboard", label: "المستخدمين" },
        { value: "useractivity", label: "أنشطة المستخدمين" },
        { value: "userroles", label: "أدوار المستخدمين" },
      ]}
    >
      <TabsContent value="userDashboard">
        <UserClinet users={data} total={0} role={roless} />
      </TabsContent>
      <TabsContent value={"useractivity"}>
        <UserActivityTable logs={logs} total={logs.length} sort={[]} />
      </TabsContent>
      <TabsContent value={"userroles"}>
        <Role Role={roles} />
      </TabsContent>
    </DashboardTabs>
  );
}
