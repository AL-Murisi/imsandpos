-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "currency_code" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "journal_entries" ALTER COLUMN "currency_code" DROP DEFAULT;
