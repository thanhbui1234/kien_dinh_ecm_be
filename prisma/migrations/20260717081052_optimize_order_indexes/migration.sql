-- CreateTable
CREATE TABLE "CompanyInfo" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CompanyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Facility" (
    "id" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "imageUrl" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Facility_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyInfo_orderIndex_idx" ON "CompanyInfo"("orderIndex");

-- CreateIndex
CREATE INDEX "Facility_orderIndex_idx" ON "Facility"("orderIndex");

-- CreateIndex
CREATE INDEX "Category_orderIndex_idx" ON "Category"("orderIndex");

-- CreateIndex
CREATE INDEX "CompanySlogan_orderIndex_idx" ON "CompanySlogan"("orderIndex");

-- CreateIndex
CREATE INDEX "CompanyTimeline_orderIndex_idx" ON "CompanyTimeline"("orderIndex");
