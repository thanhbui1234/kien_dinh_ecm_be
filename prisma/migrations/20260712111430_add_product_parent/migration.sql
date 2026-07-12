-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "parentId" TEXT;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
