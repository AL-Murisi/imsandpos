import { fetchCategory } from "@/app/actions/roles";
import CategoryTable from "./_components/tables";

export default async function Category() {
  const data = await fetchCategory();
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
