-- AlterTable ProductDetail
ALTER TABLE "ProductDetail" ADD COLUMN "videoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable ProjectDetail
ALTER TABLE "ProjectDetail" ADD COLUMN "videoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
