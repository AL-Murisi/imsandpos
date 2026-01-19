/*
  Warnings:

  - A unique constraint covering the columns `[company_id,type,voucher_number]` on the table `financial_transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "financial_transactions_company_id_type_voucher_number_key" ON "financial_transactions"("company_id", "type", "voucher_number");
