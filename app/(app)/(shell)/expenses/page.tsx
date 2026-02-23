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
      <ExpensesPage
        data={expensesData.data}
        total={expensesData}
        payment={payment}
        formData={categoriesData}
      />
    );
  } catch (error) {
    console.error("Error loading expenses:", error);
    return <div>خطأ في تحميل البيانات</div>;
  }
}
