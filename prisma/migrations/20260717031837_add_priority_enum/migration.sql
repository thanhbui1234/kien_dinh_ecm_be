-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- AlterTable
ALTER TABLE "ContactRequest" ADD COLUMN     "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM';
