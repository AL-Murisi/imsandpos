/*
  Warnings:

  - You are about to drop the `ActivityLogs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ActivityLogs" DROP CONSTRAINT "ActivityLogs_user_id_fkey";

-- DropTable
DROP TABLE "ActivityLogs";

-- CreateTable
CREATE TABLE "activityLogs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activityLogs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "activityLogs" ADD CONSTRAINT "activityLogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
