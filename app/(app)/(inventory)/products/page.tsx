import { fetchAllFormData } from "@/lib/actions/roles";
import { Prisma } from "@prisma/client";
import ProductClient from "./_components/ProductClient";
import { fetchProduct } from "@/lib/actions/Product";
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
    expiryStatus?: string;
    stockStatus?: string;
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
    expiryStatus,
    stockStatus,
  } = param || {};
  const user = await getSession();
  if (!user) return;
  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);
  const where: Prisma.ProductWhereInput = {
    categoryId,
  };

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const thirtyDaysLater = new Date();
  thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
  thirtyDaysLater.setHours(23, 59, 59, 999);

  const parsedSort = sort
    ? [
        {
          id: sort.split(".")[0],
          desc: sort.split(".")[1] === "desc",
        },
      ]
    : [];

  const [formData, product] = await Promise.all([
    fetchAllFormData(user.companyId),
    fetchProduct(
      user.companyId,
      productquery,
      where,
      from,
      to,
      pageIndex,
      pageSize,
      parsedSort,
    ),
  ]);

  const { products, totalCount } = product;
  return (
    <div className="p-3">
      <ProductClient
        products={products}
        total={totalCount}
        formData={formData}
      />
    </div>
  );
}
