import { TabsContent } from "../../components/ui/tabs";

import { fetchRoles, fetchRolesForSelect, fetechUser } from "../actions/roles";
import UserClinet from "./dashborad/Table";

import UserActivityTable from "./_compoent/userActivityLogs";
import { getActivityLogs } from "../actions/activitylogs";
import DashboardTabs from "@/components/common/Tabs";
import RoleTable from "./userRole/roleTable";
import Loading from "./loading";
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

  const data = await fetechUser(
    usersquery,
    role,
    from,
    to,
    pageIndex,
    pageSize,
    // parsedSort
  );
  const logs = await getActivityLogs(pageIndex, pageSize);

  // const data = await fetechUser();
  const roless = await fetchRolesForSelect();
  const roles = await fetchRoles(pageIndex, pageSize);
  return (
    <DashboardTabs
      defualt={"userDashboard"}
      tabs={[
        { value: "userDashboard", label: "Dashboard" },
        { value: "useractivity", label: "useractivity" },
        { value: "userroles", label: "userroles" },
      ]}
    >
      <TabsContent value="userDashboard">
        <UserClinet users={data} total={0} role={roless} />
      </TabsContent>

      <TabsContent value={"useractivity"}>
        <UserActivityTable logs={logs} total={logs.length} sort={[]} />
      </TabsContent>
      <TabsContent value={"userroles"}>
        <RoleTable role={roles} total={logs.length} sort={[]} />
      </TabsContent>
    </DashboardTabs>
  );
}
