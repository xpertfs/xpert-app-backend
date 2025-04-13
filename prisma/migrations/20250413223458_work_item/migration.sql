/*
  Warnings:

  - You are about to drop the `ProjectWorkItem` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[projectId,code]` on the table `WorkItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `projectId` to the `WorkItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unitPrice` to the `WorkItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ProjectWorkItem" DROP CONSTRAINT "ProjectWorkItem_projectId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectWorkItem" DROP CONSTRAINT "ProjectWorkItem_workItemId_fkey";

-- DropForeignKey
ALTER TABLE "WorkItemQuantity" DROP CONSTRAINT "WorkItemQuantity_workItemId_fkey";

-- AlterTable
ALTER TABLE "WorkItem" ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "unitPrice" DECIMAL(10,2) NOT NULL;

-- DropTable
DROP TABLE "ProjectWorkItem";

-- CreateIndex
CREATE UNIQUE INDEX "WorkItem_projectId_code_key" ON "WorkItem"("projectId", "code");

-- AddForeignKey
ALTER TABLE "WorkItem" ADD CONSTRAINT "WorkItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkItemQuantity" ADD CONSTRAINT "WorkItemQuantity_workItemId_fkey" FOREIGN KEY ("workItemId") REFERENCES "WorkItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
