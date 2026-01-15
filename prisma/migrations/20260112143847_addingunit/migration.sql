/*
  Warnings:

  - Added the required column `unit` to the `invoice_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "invoice_items" ADD COLUMN     "unit" TEXT NOT NULL;
