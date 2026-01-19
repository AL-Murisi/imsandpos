/*
  Warnings:

  - A unique constraint covering the columns `[reference_id,entry_number]` on the table `journal_entries` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_reference_id_entry_number_key" ON "journal_entries"("reference_id", "entry_number");
