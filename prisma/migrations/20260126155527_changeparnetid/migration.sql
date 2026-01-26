-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_parent_id_fkey";

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_company_id_parent_id_fkey" FOREIGN KEY ("company_id", "parent_id") REFERENCES "accounts"("company_id", "account_code") ON DELETE RESTRICT ON UPDATE CASCADE;
