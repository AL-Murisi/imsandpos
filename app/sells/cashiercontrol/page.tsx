// Cart.tsx
import { getAllactiveproductsForSale } from "@/app/actions/createProduct";
import { Fetchcustomerbyname } from "@/app/actions/customers";
import { fetchAllFormData } from "@/app/actions/roles";
import { Prisma } from "@prisma/client";
import Payment from "./Payment";
import ProductListRedux from "./ProductList";
import CartDisplayRedux from "./Showpriceandquanityt";
import { ScrollArea } from "@radix-ui/react-scroll-area";

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
type user = {
  name: string;
  id: string;
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

  // const wheree: Prisma.CustomerWhereInput = {
  //   name,
  // };
  // Fetch on server

  const products = await getAllactiveproductsForSale(where, productquery);
  const [formData, users] = await Promise.all([
    fetchAllFormData(),
    Fetchcustomerbyname(usersquery),
    // fetchProductStats("admin"),
    // Fetchusers(true),
  ]);

  // Hydrate Redux store

  return (
    <ScrollArea
      className=" flex flex-col md:flex-row p-3 gap-4 overflow-auto py-2 "
      dir="rtl"
    >
      <ProductListRedux
        product={products}
        formData={formData}
        searchParams={searchParam}
        queryr={productquery}
      />
      <CartDisplayRedux payment={<Payment users={users} />} />
    </ScrollArea>
  );
}
