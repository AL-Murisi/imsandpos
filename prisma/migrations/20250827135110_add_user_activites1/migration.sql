/*
  Warnings:

  - You are about to drop the `activityLogs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "activityLogs" DROP CONSTRAINT "activityLogs_user_id_fkey";

-- DropTable
DROP TABLE "activityLogs";

-- CreateTable
CREATE TABLE "activitylogs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activitylogs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "activitylogs" ADD CONSTRAINT "activitylogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
