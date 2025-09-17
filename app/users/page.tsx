import Table from "./dashborad/Table";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../../components/ui/tabs";
import Roles from "./userRole/page";
import { fetchRolesForSelect, fetechUser } from "../actions/roles";
import UserClinet from "./dashborad/Table";
import { Prisma } from "@prisma/client";
import UserActivityTable from "./_compoent/userActivityLogs";
import { getActivityLogs } from "../actions/activitylogs";
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
    pageSize
    // parsedSort
  );
  const logs = await getActivityLogs(pageIndex, pageSize);

  // const data = await fetechUser();
  const roles = await fetchRolesForSelect();
  return (
    <div className="py-3 px-2">
      <Tabs defaultValue="userDashboard">
        <TabsList className="bg-accent">
          <TabsTrigger value="userDashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="useractivity">user activity</TabsTrigger>
          <TabsTrigger value="user roles">user roles</TabsTrigger>
        </TabsList>
        <TabsContent value="userDashboard">
          <UserClinet users={data} total={0} role={roles} />
        </TabsContent>
        <TabsContent value="useractivity">
          <UserActivityTable logs={logs} total={logs.length} sort={[]} />
        </TabsContent>
        <TabsContent value="user roles">
          <Roles />
        </TabsContent>
      </Tabs>
    </div>
  );
}
