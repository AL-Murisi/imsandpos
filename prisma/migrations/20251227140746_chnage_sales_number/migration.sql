/*
  Warnings:

  - A unique constraint covering the columns `[company_id,sale_number]` on the table `sales` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "sales_sale_number_key";

-- CreateIndex
CREATE INDEX "idx_company_sale_number" ON "sales"("company_id", "sale_number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_company_id_sale_number_key" ON "sales"("company_id", "sale_number");
