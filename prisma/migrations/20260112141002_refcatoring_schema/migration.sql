/*
  Warnings:

  - You are about to drop the column `type` on the `invoices` table. All the data in the column will be lost.
  - You are about to drop the column `manager_id` on the `points_of_sale` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[company_id,invoice_number,sale_type]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `companyId` to the `invoice_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cashier_id` to the `invoices` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "points_of_sale" DROP CONSTRAINT "points_of_sale_company_id_fkey";

-- DropForeignKey
ALTER TABLE "points_of_sale" DROP CONSTRAINT "points_of_sale_manager_id_fkey";

-- DropIndex
DROP INDEX "invoices_company_id_invoice_number_type_key";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "maxBranches" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "maxCashiers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "plan" TEXT NOT NULL DEFAULT 'STARTER';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "financial_transactions" ADD COLUMN     "branchId" TEXT;

-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "companyId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "invoices" DROP COLUMN "type",
ADD COLUMN     "branchId" TEXT,
ADD COLUMN     "cashier_id" TEXT NOT NULL,
ADD COLUMN     "sale_type" "InvoiceType" NOT NULL DEFAULT 'SALE',
ADD COLUMN     "warehouseId" TEXT;

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "points_of_sale" DROP COLUMN "manager_id",
ADD COLUMN     "managerId" TEXT,
ALTER COLUMN "name" SET DATA TYPE TEXT,
ALTER COLUMN "location" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN     "branchId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_company_id_invoice_number_sale_type_key" ON "invoices"("company_id", "invoice_number", "sale_type");

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "points_of_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "points_of_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "points_of_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "points_of_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "points_of_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_of_sale" ADD CONSTRAINT "points_of_sale_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_of_sale" ADD CONSTRAINT "points_of_sale_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "points_of_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
