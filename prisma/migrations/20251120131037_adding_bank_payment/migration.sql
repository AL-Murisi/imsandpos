-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "account_category" ADD VALUE 'CASH';
ALTER TYPE "account_category" ADD VALUE 'BANK';

-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "refunded" DECIMAL(10,2) NOT NULL DEFAULT 0;
