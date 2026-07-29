-- CreateTable
CREATE TABLE "CompanyLocation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "addressLabel" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "directionsUrl" TEXT,
    "mapUrl" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyLocation_orderIndex_idx" ON "CompanyLocation"("orderIndex");
