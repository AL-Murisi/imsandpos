-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "branchId" TEXT;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "points_of_sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
