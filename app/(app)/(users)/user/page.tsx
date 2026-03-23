import { fetechUser } from "@/lib/actions/users";

import { fetchRoles, fetchRolesForSelect } from "@/lib/actions/roles";
import { getCompanySubscriptionUsage } from "@/lib/actions/subscription";
import { getSession } from "@/lib/session";
import UserClinet from "../_compoent/Table";

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
  const [data, roless, subscriptionUsage] = await Promise.all([
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

    // const data = await fetechUser();
    fetchRolesForSelect(),
    getCompanySubscriptionUsage(),
  ]);
  return (
    <UserClinet
      users={data}
      total={0}
      role={roless}
      userLimit={subscriptionUsage?.users ?? null}
      cashierLimit={subscriptionUsage?.cashiers ?? null}
    />
  );
}
