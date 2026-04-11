import {
  getExpenseAssignmentOptions,
  getExpenseCategories,
  getExpensesByCompany,
} from "@/lib/actions/exponses";
import { getSession } from "@/lib/session";
import ExpensesPage from "./_components/table";
import { fetchPayments } from "@/lib/actions/banks";

export default async function Home() {
  const user = await getSession();
  if (!user) return <div>Not authenticated</div>;

  try {
    const [expensesData, categoriesData, payment, assignmentOptions] =
      await Promise.all([
        getExpensesByCompany(user.companyId),
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
