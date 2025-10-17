import { fetchSuppliers } from "@/app/actions/roles";
import {
  getPurchasesByCompany,
  getSupplierPaymentsByCompany,
} from "@/app/actions/suppliers";
import SuppliersTable from "./table";

import { getSession } from "@/lib/session";
import { TabsContent } from "@/components/ui/tabs";
import DashboardTabs from "@/components/common/Tabs";
import { ParsedSort } from "@/hooks/sort";
import { SortingState } from "@tanstack/react-table";
import PaymentsTable from "./paymentsTable";
import PurchasesTable from "./PurchasesTable";

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
    query = "",
    purchaseQuery = "",
    paymentQuery = "",
    page = "1",
    limit = "10",
    sort,
    purchaseSort,
    paymentSort,
    status,
    paymentMethod,
    supplierId,
    tab = "suppliers",
  } = params || {};

  // Pagination
  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);

  // Sorting
  const parsedSort: SortingState = ParsedSort(sort);
  const parsedPurchaseSort: SortingState = ParsedSort(purchaseSort);
  const parsedPaymentSort: SortingState = ParsedSort(paymentSort);

  // Get user session
  const user = await getSession();
  if (!user) return;

  // Build filters for purchases
  const purchaseWhere: any = {
    companyId: user.companyId,
  };
  if (supplierId) {
    purchaseWhere.supplierId = supplierId;
  }
  if (status && status !== "all") {
    purchaseWhere.status = status;
  }

  // Build filters for payments
  const paymentInput: any = {
    supplierId: supplierId || "",
  };

  // ✅ Run all fetches in parallel
  const [suppliers, purchases, payments] = await Promise.all([
    // Fetch form data (warehouses, categories, brands, etc)
    fetchSuppliers(user.companyId),

    // Fetch suppliers list

    // Fetch purchases (only if supplierId selected or purchases tab active)
    getPurchasesByCompany(user.companyId, {
      from,
      to,
      parsedSort,
    }),

    getSupplierPaymentsByCompany(user.companyId, {
      from,
      to,
      pageIndex,
      pageSize,
      parsedSort: parsedPaymentSort,
    }),
  ]);

  const { data: fetchedPurchases, total: purchasesTotal } = purchases;

  const { data: fetchedPayments, total: paymentsTotal } = payments;

  return (
    <DashboardTabs
      currentTab={tab}
      tabs={[
        { value: "suppliers", label: "المورّدون" },
        { value: "purchases", label: "الطلبات" },
        { value: "payments", label: "الدفعات" },
      ]}
    >
      <TabsContent value="suppliers">
        <SuppliersTable
          data={suppliers}
          total={0}
          formData={{
            warehouses: [],
            categories: [],
            brands: [],
            suppliers: [],
          }}
        />
      </TabsContent>

      <TabsContent value="purchases">
        <PurchasesTable data={fetchedPurchases} total={purchasesTotal} />
      </TabsContent>

      <TabsContent value="payments">
        <PaymentsTable data={fetchedPayments} total={paymentsTotal} />
      </TabsContent>
    </DashboardTabs>
  );
}
