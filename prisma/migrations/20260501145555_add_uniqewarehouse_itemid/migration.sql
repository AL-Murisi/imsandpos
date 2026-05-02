/*
  Warnings:

  - A unique constraint covering the columns `[company_id,product_id,warehouse_id]` on the table `inventory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "inventory_company_id_product_id_warehouse_id_key" ON "inventory"("company_id", "product_id", "warehouse_id");
