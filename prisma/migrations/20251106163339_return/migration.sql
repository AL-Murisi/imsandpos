/*
  Warnings:

  - You are about to drop the column `saleType` on the `sales` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "sales" DROP COLUMN "saleType",
ADD COLUMN     "sale_type" TEXT NOT NULL DEFAULT 'sale';
