-- AlterTable
ALTER TABLE "ContactRequest" ADD COLUMN     "targetJobId" TEXT;

-- AddForeignKey
ALTER TABLE "ContactRequest" ADD CONSTRAINT "ContactRequest_targetJobId_fkey" FOREIGN KEY ("targetJobId") REFERENCES "JobPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;
