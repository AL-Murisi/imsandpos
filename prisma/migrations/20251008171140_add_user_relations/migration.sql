-- DropIndex
DROP INDEX "inventory_updated_at_idx";

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "address" TEXT,
    "taxNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "footerMsg" TEXT,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_phone_number_idx" ON "customers"("phone_number");

-- CreateIndex
CREATE INDEX "inventory_product_id_idx" ON "inventory"("product_id");

-- CreateIndex
CREATE INDEX "inventory_location_idx" ON "inventory"("location");

-- CreateIndex
CREATE INDEX "inventory_created_at_idx" ON "inventory"("created_at");

-- CreateIndex
CREATE INDEX "sales_payment_status_idx" ON "sales"("payment_status");

-- CreateIndex
CREATE INDEX "sales_customer_id_payment_status_idx" ON "sales"("customer_id", "payment_status");

-- CreateIndex
CREATE INDEX "sales_customer_id_sale_date_idx" ON "sales"("customer_id", "sale_date");

-- CreateIndex
CREATE INDEX "stock_movements_reason_idx" ON "stock_movements"("reason");

-- CreateIndex
CREATE INDEX "users_name_idx" ON "users"("name");

-- CreateIndex
CREATE INDEX "users_phone_number_idx" ON "users"("phone_number");
