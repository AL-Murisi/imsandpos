ALTER TABLE "customers"
ADD COLUMN "user_id" TEXT;

CREATE INDEX "customers_user_id_idx" ON "customers"("user_id");

ALTER TABLE "customers"
ADD CONSTRAINT "customers_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
