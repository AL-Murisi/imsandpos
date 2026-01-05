import {
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
    const [expensesData, categoriesData, payment] = await Promise.all([
      getExpensesByCompany(user.companyId),
      getExpenseCategories(user.companyId),
      fetchPayments(),
    ]);

    return (
      <div className="p-4">
        <ExpensesPage
          data={expensesData.data}
          total={expensesData}
          payment={payment}
          formData={categoriesData}
        />
      </div>
    );
  } catch (error) {
    console.error("Error loading expenses:", error);
    return <div>خطأ في تحميل البيانات</div>;
  }
}
