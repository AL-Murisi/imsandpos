/*
  Warnings:

  - You are about to drop the column `preferred_currency` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `preferred_currency` on the `suppliers` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[company_id,branch_id,entry_number]` on the table `journal_entries` will be added. If there are existing duplicate values, this will fail.
  - Made the column `currency_code` on table `accounts` required. This step will fail if there are existing NULL values in that column.
  - Made the column `voucher_number` on table `financial_transactions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `debit` on table `journal_entries` required. This step will fail if there are existing NULL values in that column.
  - Made the column `credit` on table `journal_entries` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "journal_entries_company_id_entry_number_key";

-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "currency_code" SET NOT NULL,
ALTER COLUMN "currency_code" DROP DEFAULT;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "preferred_currency";

-- AlterTable
ALTER TABLE "financial_transactions" ALTER COLUMN "currency_code" DROP DEFAULT,
ALTER COLUMN "voucher_number" SET NOT NULL;

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "journal_entries" ALTER COLUMN "debit" SET NOT NULL,
ALTER COLUMN "credit" SET NOT NULL;

-- AlterTable
ALTER TABLE "suppliers" DROP COLUMN "preferred_currency";

-- CreateTable
CREATE TABLE "currencyAccounts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "customerId" TEXT,
    "supplierId" TEXT,
    "bankId" TEXT,
    "accountId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,

    CONSTRAINT "currencyAccounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencyAccounts_company_id_customerId_currency_key" ON "currencyAccounts"("company_id", "customerId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "currencyAccounts_company_id_supplierId_currency_key" ON "currencyAccounts"("company_id", "supplierId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "currencyAccounts_company_id_bankId_currency_key" ON "currencyAccounts"("company_id", "bankId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_company_id_branch_id_entry_number_key" ON "journal_entries"("company_id", "branch_id", "entry_number");

-- AddForeignKey
ALTER TABLE "currencyAccounts" ADD CONSTRAINT "currencyAccounts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currencyAccounts" ADD CONSTRAINT "currencyAccounts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currencyAccounts" ADD CONSTRAINT "currencyAccounts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currencyAccounts" ADD CONSTRAINT "currencyAccounts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "currencyAccounts" ADD CONSTRAINT "currencyAccounts_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "banks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "points_of_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
