/*
  Warnings:

  - You are about to drop the `currencyAccounts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `purchase_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `purchases` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sale_items` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `sales` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `supplier_payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "currencyAccounts" DROP CONSTRAINT "currencyAccounts_accountId_fkey";

-- DropForeignKey
ALTER TABLE "currencyAccounts" DROP CONSTRAINT "currencyAccounts_bankId_fkey";

-- DropForeignKey
ALTER TABLE "currencyAccounts" DROP CONSTRAINT "currencyAccounts_company_id_fkey";

-- DropForeignKey
ALTER TABLE "currencyAccounts" DROP CONSTRAINT "currencyAccounts_customerId_fkey";

-- DropForeignKey
ALTER TABLE "currencyAccounts" DROP CONSTRAINT "currencyAccounts_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "financial_transactions" DROP CONSTRAINT "financial_transactions_purchase_id_fkey";

-- DropForeignKey
ALTER TABLE "financial_transactions" DROP CONSTRAINT "financial_transactions_sale_id_fkey";

-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_lastPurchaseId_fkey";

-- DropForeignKey
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_lastPurchaseItemId_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_cashier_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_company_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "payments" DROP CONSTRAINT "payments_sale_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_items" DROP CONSTRAINT "purchase_items_company_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_items" DROP CONSTRAINT "purchase_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "purchase_items" DROP CONSTRAINT "purchase_items_purchase_id_fkey";

-- DropForeignKey
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_company_id_fkey";

-- DropForeignKey
ALTER TABLE "purchases" DROP CONSTRAINT "purchases_supplier_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_company_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_product_id_fkey";

-- DropForeignKey
ALTER TABLE "sale_items" DROP CONSTRAINT "sale_items_sale_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_cashier_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_company_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_customer_id_fkey";

-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_point_of_sale_id_fkey";

-- DropForeignKey
ALTER TABLE "supplier_payments" DROP CONSTRAINT "supplier_payments_company_id_fkey";

-- DropForeignKey
ALTER TABLE "supplier_payments" DROP CONSTRAINT "supplier_payments_purchase_id_fkey";

-- DropForeignKey
ALTER TABLE "supplier_payments" DROP CONSTRAINT "supplier_payments_supplier_id_fkey";

-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "currency_code" DROP NOT NULL;

-- AlterTable
ALTER TABLE "banks" ADD COLUMN     "allowed_currencies" JSONB;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "allowed_currencies" JSONB;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "allowed_currencies" JSONB;

-- DropTable
DROP TABLE "currencyAccounts";

-- DropTable
DROP TABLE "payments";

-- DropTable
DROP TABLE "purchase_items";

-- DropTable
DROP TABLE "purchases";

-- DropTable
DROP TABLE "sale_items";

-- DropTable
DROP TABLE "sales";

-- DropTable
DROP TABLE "supplier_payments";

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
