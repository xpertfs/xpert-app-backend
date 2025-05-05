/*
  Warnings:

  - Made the column `unionClassId` on table `UnionClassBaseRate` required. This step will fail if there are existing NULL values in that column.
  - Made the column `unionClassId` on table `UnionClassCustomRate` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UnionClassBaseRate" ALTER COLUMN "unionClassId" SET NOT NULL;

-- AlterTable
ALTER TABLE "UnionClassCustomRate" ALTER COLUMN "unionClassId" SET NOT NULL;
