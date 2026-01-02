/*
  Warnings:

  - You are about to drop the column `is_initial` on the `payments` table. All the data in the column will be lost.
  - You are about to drop the column `original_sale_id` on the `sales` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "sales" DROP CONSTRAINT "sales_original_sale_id_fkey";

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "base_currency" VARCHAR(3) NOT NULL DEFAULT 'YER';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "preferred_currency" VARCHAR(3) DEFAULT 'YER';

-- AlterTable
ALTER TABLE "journal_entries" ADD COLUMN     "base_amount" DECIMAL(15,2),
ADD COLUMN     "exchange_rate" DECIMAL(18,6),
ADD COLUMN     "foreign_amount" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "is_initial",
ADD COLUMN     "currency_code" VARCHAR(3) NOT NULL DEFAULT 'YER',
ADD COLUMN     "exchange_rate" DECIMAL(18,6);

-- AlterTable
ALTER TABLE "purchases" ADD COLUMN     "currency_code" VARCHAR(3) NOT NULL DEFAULT 'YER',
ADD COLUMN     "exchange_rate" DECIMAL(18,6);

-- AlterTable
ALTER TABLE "sales" DROP COLUMN "original_sale_id",
ADD COLUMN     "currency_code" VARCHAR(3) NOT NULL DEFAULT 'YER',
ADD COLUMN     "exchange_rate" DECIMAL(18,6);

-- AlterTable
ALTER TABLE "supplier_payments" ADD COLUMN     "currency_code" VARCHAR(3) NOT NULL DEFAULT 'YER',
ADD COLUMN     "exchange_rate" DECIMAL(18,6);

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "preferred_currency" VARCHAR(3) DEFAULT 'YER';

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "from_currency" VARCHAR(3) NOT NULL,
    "to_currency" VARCHAR(3) NOT NULL,
    "rate" DECIMAL(18,6) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_rates_company_id_idx" ON "exchange_rates"("company_id");

-- CreateIndex
CREATE INDEX "exchange_rates_date_idx" ON "exchange_rates"("date");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_company_id_from_currency_to_currency_date_key" ON "exchange_rates"("company_id", "from_currency", "to_currency", "date");

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
