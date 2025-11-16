-- DropIndex
DROP INDEX "inventory_company_id_idx";

-- DropIndex
DROP INDEX "inventory_created_at_idx";

-- DropIndex
DROP INDEX "inventory_location_idx";

-- DropIndex
DROP INDEX "inventory_product_id_idx";

-- DropIndex
DROP INDEX "inventory_status_idx";

-- DropIndex
DROP INDEX "inventory_warehouse_id_idx";

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "lastPurchaseId" TEXT,
ADD COLUMN     "lastPurchaseItemId" TEXT;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_lastPurchaseId_fkey" FOREIGN KEY ("lastPurchaseId") REFERENCES "purchases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_lastPurchaseItemId_fkey" FOREIGN KEY ("lastPurchaseItemId") REFERENCES "purchase_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
