/*
  Warnings:

  - You are about to drop the column `balance` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `is_active` on the `expenses` table. All the data in the column will be lost.
  - You are about to drop the column `available_quantity` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `inventory` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `invoice_items` table. All the data in the column will be lost.
  - You are about to drop the column `dimensions` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `weight` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `allowed_currencies` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `outstanding_balance` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `total_paid` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the column `total_purchased` on the `suppliers` table. All the data in the column will be lost.
  - You are about to drop the `inventorybatch` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "inventorybatch" DROP CONSTRAINT "inventorybatch_inventory_id_fkey";

-- DropForeignKey
ALTER TABLE "inventorybatch" DROP CONSTRAINT "inventorybatch_invoice_item_id_fkey";

-- DropForeignKey
ALTER TABLE "inventorybatch" DROP CONSTRAINT "inventorybatch_supplier_id_fkey";

-- DropForeignKey
ALTER TABLE "invoice_items" DROP CONSTRAINT "invoice_items_companyId_fkey";

-- DropIndex
DROP INDEX "products_status_idx";

-- DropIndex
DROP INDEX "stock_movements_reason_idx";

-- DropIndex
DROP INDEX "stock_movements_user_id_idx";

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "balance";

-- AlterTable
ALTER TABLE "expenses" DROP COLUMN "is_active";

-- AlterTable
ALTER TABLE "inventory" DROP COLUMN "available_quantity",
DROP COLUMN "location";

-- AlterTable
ALTER TABLE "invoice_items" DROP COLUMN "companyId",
ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "warehouse_id" TEXT;

-- AlterTable
ALTER TABLE "products" DROP COLUMN "dimensions",
DROP COLUMN "status",
DROP COLUMN "weight";

-- AlterTable
ALTER TABLE "stock_movements" ADD COLUMN     "inventory_batch_id" TEXT;

-- AlterTable
ALTER TABLE "suppliers" DROP COLUMN "allowed_currencies",
DROP COLUMN "outstanding_balance",
DROP COLUMN "total_paid",
DROP COLUMN "total_purchased";

-- DropTable
DROP TABLE "inventorybatch";

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "purchase_item_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "remaining_quantity" INTEGER NOT NULL,
    "cost_price" DECIMAL(10,2) NOT NULL,
    "expired_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_allocations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "invoice_item_id" TEXT NOT NULL,
    "batch_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "original_allocation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_batches_inventory_id_idx" ON "inventory_batches"("inventory_id");

-- CreateIndex
CREATE INDEX "inventory_batches_supplier_id_idx" ON "inventory_batches"("supplier_id");

-- CreateIndex
CREATE INDEX "inventory_batches_expired_at_idx" ON "inventory_batches"("expired_at");

-- CreateIndex
CREATE INDEX "inventory_batches_remaining_quantity_idx" ON "inventory_batches"("remaining_quantity");

-- CreateIndex
CREATE INDEX "inventory_allocations_invoice_item_id_idx" ON "inventory_allocations"("invoice_item_id");

-- CreateIndex
CREATE INDEX "inventory_allocations_batch_id_idx" ON "inventory_allocations"("batch_id");

-- CreateIndex
CREATE INDEX "inventory_allocations_warehouse_id_idx" ON "inventory_allocations"("warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_allocations_supplier_id_idx" ON "inventory_allocations"("supplier_id");

-- CreateIndex
CREATE INDEX "inventory_allocations_company_id_idx" ON "inventory_allocations"("company_id");

-- CreateIndex
CREATE INDEX "inventory_company_id_idx" ON "inventory"("company_id");

-- CreateIndex
CREATE INDEX "inventory_product_id_idx" ON "inventory"("product_id");

-- CreateIndex
CREATE INDEX "inventory_warehouse_id_idx" ON "inventory"("warehouse_id");

-- CreateIndex
CREATE INDEX "invoice_items_invoice_id_idx" ON "invoice_items"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_items_product_id_idx" ON "invoice_items"("product_id");

-- CreateIndex
CREATE INDEX "invoice_items_warehouse_id_idx" ON "invoice_items"("warehouse_id");

-- CreateIndex
CREATE INDEX "stock_movements_inventory_batch_id_idx" ON "stock_movements"("inventory_batch_id");

-- CreateIndex
CREATE INDEX "stock_movements_reference_type_reference_id_idx" ON "stock_movements"("reference_type", "reference_id");

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_purchase_item_id_fkey" FOREIGN KEY ("purchase_item_id") REFERENCES "invoice_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "invoice_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_allocations" ADD CONSTRAINT "inventory_allocations_original_allocation_id_fkey" FOREIGN KEY ("original_allocation_id") REFERENCES "inventory_allocations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_batch_id_fkey" FOREIGN KEY ("inventory_batch_id") REFERENCES "inventory_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
