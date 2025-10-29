import { fetchAllFormData } from "@/app/actions/roles";
import { Prisma } from "@prisma/client";
import ProductClient from "./_components/ProductClient";
import { fetchProduct } from "@/app/actions/Product";
import { getSession } from "@/lib/session";

type DashboardProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
    productquery?: string;
    sort?: string;
    supplierId?: string;
    warehouseId?: string;
    categoryId?: string;
  }>;
};

export default async function Dashboard({ searchParams }: DashboardProps) {
  const param = await searchParams;
  const {
    from,
    to,
    productquery = "",
    page = "1",
    limit = "13",
    sort,
    supplierId,
    warehouseId,
    categoryId,
  } = param || {};
  const user = await getSession();
  if (!user) return;
  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  const [formData] = await Promise.all([
    fetchAllFormData(user.companyId),
    // fetchProductStats("admin", user.companyId),
    // Fetchusers(true, user.companyId),
  ]);

  const where: Prisma.ProductWhereInput = {
    supplierId,
    warehouseId,
    categoryId,
  };

  const parsedSort = sort
    ? [
        {
          id: sort.split(".")[0],
          desc: sort.split(".")[1] === "desc",
        },
      ]
    : [];

  const { products, totalCount } = await fetchProduct(
    user.companyId,
    productquery,
    where,
    from,
    to,
    pageIndex,
    pageSize,
    parsedSort,
  );

  return (
    <div className="group: mt-5 p-1">
      <ProductClient
        products={products}
        total={totalCount}
        formData={formData}
      />
    </div>
  );
}
export const dynamic = "auto"; // auto detects if server actions are dynamic
