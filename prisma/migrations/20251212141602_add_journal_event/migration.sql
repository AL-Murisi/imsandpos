-- CreateTable
CREATE TABLE "journal_events" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "entity_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,

    CONSTRAINT "journal_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "journal_events_entity_id_idx" ON "journal_events"("entity_id");

-- CreateIndex
CREATE INDEX "journal_events_entity_type_idx" ON "journal_events"("entity_type");

-- CreateIndex
CREATE INDEX "journal_events_company_id_idx" ON "journal_events"("company_id");

-- AddForeignKey
ALTER TABLE "journal_events" ADD CONSTRAINT "journal_events_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
