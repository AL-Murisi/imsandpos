CREATE TABLE "pushDeviceToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "userId" TEXT,
    "role" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'fcm',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pushDeviceToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pushDeviceToken_token_key" ON "pushDeviceToken"("token");
CREATE INDEX "pushDeviceToken_company_id_idx" ON "pushDeviceToken"("company_id");
CREATE INDEX "pushDeviceToken_userId_idx" ON "pushDeviceToken"("userId");
CREATE INDEX "pushDeviceToken_role_idx" ON "pushDeviceToken"("role");

ALTER TABLE "pushDeviceToken"
ADD CONSTRAINT "pushDeviceToken_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
