/*
  Warnings:

  - The primary key for the `JobPostDetail` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `description` on the `JobPostDetail` table. All the data in the column will be lost.
  - You are about to drop the column `requirement` on the `JobPostDetail` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[jobId]` on the table `JobPostDetail` will be added. If there are existing duplicate values, this will fail.
  - The required column `id` was added to the `JobPostDetail` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `sections` to the `JobPostDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `JobPostDetail` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "JobPostDetail" DROP CONSTRAINT "JobPostDetail_pkey",
DROP COLUMN "description",
DROP COLUMN "requirement",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "id" TEXT NOT NULL,
ADD COLUMN     "sections" JSONB NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "JobPostDetail_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "JobPostDetail_jobId_key" ON "JobPostDetail"("jobId");
