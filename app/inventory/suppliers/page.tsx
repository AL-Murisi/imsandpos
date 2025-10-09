import { fetchSuppliers } from "@/app/actions/roles";
import SuppliersTable from "../categories/_components/tables";

export default async function suppliers() {
  const data = await fetchSuppliers();
  return (
    <div className="p-4">
      <SuppliersTable
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
