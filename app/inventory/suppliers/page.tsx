import { DataTable } from "@/components/common/Table";

import CardContainer from "@/components/common/CardContainer";
import Form from "../../../components/forms/supplierform";
import { columns } from "./columns";

import { fetchSuppliers } from "@/app/actions/roles";
import CustomDialog from "@/components/common/Dailog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function suppliers() {
  const data = await fetchSuppliers();
  return (
    <CardContainer
      title="Supplier"
      action={
        <CustomDialog
          trigger={
            <Button>
              <Plus />
              add
            </Button>
          }
          title="إضافة فئة جديدة"
        >
          <Form />
        </CustomDialog>
      }
      total={data.length}
    >
      {data.length > 0 ? (
        <>
          <CustomDialog
            trigger={
              <Button>
                <Plus />
                add
              </Button>
            }
            title="إضافة فئة جديدة"
          >
            <Form />
          </CustomDialog>
          <DataTable
            data={data}
            columns={columns}
            initialPageSize={6}
            filterColumnId="status"
          />
        </>
      ) : (
        <div>no users</div>
      )}
    </CardContainer>
  );
}
