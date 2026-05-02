/*
  Warnings:

  - You are about to drop the column `branchId` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `lastPurchaseId` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `lastPurchaseItemId` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `purchaseReceipt` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `receiptNo` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `  expired_at` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `branch_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `cost_price` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `supplier_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `warehouse_id` on the `products` table. All the data in the column will be lost.
  - You are about to drop the `InventoryBatch` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InventoryBatch" DROP CONSTRAINT "InventoryBatch_inventoryId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryBatch" DROP CONSTRAINT "InventoryBatch_invoiceItemId_fkey";

-- DropForeignKey
ALTER TABLE "InventoryBatch" DROP CONSTRAINT "InventoryBatch_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_branchId_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_branch_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_supplier_id_fkey";

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_warehouse_id_fkey";

-- DropIndex
DROP INDEX "inventory_company_id_product_id_warehouse_id_key";

-- DropIndex
DROP INDEX "inventory_receiptNo_key";

-- DropIndex
DROP INDEX "products_supplier_id_idx";

-- DropIndex
DROP INDEX "products_warehouse_id_idx";

-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "branchId",
DROP COLUMN "lastPurchaseId",
DROP COLUMN "lastPurchaseItemId",
DROP COLUMN "purchaseReceipt",
DROP COLUMN "receiptNo";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "  expired_at",
DROP COLUMN "branch_id",
DROP COLUMN "cost_price",
DROP COLUMN "supplier_id",
DROP COLUMN "warehouse_id";

-- DropTable
DROP TABLE "InventoryBatch";

-- CreateTable
CREATE TABLE "inventorybatch" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "remaining_quantity" INTEGER NOT NULL,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "expired_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supplier_id" TEXT,
    "invoice_item_id" TEXT,

    CONSTRAINT "inventorybatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventorybatch_inventory_id_idx" ON "inventorybatch"("inventory_id");

-- CreateIndex
CREATE INDEX "inventorybatch_expired_at_idx" ON "inventorybatch"("expired_at");

-- AddForeignKey
ALTER TABLE "inventorybatch" ADD CONSTRAINT "inventorybatch_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventorybatch" ADD CONSTRAINT "inventorybatch_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventorybatch" ADD CONSTRAINT "inventorybatch_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "invoice_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
