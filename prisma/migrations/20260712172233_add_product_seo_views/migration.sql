-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductDetail" ADD COLUMN     "seoMeta" JSONB;
