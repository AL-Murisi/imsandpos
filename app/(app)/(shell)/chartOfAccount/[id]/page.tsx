import {
  getAccountLedger,
  getJournalEntrie,
  getJournalEntries,
} from "@/lib/actions/Journal Entry"; // adjust your import path
import { getSession } from "@/lib/session";
import JournalEntriesTable from "./table";

export default async function LedgerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params; // wait for params
  const user = await getSession();
  if (!user) return null;

  // 🔹 await the promise here
  const ledger = await getJournalEntrie(id);

  return (
    <div className="space-y-6 p-6">
      <JournalEntriesTable dataj={ledger} />
    </div>
  );
}
