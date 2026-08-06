-- CreateEnum
CREATE TYPE "Language" AS ENUM ('VI', 'EN');

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "lang" "Language" NOT NULL DEFAULT 'VI',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTranslation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lang" "Language" NOT NULL DEFAULT 'VI',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contentDetail" TEXT,
    "specifications" JSONB,
    "features" JSONB,
    "seoTitle" TEXT,
    "seoDescription" TEXT,

    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectTranslation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lang" "Language" NOT NULL DEFAULT 'VI',
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "contentDetail" TEXT,

    CONSTRAINT "ProjectTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPostTranslation" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "lang" "Language" NOT NULL DEFAULT 'VI',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "salary" TEXT NOT NULL DEFAULT 'Cạnh tranh',
    "sections" JSONB,

    CONSTRAINT "JobPostTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CategoryTranslation_lang_slug_idx" ON "CategoryTranslation"("lang", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_lang_key" ON "CategoryTranslation"("categoryId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_lang_slug_key" ON "CategoryTranslation"("lang", "slug");

-- CreateIndex
CREATE INDEX "ProductTranslation_lang_slug_idx" ON "ProductTranslation"("lang", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTranslation_productId_lang_key" ON "ProductTranslation"("productId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTranslation_lang_slug_key" ON "ProductTranslation"("lang", "slug");

-- CreateIndex
CREATE INDEX "ProjectTranslation_lang_slug_idx" ON "ProjectTranslation"("lang", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTranslation_projectId_lang_key" ON "ProjectTranslation"("projectId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectTranslation_lang_slug_key" ON "ProjectTranslation"("lang", "slug");

-- CreateIndex
CREATE INDEX "JobPostTranslation_lang_slug_idx" ON "JobPostTranslation"("lang", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "JobPostTranslation_jobId_lang_key" ON "JobPostTranslation"("jobId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "JobPostTranslation_lang_slug_key" ON "JobPostTranslation"("lang", "slug");

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectTranslation" ADD CONSTRAINT "ProjectTranslation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPostTranslation" ADD CONSTRAINT "JobPostTranslation_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
