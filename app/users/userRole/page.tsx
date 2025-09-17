import React from "react";
import Userroles from "./addnewrole";
import { DataTable } from "../../../components/common/Table";
import { columns } from "./columns";
import CardContainer from "../../../components/common/CardContainer";
import { fetchRoles } from "@/app/actions/roles";

export default async function Roles() {
  const roles = await fetchRoles();
  return (
    <CardContainer title="Users" total={120} action={<Userroles />}>
      {roles.length > 0 ? (
        <DataTable
          data={roles}
          columns={columns}
          initialPageSize={6}
          filterColumnId="status"
          // filterOptions={statusOptions}
        />
      ) : (
        <div>no Role</div>
      )}
    </CardContainer>
  );
}
