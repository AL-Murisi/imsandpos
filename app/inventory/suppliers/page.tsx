import {
  getPurchasesByCompany,
  getSupplierPaymentsByCompany,
  fetchSuppliers,
} from "@/lib/actions/suppliers";
import { getSession } from "@/lib/session";
import { ParsedSort } from "@/hooks/sort";
import { SortingState } from "@tanstack/react-table";
import SuppliersTable from "./_compoenets/table";

type DashboardProps = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
    query?: string;
    purchaseQuery?: string;
    paymentQuery?: string;
    sort?: string;
    purchaseSort?: string;
    paymentSort?: string;
    status?: string;
    paymentMethod?: string;
    supplierId?: string;
    tab?: string;
  }>;
};

export default async function Suppliers({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const {
    from,
    to,
    page = "1",
    limit = "13",
    sort,
    purchaseSort,
    paymentSort,
    status,
    supplierId,
  } = params || {};

  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  const parsedSort: SortingState = ParsedSort(sort);
  const parsedPaymentSort: SortingState = ParsedSort(paymentSort);

  const user = await getSession();
  if (!user) return null;

  // 🧩 Don't await — pass promises to client
  const suppliersPromise = fetchSuppliers(user.companyId);
  // const purchasesPromise = getPurchasesByCompany(user.companyId, {
  //   pageIndex,
  //   pageSize,
  //   from,
  //   to,
  //   parsedSort,
  // });
  // const paymentsPromise = getSupplierPaymentsByCompany(user.companyId, {
  //   from,
  //   to,
  //   pageIndex,
  //   pageSize,
  //   parsedSort: parsedPaymentSort,
  // });

  // ✅ Pass promises directly (React 19 pattern)
  return <SuppliersTable suppliersPromise={suppliersPromise} />;
}
