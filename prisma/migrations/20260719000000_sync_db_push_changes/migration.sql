-- Sync migration: captures all changes applied via `prisma db push` that were missing from migration history.

-- 1. Add images column to ProjectDetail
ALTER TABLE "ProjectDetail" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- 2. Create CompanyProfile (singleton)
CREATE TABLE IF NOT EXISTS "CompanyProfile" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "introHtml" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- 3. Create CompanyHistoryEvent
CREATE TABLE IF NOT EXISTS "CompanyHistoryEvent" (
    "id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "year" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CompanyHistoryEvent_pkey" PRIMARY KEY ("id")
);

-- 4. Index on CompanyHistoryEvent
CREATE INDEX IF NOT EXISTS "CompanyHistoryEvent_period_orderIndex_idx" ON "CompanyHistoryEvent"("period", "orderIndex");
