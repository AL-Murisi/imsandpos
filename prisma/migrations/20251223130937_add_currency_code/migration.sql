/*
  Warnings:

  - You are about to drop the column `currencyCode` on the `banks` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "banks" DROP COLUMN "currencyCode";

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "currency_code" VARCHAR(3) DEFAULT 'USD';
