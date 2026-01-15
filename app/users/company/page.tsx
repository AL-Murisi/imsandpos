import { getSession } from "@/lib/session";

import { getCompany } from "@/lib/actions/createcompnayacc";
import UpdateCompanyForm from "../_compoent/updateCompany";

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
  const company = await getCompany();

  return <UpdateCompanyForm company={company?.data} />;
}
