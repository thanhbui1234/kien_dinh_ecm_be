-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Project_isFeatured_status_idx" ON "Project"("isFeatured", "status");
