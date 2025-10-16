import { fetchSuppliers } from "@/app/actions/roles";
import SuppliersTable from "./table";
import { getSession } from "@/lib/session";

export default async function suppliers() {
  const user = await getSession();
  if (!user) return;
  const data = await fetchSuppliers(user.companyId);
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
