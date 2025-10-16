import { DataTable } from "@/components/common/Table";
import React from "react";

const CardContainer = dynamic(
  () => import("@/components/common/CardContainer"),
);

import { Prisma } from "@prisma/client";

import dynamic from "next/dynamic";
import CustomerClinet from "./debtSell/table";
import { getCustomerById } from "../actions/customers";
import { getSession } from "@/lib/session";

export default async function DebtSell() {
  const user = await getSession();
  if (!user?.companyId) return;

  const filter: Prisma.SaleWhereInput = {
    paymentStatus: {
      in: ["partial"],
    },
    customerId: "user?.userId",
  };
  const data = await getCustomerById(user.companyId);
  // const data = await FetchDebtSales(filter);
  return (
    <div className="rounded-xl p-3">
      <CustomerClinet users={data} total={0} role={[]} />
    </div>
  );
}
