import { fetchCategory } from "@/app/actions/roles";
import CategoryTable from "./_components/tables";
import { getSession } from "@/lib/session";

export default async function Category() {
  const user = await getSession();
  if (!user) return;
  const data = await fetchCategory(user.companyId);
  return (
    <div className="p-4">
      <CategoryTable
        data={data}
        total={0}
        formData={{
          warehouses: [],
          categories: [],
          brands: [],
          suppliers: [],
        }}
      />
    </div>
  );
}
