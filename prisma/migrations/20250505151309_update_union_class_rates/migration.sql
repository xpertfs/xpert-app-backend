/*
  Warnings:

  - The `unionClassId` column on the `Employee` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `UnionClass` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `code` on the `UnionClass` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `UnionClass` table. All the data in the column will be lost.
  - The `id` column on the `UnionClass` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `UnionClassBaseRate` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `rate` on the `UnionClassBaseRate` table. All the data in the column will be lost.
  - The `id` column on the `UnionClassBaseRate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The primary key for the `UnionClassCustomRate` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `percentage` on the `UnionClassCustomRate` table. All the data in the column will be lost.
  - The `id` column on the `UnionClassCustomRate` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `rate` on the `UnionClassCustomRate` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to drop the `UnionClassDuesRate` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `benefitsRate` to the `UnionClassBaseRate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `overtimeRate` to the `UnionClassBaseRate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `regularRate` to the `UnionClassBaseRate` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `unionClassId` on the `UnionClassBaseRate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `unionClassId` on the `UnionClassCustomRate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_unionClassId_fkey";

-- DropForeignKey
ALTER TABLE "UnionClassBaseRate" DROP CONSTRAINT "UnionClassBaseRate_unionClassId_fkey";

-- DropForeignKey
ALTER TABLE "UnionClassCustomRate" DROP CONSTRAINT "UnionClassCustomRate_unionClassId_fkey";

-- DropForeignKey
ALTER TABLE "UnionClassDuesRate" DROP CONSTRAINT "UnionClassDuesRate_unionClassId_fkey";

-- DropIndex
DROP INDEX "UnionClass_companyId_code_key";

-- First, add new columns with default values
ALTER TABLE "UnionClassBaseRate" 
ADD COLUMN "regularRate" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "overtimeRate" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "benefitsRate" DOUBLE PRECISION DEFAULT 0;

-- Update existing data before dropping the rate column
UPDATE "UnionClassBaseRate"
SET 
  "regularRate" = CAST("rate" AS DOUBLE PRECISION),
  "overtimeRate" = CAST("rate" AS DOUBLE PRECISION) * 1.5,
  "benefitsRate" = CAST("rate" AS DOUBLE PRECISION) * 0.4;

-- Now make the columns required
ALTER TABLE "UnionClassBaseRate" 
ALTER COLUMN "regularRate" DROP DEFAULT,
ALTER COLUMN "overtimeRate" DROP DEFAULT,
ALTER COLUMN "benefitsRate" DROP DEFAULT,
ALTER COLUMN "regularRate" SET NOT NULL,
ALTER COLUMN "overtimeRate" SET NOT NULL,
ALTER COLUMN "benefitsRate" SET NOT NULL;

-- Handle UnionClass ID changes
-- First, create a temporary table to store the mapping
CREATE TEMPORARY TABLE "temp_union_class_mapping" (
  "old_id" TEXT,
  "new_id" INTEGER
);

-- Insert existing IDs into the mapping table
INSERT INTO "temp_union_class_mapping" ("old_id")
SELECT "id" FROM "UnionClass";

-- Update the mapping with new IDs
WITH numbered_rows AS (
  SELECT "old_id", ROW_NUMBER() OVER (ORDER BY "old_id") as "new_id"
  FROM "temp_union_class_mapping"
)
UPDATE "temp_union_class_mapping" m
SET "new_id" = nr."new_id"
FROM numbered_rows nr
WHERE m."old_id" = nr."old_id";

-- Create a temporary column in Employee table for the new ID
ALTER TABLE "Employee" ADD COLUMN "new_unionClassId" INTEGER;

-- Update the new column with mapped IDs
UPDATE "Employee" e
SET "new_unionClassId" = m."new_id"
FROM "temp_union_class_mapping" m
WHERE e."unionClassId" = m."old_id";

-- Drop the old column and rename the new one
ALTER TABLE "Employee" DROP COLUMN "unionClassId";
ALTER TABLE "Employee" RENAME COLUMN "new_unionClassId" TO "unionClassId";

-- Create temporary columns for UnionClassBaseRate
ALTER TABLE "UnionClassBaseRate" ADD COLUMN "new_unionClassId" INTEGER;
ALTER TABLE "UnionClassBaseRate" ADD COLUMN "new_id" SERIAL;

-- Update the new columns with mapped IDs
UPDATE "UnionClassBaseRate" r
SET "new_unionClassId" = m."new_id"
FROM "temp_union_class_mapping" m
WHERE r."unionClassId" = m."old_id";

-- Create temporary columns for UnionClassCustomRate
ALTER TABLE "UnionClassCustomRate" ADD COLUMN "new_unionClassId" INTEGER;
ALTER TABLE "UnionClassCustomRate" ADD COLUMN "new_id" SERIAL;

-- Update the new columns with mapped IDs
UPDATE "UnionClassCustomRate" r
SET "new_unionClassId" = m."new_id"
FROM "temp_union_class_mapping" m
WHERE r."unionClassId" = m."old_id";

-- Now we can safely change the ID columns
ALTER TABLE "UnionClass" 
DROP CONSTRAINT "UnionClass_pkey",
DROP COLUMN "code",
DROP COLUMN "description",
DROP COLUMN "id",
ADD COLUMN "id" SERIAL NOT NULL,
ADD CONSTRAINT "UnionClass_pkey" PRIMARY KEY ("id");

-- Rebuild UnionClassBaseRate table
ALTER TABLE "UnionClassBaseRate" DROP CONSTRAINT "UnionClassBaseRate_pkey";
ALTER TABLE "UnionClassBaseRate" DROP COLUMN "rate";
ALTER TABLE "UnionClassBaseRate" DROP COLUMN "id";
ALTER TABLE "UnionClassBaseRate" DROP COLUMN "unionClassId";
ALTER TABLE "UnionClassBaseRate" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "UnionClassBaseRate" RENAME COLUMN "new_unionClassId" TO "unionClassId";
ALTER TABLE "UnionClassBaseRate" ADD CONSTRAINT "UnionClassBaseRate_pkey" PRIMARY KEY ("id");

-- Rebuild UnionClassCustomRate table
ALTER TABLE "UnionClassCustomRate" DROP CONSTRAINT "UnionClassCustomRate_pkey";
ALTER TABLE "UnionClassCustomRate" DROP COLUMN "percentage";
ALTER TABLE "UnionClassCustomRate" DROP COLUMN "id";
ALTER TABLE "UnionClassCustomRate" DROP COLUMN "unionClassId";
ALTER TABLE "UnionClassCustomRate" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "UnionClassCustomRate" RENAME COLUMN "new_unionClassId" TO "unionClassId";
ALTER TABLE "UnionClassCustomRate" ADD COLUMN "description" TEXT;
ALTER TABLE "UnionClassCustomRate" ALTER COLUMN "rate" SET DATA TYPE DOUBLE PRECISION;
ALTER TABLE "UnionClassCustomRate" ADD CONSTRAINT "UnionClassCustomRate_pkey" PRIMARY KEY ("id");

-- Drop the temporary table
DROP TABLE "temp_union_class_mapping";

-- Drop the UnionClassDuesRate table
DROP TABLE "UnionClassDuesRate";

-- Recreate foreign key constraints
ALTER TABLE "Employee" 
ADD CONSTRAINT "Employee_unionClassId_fkey" 
FOREIGN KEY ("unionClassId") REFERENCES "UnionClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UnionClassBaseRate" 
ADD CONSTRAINT "UnionClassBaseRate_unionClassId_fkey" 
FOREIGN KEY ("unionClassId") REFERENCES "UnionClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UnionClassCustomRate" 
ADD CONSTRAINT "UnionClassCustomRate_unionClassId_fkey" 
FOREIGN KEY ("unionClassId") REFERENCES "UnionClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create indexes
CREATE INDEX "UnionClassBaseRate_unionClassId_effectiveDate_idx" ON "UnionClassBaseRate"("unionClassId", "effectiveDate");
CREATE INDEX "UnionClassCustomRate_unionClassId_effectiveDate_idx" ON "UnionClassCustomRate"("unionClassId", "effectiveDate");
