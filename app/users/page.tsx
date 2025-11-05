import { fetechUser } from "../../lib/actions/users";

import { getActivityLogs } from "../../lib/actions/activitylogs";

import { getSession } from "@/lib/session";
import { fetchRoles, fetchRolesForSelect } from "../../lib/actions/roles";
import UserTab from "./_compoent/tabs";
import { getCompany } from "../../lib/actions/createcompnayacc";

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
  const user = await getSession();
  if (!user) return;
  const [data, logs, roless, roles, company] = await Promise.all([
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
    getCompany(user.companyId),
  ]);
  return (
    <UserTab
      data={data}
      roless={roless}
      logs={logs}
      roles={roles}
      company={company.data}
    />
  );
}
