import { fetchWarehouse } from "@/app/actions/roles";

import WarehouseTable from "./_components/tables";
import { getSession } from "@/lib/session";
export default async function Warehouses() {
  const user = await getSession();
  if (!user) return;
  const data = await fetchWarehouse(user.companyId);
  return (
    // <CardContainer
    //   title="Warehouse"
    //   total={data.length}
    //   action={
    //     <CustomDialog
    //       trigger={
    //         <Button>
    //           <Plus />
    //           add warehouses
    //         </Button>
    //       }
    //       title="إضافة مستودع جديدة"
    //     >
    //       <WarehouseForm />
    //     </CustomDialog>
    //   }
    // >
    <div className="p-4">
      <WarehouseTable
        products={data}
        total={data.length}
        formData={{
          warehouses: [],
          categories: [],
          brands: [],
          suppliers: [],
        }}
      />
    </div>
    // </CardContainer>
  );
}
