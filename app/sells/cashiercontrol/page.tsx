// // Cart.tsx
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

  // Hydrate Redux store

  return (
    <ScrollArea className="" dir="rtl">
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
// // Cart.tsx - Optimized Server Component
// import { getAllactiveproductsForSale } from "@/app/actions/createProduct";
// import { Fetchcustomerbyname } from "@/app/actions/customers";
// import { fetchAllFormData } from "@/app/actions/roles";
// import { Prisma } from "@prisma/client";
// import dynamic from "next/dynamic";
// import { Suspense } from "react";

// // Dynamic imports with loading states
// const Payment = dynamic(() => import("./Payment"), {
//   loading: () => (
//     <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
//   ),
// });

// const ProductListRedux = dynamic(() => import("./ProductList"), {
//   loading: () => (
//     <div className="h-96 w-full animate-pulse rounded bg-gray-200" />
//   ),
// });

// const CartDisplayRedux = dynamic(() => import("./Showpriceandquanityt"), {
//   loading: () => (
//     <div className="h-96 w-full animate-pulse rounded bg-gray-200" />
//   ),
// });

// const ScrollArea = dynamic(() =>
//   import("@/components/ui/scroll-area").then((m) => m.ScrollArea),
// );

// type Props = {
//   searchParams: Promise<{
//     productquery?: string;
//     usersquery?: string;
//     categoryId?: string | string[];
//     supplierId?: string;
//     warehouseId?: string;
//     id?: string;
//   }>;
// };

// export default async function Cart({ searchParams }: Props) {
//   const params = await searchParams;
//   const {
//     productquery = "",
//     categoryId,
//     usersquery = "",
//     id = "",
//     supplierId,
//     warehouseId,
//   } = params;

//   const categories = Array.isArray(categoryId)
//     ? categoryId
//     : categoryId
//       ? [categoryId]
//       : [];

//   const where: Prisma.ProductWhereInput = {
//     id: id || undefined,
//     supplierId: supplierId || undefined,
//     warehouseId: warehouseId || undefined,
//     categoryId: categories.length > 0 ? { in: categories } : undefined,
//   };

//   // Parallel data fetching for better performance
//   const [products, formData, users] = await Promise.all([
//     getAllactiveproductsForSale(where, productquery),
//     fetchAllFormData(),
//     Fetchcustomerbyname(usersquery),
//   ]);

//   return (
//     <ScrollArea className="grid" dir="rtl">
//       <div className="grid grid-cols-1 gap-4 py-2 lg:grid-cols-2">
//         <ProductListRedux
//           product={products}
//           formData={formData}
//           searchParams={params}
//           queryr={productquery}
//         />

//         <CartDisplayRedux payment={<Payment users={users} />} />
//       </div>
//     </ScrollArea>
//   );
// }
