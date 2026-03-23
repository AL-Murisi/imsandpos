-- DropForeignKey
ALTER TABLE "points_of_sale" DROP CONSTRAINT "points_of_sale_company_id_fkey";

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "base_amount" DECIMAL(15,2),
ADD COLUMN     "currency_code" VARCHAR(3),
ADD COLUMN     "exchange_rate" DECIMAL(18,6),
ADD COLUMN     "foreign_amount" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "financial_transactions" ADD COLUMN     "base_amount" DECIMAL(15,2),
ADD COLUMN     "foreign_amount" DECIMAL(15,2);

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "base_amount" DECIMAL(15,2),
ADD COLUMN     "currency_code" VARCHAR(3),
ADD COLUMN     "exchange_rate" DECIMAL(18,6),
ADD COLUMN     "foreign_amount" DECIMAL(15,2);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'CUSTOM',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "maxBranches" INTEGER,
    "maxCashiers" INTEGER,
    "maxWarehouses" INTEGER,
    "maxUsers" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "currencies" (
    "code" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "symbol" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "company_currencies" (
    "company_id" TEXT NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL,
    "is_base" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_currencies_pkey" PRIMARY KEY ("company_id","currency_code")
);

-- CreateTable
CREATE TABLE "user_invites" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_headers" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "entry_number" TEXT NOT NULL,
    "description" TEXT,
    "branchId" TEXT,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "entry_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'POSTED',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "header_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency_code" VARCHAR(3),
    "foreign_amount" DECIMAL(15,2),
    "exchange_rate" DECIMAL(18,6),
    "base_amount" DECIMAL(15,2),
    "memo" TEXT,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_company_id_idx" ON "subscriptions"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "company_currencies_company_id_is_base_key" ON "company_currencies"("company_id", "is_base");

-- CreateIndex
CREATE UNIQUE INDEX "user_invites_token_key" ON "user_invites"("token");

-- CreateIndex
CREATE INDEX "user_invites_company_id_idx" ON "user_invites"("company_id");

-- CreateIndex
CREATE INDEX "user_invites_user_id_idx" ON "user_invites"("user_id");

-- CreateIndex
CREATE INDEX "journal_headers_company_id_idx" ON "journal_headers"("company_id");

-- CreateIndex
CREATE INDEX "journal_headers_reference_type_reference_id_idx" ON "journal_headers"("reference_type", "reference_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_headers_company_id_entry_number_key" ON "journal_headers"("company_id", "entry_number");

-- CreateIndex
CREATE INDEX "journal_lines_company_id_idx" ON "journal_lines"("company_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_currencies" ADD CONSTRAINT "company_currencies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_currencies" ADD CONSTRAINT "company_currencies_currency_code_fkey" FOREIGN KEY ("currency_code") REFERENCES "currencies"("code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_invites" ADD CONSTRAINT "user_invites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "points_of_sale" ADD CONSTRAINT "points_of_sale_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_headers" ADD CONSTRAINT "journal_headers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_headers" ADD CONSTRAINT "journal_headers_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "points_of_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_headers" ADD CONSTRAINT "journal_headers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_header_id_fkey" FOREIGN KEY ("header_id") REFERENCES "journal_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
