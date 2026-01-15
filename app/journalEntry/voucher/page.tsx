import { getVouchers } from "@/lib/actions/Journal Entry";
import { getSession } from "@/lib/session";
import React from "react";
import VouvherEntriesTable from "../_components/voucherable";

export default async function Voucher() {
  const sessio = await getSession();
  if (!sessio) return;
  const voucher = await getVouchers(sessio.companyId);
  return (
    <div className="p-3">
      <VouvherEntriesTable data={voucher.data ?? undefined} />
    </div>
  );
}
