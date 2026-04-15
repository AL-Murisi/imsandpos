import {
  getExpenseAssignmentOptions,
  getExpenseCategories,
  getExpensesByCompany,
} from "@/lib/actions/exponses";
import { getSession } from "@/lib/session";
import ExpensesPage from "./_components/table";
import { fetchPayments } from "@/lib/actions/banks";
type expenses = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    page?: string;
    limit?: string;
    search?: string;
    sort?: string;
    supplierId?: string;
    warehouseId?: string;
    expense_categoriesId?: string;
    role?: string;
  }>;
};
export default async function Home({ searchParams }: expenses) {
  const user = await getSession();
  const param = await searchParams;
  const {
    from,
    to,
    search = "",
    page = "1",
    limit = "12",
    sort,
    supplierId,
    warehouseId,
    expense_categoriesId,
    role,
  } = param || {};
  const pageIndex = Number(page) - 1;
  const pageSize = Number(limit);
  if (!user) return <div>Not authenticated</div>;

  try {
    const [expensesData, categoriesData, payment, assignmentOptions] =
      await Promise.all([
        getExpensesByCompany(user.companyId, {
          from,
          to,
          pageIndex,
          pageSize,
          search,
          expense_categoriesId,
        }),
        getExpenseCategories(user.companyId),
        fetchPayments(),
        getExpenseAssignmentOptions(user.companyId),
      ]);

    return (
      <div className="p-3">
        <ExpensesPage
          data={expensesData.data}
          total={expensesData.total}
          payment={payment}
          formData={categoriesData}
          assignmentOptions={assignmentOptions}
        />
      </div>
    );
  } catch (error) {
    console.error("Error loading expenses:", error);
    return <div>خطأ في تحميل البيانات</div>;
  }
}
