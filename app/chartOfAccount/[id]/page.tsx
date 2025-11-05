import {
  getAccountLedger,
  getJournalEntries,
} from "../../../lib/actions/Journal Entry"; // adjust your import path
import { getSession } from "@/lib/session";
import JournalEntriesTable from "./table";

export default async function LedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // 👈 wait for params before using
  // Example: replace this with your real company ID
  const user = await getSession();
  if (!user) return;
  const ledger = getJournalEntries(id);

  return (
    <div className="space-y-6 p-6">
      <JournalEntriesTable dataj={ledger} />
    </div>
  );
}
