import { getSession } from "@/lib/session";

import { getCompany } from "@/lib/actions/createcompnayacc";
import dynamic from "next/dynamic";
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
  await searchParams;
  const user = await getSession();
  if (!user) return;
  const company = await getCompany();

  return <UpdateCompanyForm company={company?.data} />;
}
