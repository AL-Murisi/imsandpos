/*
  Warnings:

  - A unique constraint covering the columns `[receiptNo]` on the table `inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "purchaseReceipt" TEXT,
ADD COLUMN     "receiptNo" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "inventory_receiptNo_key" ON "inventory"("receiptNo");
