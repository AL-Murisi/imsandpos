import { DataTable } from "@/components/common/Table";
import React from "react";

const CardContainer = dynamic(
  () => import("@/components/common/CardContainer"),
);
import { FetchDebtSales } from "@/app/actions/debtSells";
import { debtSaleColumns } from "./debtSell/columns";
import { Prisma } from "@prisma/client";
import { useAuth } from "@/lib/context/AuthContext";
import dynamic from "next/dynamic";

export default async function DebtSell() {
  // const { user } = useAuth();

  const filter: Prisma.SaleWhereInput = {
    paymentStatus: {
      in: ["partial"],
    },
    customerId: "user?.userId",
  };

  const data = await FetchDebtSales(filter);
  return (
    <CardContainer title="Supplier">
      {/* <>
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
        </CustomDialog>{" "}
      </> */}

      <>
        <p>{data.length}</p>
        <DataTable
          data={data}
          columns={debtSaleColumns}
          initialPageSize={6}
          filterColumnId="status"
        />
      </>
    </CardContainer>
  );
}
