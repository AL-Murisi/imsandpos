-- AlterTable
ALTER TABLE "users" ADD COLUMN     "branch_id" TEXT;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "points_of_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
