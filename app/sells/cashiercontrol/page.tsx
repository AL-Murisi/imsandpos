// // Cart.tsx
import { getAllActiveProductsForSale } from "@/lib/actions/cashier";
import { Fetchcustomerbyname } from "@/lib/actions/customers";
import { fetchAllFormData } from "@/lib/actions/roles";
import { Prisma } from "@prisma/client";

import { getSession } from "@/lib/session";
import { ScrollArea } from "@/components/ui/scroll-area";
import Clientwraper from "./_components/clientwraper";

type Props = {
  searchParams: Promise<{
    productquery?: string;

    usersquery?: string;
    categoryId?: string | string[]; // ✅ handle single or multiple
    supplierId?: string;
    warehouseId?: string;
    id?: string;
  }>;
};

export default async function Cart({ searchParams }: Props) {
  const {
    productquery = "",

    categoryId,
    usersquery = "",
    id = "",
    supplierId,
    warehouseId,
  } = await searchParams;
  const user = await getSession();
  if (!user) return;
  const searchParam = await searchParams;
  const categories = Array.isArray(categoryId)
    ? categoryId
    : categoryId
      ? [categoryId]
      : [];
  const where: Prisma.ProductWhereInput = {
    id: id || undefined,

    supplierId: supplierId || undefined,
    warehouseId: warehouseId || undefined,
    categoryId: categories.length > 0 ? { in: categories } : undefined,
    // 👆 can extend with other filters later
  };

  const products = await getAllActiveProductsForSale(
    where,
    user.companyId,
    productquery,
  );

  const [formData, users] = await Promise.all([
    fetchAllFormData(user.companyId),
    Fetchcustomerbyname(usersquery),
    // fetchProductStats("admin"),
    // Fetchusers(true),
  ]);

  // Hydrate Redux store

  return (
    <ScrollArea className="grid" dir="rtl">
      <Clientwraper
        users={users}
        product={products}
        formData={formData}
        searchParams={searchParam}
        queryr={productquery}
      />
    </ScrollArea>
  );
}
