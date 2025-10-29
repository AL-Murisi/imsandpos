/*
  Warnings:

  - You are about to drop the column `location` on the `ActivityLogs` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "account_category" AS ENUM ('CASH_AND_BANK', 'ACCOUNTS_RECEIVABLE', 'INVENTORY', 'OTHER_CURRENT_ASSETS', 'FIXED_ASSETS', 'ACCUMULATED_DEPRECIATION', 'OTHER_ASSETS', 'ACCOUNTS_PAYABLE', 'CREDIT_CARD', 'SHORT_TERM_LOANS', 'SALES_TAX_PAYABLE', 'ACCRUED_EXPENSES', 'OTHER_CURRENT_LIABILITIES', 'LONG_TERM_LIABILITIES', 'OWNER_EQUITY', 'RETAINED_EARNINGS', 'DRAWINGS', 'SALES_REVENUE', 'SERVICE_REVENUE', 'OTHER_INCOME', 'COST_OF_GOODS_SOLD', 'OPERATING_EXPENSES', 'PAYROLL_EXPENSES', 'ADMINISTRATIVE_EXPENSES', 'OTHER_EXPENSES');

-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'COST_OF_GOODS');

-- AlterTable
ALTER TABLE "ActivityLogs" DROP COLUMN "location";

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "company_id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "account_name_en" TEXT NOT NULL,
    "account_name_ar" TEXT,
    "account_type" "account_type" NOT NULL,
    "account_category" "account_category" NOT NULL,
    "parent_id" TEXT,
    "level" INTEGER DEFAULT 1,
    "is_active" BOOLEAN DEFAULT true,
    "is_system" BOOLEAN DEFAULT false,
    "allow_manual_entry" BOOLEAN DEFAULT true,
    "balance" DECIMAL(15,2) DEFAULT 0,
    "opening_balance" DECIMAL(15,2) DEFAULT 0,
    "currency_code" VARCHAR(3) DEFAULT 'USD',
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_mappings" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "company_id" TEXT NOT NULL,
    "mapping_type" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "company_id" TEXT NOT NULL,
    "entry_number" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "description" TEXT,
    "entry_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "debit" DECIMAL(15,2) DEFAULT 0,
    "credit" DECIMAL(15,2) DEFAULT 0,
    "is_posted" BOOLEAN DEFAULT false,
    "is_automated" BOOLEAN DEFAULT false,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "fiscal_period" TEXT,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT,
    "posted_by" TEXT,
    "posted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_periods" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "company_id" TEXT NOT NULL,
    "period_name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "is_closed" BOOLEAN NOT NULL DEFAULT false,
    "closed_by" TEXT,
    "closed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "accounts_company_id_idx" ON "accounts"("company_id");

-- CreateIndex
CREATE INDEX "accounts_parent_id_idx" ON "accounts"("parent_id");

-- CreateIndex
CREATE INDEX "accounts_account_type_idx" ON "accounts"("account_type");

-- CreateIndex
CREATE INDEX "accounts_is_active_idx" ON "accounts"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_company_id_account_code_key" ON "accounts"("company_id", "account_code");

-- CreateIndex
CREATE INDEX "account_mappings_company_id_idx" ON "account_mappings"("company_id");

-- CreateIndex
CREATE INDEX "account_mappings_mapping_type_idx" ON "account_mappings"("mapping_type");

-- CreateIndex
CREATE UNIQUE INDEX "account_mappings_company_id_mapping_type_key" ON "account_mappings"("company_id", "mapping_type");

-- CreateIndex
CREATE INDEX "journal_entries_account_id_idx" ON "journal_entries"("account_id");

-- CreateIndex
CREATE INDEX "journal_entries_company_id_idx" ON "journal_entries"("company_id");

-- CreateIndex
CREATE INDEX "journal_entries_created_by_idx" ON "journal_entries"("created_by");

-- CreateIndex
CREATE INDEX "journal_entries_entry_date_idx" ON "journal_entries"("entry_date");

-- CreateIndex
CREATE INDEX "journal_entries_reference_type_reference_id_idx" ON "journal_entries"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "journal_entries_is_posted_idx" ON "journal_entries"("is_posted");

-- CreateIndex
CREATE INDEX "journal_entries_fiscal_period_idx" ON "journal_entries"("fiscal_period");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_company_id_entry_number_key" ON "journal_entries"("company_id", "entry_number");

-- CreateIndex
CREATE INDEX "fiscal_periods_company_id_idx" ON "fiscal_periods"("company_id");

-- CreateIndex
CREATE INDEX "fiscal_periods_start_date_end_date_idx" ON "fiscal_periods"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_periods_company_id_period_name_key" ON "fiscal_periods"("company_id", "period_name");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_mappings" ADD CONSTRAINT "account_mappings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_mappings" ADD CONSTRAINT "account_mappings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
