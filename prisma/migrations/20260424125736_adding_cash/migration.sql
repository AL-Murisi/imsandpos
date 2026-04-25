/*
  Warnings:

  - You are about to drop the column `branch` on the `banks` table. All the data in the column will be lost.
  - You are about to drop the column `packets_per_carton` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price_per_carton` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price_per_packet` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `price_per_unit` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `units_per_packet` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `journal_entries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `journal_events` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `offline_operations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `roles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK');

-- DropForeignKey
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_account_id_fkey";

-- DropForeignKey
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_company_id_fkey";

-- DropForeignKey
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_created_by_fkey";

-- DropForeignKey
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "journal_events" DROP CONSTRAINT "journal_events_company_id_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_role_id_fkey";

-- DropForeignKey
ALTER TABLE "user_roles" DROP CONSTRAINT "user_roles_user_id_fkey";

-- AlterTable
ALTER TABLE "banks" DROP COLUMN "branch",
ADD COLUMN     "branch_id" TEXT,
ADD COLUMN     "type" "AccountType" NOT NULL DEFAULT 'CASH';

-- AlterTable
ALTER TABLE "financial_transactions" ADD COLUMN     "financial_account_id" TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "packets_per_carton",
DROP COLUMN "price_per_carton",
DROP COLUMN "price_per_packet",
DROP COLUMN "price_per_unit",
DROP COLUMN "units_per_packet";

-- DropTable
DROP TABLE "journal_entries";

-- DropTable
DROP TABLE "journal_events";

-- DropTable
DROP TABLE "offline_operations";

-- DropTable
DROP TABLE "roles";

-- DropTable
DROP TABLE "user_roles";

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_financial_account_id_fkey" FOREIGN KEY ("financial_account_id") REFERENCES "banks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banks" ADD CONSTRAINT "banks_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "points_of_sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
