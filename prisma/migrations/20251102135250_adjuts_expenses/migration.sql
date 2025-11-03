/*
  Warnings:

  - You are about to drop the column `category_id` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the `expense_categories` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "account_category" ADD VALUE 'HOUSE_EXPENSES';

-- DropForeignKey
ALTER TABLE "expense_categories" DROP CONSTRAINT "fk_expense_category_company";

-- DropForeignKey
ALTER TABLE "expenses" DROP CONSTRAINT "fk_expense_category";

-- DropIndex
DROP INDEX "idx_expense_category";

-- AlterTable
ALTER TABLE "expenses" DROP COLUMN "category_id",
ADD COLUMN     "account_id" UUID,
ALTER COLUMN "description" DROP NOT NULL;

-- DropTable
DROP TABLE "expense_categories";
