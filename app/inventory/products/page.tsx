import { fetchAllFormData, fetchProduct } from "@/app/actions/roles";
import { Prisma } from "@prisma/client";
import ProductClient from "./_components/ProductClient";
import { fetchProductStats, Fetchusers } from "@/app/actions/sells";

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

  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  const [formData, productStats, users] = await Promise.all([
    fetchAllFormData(),
    fetchProductStats("admin"),
    Fetchusers(true),
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
