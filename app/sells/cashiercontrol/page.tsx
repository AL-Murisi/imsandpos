// Cart.tsx
import { getAllactiveproductsForSale } from "@/app/actions/createProduct";
import { Fetchcustomerbyname } from "@/app/actions/customers";
import { fetchAllFormData } from "@/app/actions/roles";
import { Prisma } from "@prisma/client";
import Payment from "./Payment";
import ProductListRedux from "./ProductList";
import CartDisplayRedux from "./Showpriceandquanityt";
import dynamic from "next/dynamic";
const ScrollArea = dynamic(
  () => import("@/components/ui/scroll-area").then((m) => m.ScrollArea),
  {
    // ensures it only loads on the client
    // optional fallback
  },
);
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

  const products = await getAllactiveproductsForSale(where, productquery);
  const [formData, users] = await Promise.all([
    fetchAllFormData(),
    Fetchcustomerbyname(usersquery),
    // fetchProductStats("admin"),
    // Fetchusers(true),
  ]);
  console.log(formData);

  // Hydrate Redux store

  return (
    <ScrollArea className="grid" dir="rtl">
      <div className="grid grid-cols-1 gap-4 py-2 lg:grid-cols-2">
        {/* Right side → Products (take 2/3 on large screens) */}

        <ProductListRedux
          product={products}
          formData={formData}
          searchParams={searchParam}
          queryr={productquery}
        />

        <CartDisplayRedux payment={<Payment users={users} />} />
      </div>
    </ScrollArea>
  );
}
