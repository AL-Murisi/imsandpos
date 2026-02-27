import { fetchCategory } from "@/lib/actions/category";
import { getSession } from "@/lib/session";
import Clinet from "./_components/clinet";

export default async function Category() {
  const user = await getSession();
  if (!user) return;
  const data = await fetchCategory(user.companyId);
  return (
    <div className="p-4">
      <Clinet
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
