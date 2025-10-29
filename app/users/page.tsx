import { fetechUser } from "../actions/users";

import { getActivityLogs } from "../actions/activitylogs";

import { getSession } from "@/lib/session";
import { fetchRoles, fetchRolesForSelect } from "../actions/roles";
import UserTab from "./_compoent/tabs";

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
  const [data, logs, roless, roles] = await Promise.all([
    fetechUser(
      user.companyId,
      usersquery,
      role,
      from,
      to,
      pageIndex,
      pageSize,
      // parsedSort
    ),
    getActivityLogs(user.companyId, pageIndex, pageSize),

    // const data = await fetechUser();
    fetchRolesForSelect(),
    fetchRoles(pageIndex, pageSize),
  ]);
  return <UserTab data={data} roless={roless} logs={logs} roles={roles} />;
}
