import { DataTable } from "@/components/common/Table";

import CardContainer from "@/components/common/CardContainer";

import { fetchWarehouse } from "@/app/actions/roles";

import CustomDialog from "@/components/common/Dailog";
import WarehouseForm from "@/components/forms/form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { columns } from "./columns";
export default async function Warehouses() {
  const data = await fetchWarehouse();
  return (
    <CardContainer
      title="Warehouse"
      total={data.length}
      action={
        <CustomDialog
          trigger={
            <Button>
              <Plus />
              add warehouses
            </Button>
          }
          title="إضافة مستودع جديدة"
        >
          <WarehouseForm />
        </CustomDialog>
      }
    >
      {data.length > 0 ? (
        <DataTable
          data={data}
          columns={columns}
          initialPageSize={6}
          filterColumnId="status"
          // filterOptions={statusOptions}
        />
      ) : (
        <div>no users</div>
      )}
    </CardContainer>
  );
}
