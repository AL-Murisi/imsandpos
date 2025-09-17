import { DataTable } from "@/components/common/Table";
import React from "react";

import { columns } from "./columns";

import { fetchCategory } from "@/app/actions/roles";

export default async function Table() {
  const data = await fetchCategory();
  return (
    <>
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
    </>
  );
}
