import { getSession } from "@/lib/session";

import { getCompany } from "@/lib/actions/createcompnayacc";
import dynamic from "next/dynamic";

const UpdateCompanyForm = dynamic(() => import("../_compoent/updateCompany"), {
  loading: () => <div className="p-4 text-sm text-muted-foreground">Loading...</div>,
});

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
