import {
  getExpenseCategories,
  getExpensesByCompany,
} from "../../lib/actions/exponses";
import { getSession } from "@/lib/session";
import ExpensesPage from "./_components/table";

export default async function Home() {
  const user = await getSession();
  if (!user) return <div>Not authenticated</div>;

  try {
    const [expensesData, categoriesData] = await Promise.all([
      getExpensesByCompany(user.companyId),
      getExpenseCategories(user.companyId),
    ]);

    return (
      <div className="p-4">
        <ExpensesPage
          data={expensesData.data}
          total={expensesData}
          formData={categoriesData}
        />
      </div>
    );
  } catch (error) {
    console.error("Error loading expenses:", error);
    return <div>خطأ في تحميل البيانات</div>;
  }
}
