import React from "react";
import JournalEntriesTable from "./_components/table";
import { getJournalEntries } from "../../lib/actions/Journal Entry";

export default function Page() {
  const journal = getJournalEntries(undefined, false);
  return <JournalEntriesTable dataj={journal} />;
}
