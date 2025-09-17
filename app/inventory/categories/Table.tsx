import { DataTable } from "@/components/common/Table";
import React from "react";
import { Clock, Loader2, CheckCircle, XCircle } from "lucide-react";

import { columns } from "./columns";
import CardContainer from "@/components/common/CardContainer";

import { fetchCategory } from "@/app/actions/roles";
import Addnewcategorie from "./addnewcategorie";

export default async function Table() {
  const data = await fetchCategory();
  return (
    <CardContainer
      title="Users"
      total={data.length}
      action={<Addnewcategorie />}
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
