import { getActivityLogs } from "@/lib/actions/activitylogs";

import { getSession } from "@/lib/session";
import UserActivityTable from "../_compoent/userActivityLogs";

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
  const logs = await getActivityLogs(user.companyId, pageIndex, pageSize);

  const { logs: log, total: totals } = logs;
  return <UserActivityTable logs={log} total={totals} sort={[]} />;
}
