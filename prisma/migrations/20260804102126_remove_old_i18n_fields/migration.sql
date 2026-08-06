/*
  Warnings:

  - You are about to drop the column `description` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Category` table. All the data in the column will be lost.
  - You are about to drop the column `period` on the `CompanyHistoryEvent` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `CompanyHistoryEvent` table. All the data in the column will be lost.
  - You are about to drop the column `label` on the `CompanyInfo` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `CompanyInfo` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `CompanyLocation` table. All the data in the column will be lost.
  - You are about to drop the column `addressLabel` on the `CompanyLocation` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `CompanyLocation` table. All the data in the column will be lost.
  - You are about to drop the column `introHtml` on the `CompanyProfile` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `CompanySlogan` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `CompanySlogan` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `ContactSetting` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `ContactSetting` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `ContactSetting` table. All the data in the column will be lost.
  - You are about to drop the column `workingHours` on the `ContactSetting` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Facility` table. All the data in the column will be lost.
  - You are about to drop the column `address` on the `FooterSetting` table. All the data in the column will be lost.
  - You are about to drop the column `customerSupportLinks` on the `FooterSetting` table. All the data in the column will be lost.
  - You are about to drop the column `customerSupportTitle` on the `FooterSetting` table. All the data in the column will be lost.
  - You are about to drop the column `introText` on the `FooterSetting` table. All the data in the column will be lost.
  - You are about to drop the column `salary` on the `JobPost` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `JobPost` table. All the data in the column will be lost.
  - You are about to drop the column `title` on the `JobPost` table. All the data in the column will be lost.
  - You are about to drop the column `sections` on the `JobPostDetail` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `contentDetail` on the `ProductDetail` table. All the data in the column will be lost.
  - You are about to drop the column `features` on the `ProductDetail` table. All the data in the column will be lost.
  - You are about to drop the column `seoMeta` on the `ProductDetail` table. All the data in the column will be lost.
  - You are about to drop the column `specifications` on the `ProductDetail` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the column `contentDetail` on the `ProjectDetail` table. All the data in the column will be lost.

*/
-- =========================================================================
-- [DATA MIGRATION] COPY TOÀN BỘ DỮ LIỆU TỪ BẢNG CŨ SANG BẢNG TRANSLATION
-- Chạy ĐỒNG BỘ 100% trước khi DROP COLUMN bên dưới
-- =========================================================================

-- 1. Category
INSERT INTO "CategoryTranslation" ("id", "categoryId", "lang", "name", "slug")
SELECT gen_random_uuid(), "id", 'VI', "name", "slug" FROM "Category"
ON CONFLICT DO NOTHING;

-- 2. Product + ProductDetail
INSERT INTO "ProductTranslation" ("id", "productId", "lang", "name", "slug", "contentDetail", "specifications", "features", "seoTitle", "seoDescription")
SELECT 
  gen_random_uuid(), p."id", 'VI', p."name", p."slug", 
  COALESCE(pd."contentDetail", ''), pd."specifications", pd."features", p."name", p."name"
FROM "Product" p
LEFT JOIN "ProductDetail" pd ON p."id" = pd."productId"
ON CONFLICT DO NOTHING;

-- 3. Project + ProjectDetail
INSERT INTO "ProjectTranslation" ("id", "projectId", "lang", "name", "slug", "description", "contentDetail")
SELECT 
  gen_random_uuid(), p."id", 'VI', p."name", p."slug", p."description", COALESCE(pd."contentDetail", '')
FROM "Project" p
LEFT JOIN "ProjectDetail" pd ON p."id" = pd."projectId"
ON CONFLICT DO NOTHING;

-- 4. JobPost + JobPostDetail
INSERT INTO "JobPostTranslation" ("id", "jobId", "lang", "title", "slug", "salary", "sections")
SELECT 
  gen_random_uuid(), j."id", 'VI', j."title", j."slug", j."salary", jd."sections"
FROM "JobPost" j
LEFT JOIN "JobPostDetail" jd ON j."id" = jd."jobId"
ON CONFLICT DO NOTHING;

-- 5. CompanyInfo
INSERT INTO "CompanyInfoTranslation" ("id", "companyInfoId", "lang", "label", "value")
SELECT gen_random_uuid(), "id", 'VI', "label", "value" FROM "CompanyInfo"
ON CONFLICT DO NOTHING;

-- 6. Facility
INSERT INTO "FacilityTranslation" ("id", "facilityId", "lang", "name", "country", "address")
SELECT gen_random_uuid(), "id", 'VI', "name", "country", "address" FROM "Facility"
ON CONFLICT DO NOTHING;

-- 7. CompanySlogan
INSERT INTO "CompanySloganTranslation" ("id", "sloganId", "lang", "title", "description")
SELECT gen_random_uuid(), "id", 'VI', "title", "description" FROM "CompanySlogan"
ON CONFLICT DO NOTHING;

-- 8. Banner
INSERT INTO "BannerTranslation" ("id", "bannerId", "lang", "title", "description")
SELECT gen_random_uuid(), "id", 'VI', "title", "description" FROM "Banner"
ON CONFLICT DO NOTHING;

-- 9. CompanyProfile
INSERT INTO "CompanyProfileTranslation" ("id", "profileId", "lang", "introHtml")
SELECT gen_random_uuid(), "id", 'VI', "introHtml" FROM "CompanyProfile"
ON CONFLICT DO NOTHING;

-- 10. CompanyHistoryEvent
INSERT INTO "CompanyHistoryEventTranslation" ("id", "eventId", "lang", "period", "text")
SELECT gen_random_uuid(), "id", 'VI', "period", "text" FROM "CompanyHistoryEvent"
ON CONFLICT DO NOTHING;

-- 11. CompanyLocation
INSERT INTO "CompanyLocationTranslation" ("id", "locationId", "lang", "title", "addressLabel", "address")
SELECT gen_random_uuid(), "id", 'VI', "title", "addressLabel", "address" FROM "CompanyLocation"
ON CONFLICT DO NOTHING;

-- 12. ContactSetting
INSERT INTO "ContactSettingTranslation" ("id", "settingId", "lang", "title", "description", "address", "workingHours")
SELECT gen_random_uuid(), "id", 'VI', "title", "description", "address", "workingHours" FROM "ContactSetting"
ON CONFLICT DO NOTHING;

-- 13. FooterSetting
INSERT INTO "FooterSettingTranslation" ("id", "settingId", "lang", "introText", "address", "customerSupportTitle", "customerSupportLinks")
SELECT gen_random_uuid(), "id", 'VI', "introText", "address", "customerSupportTitle", "customerSupportLinks" FROM "FooterSetting"
ON CONFLICT DO NOTHING;

-- =========================================================================
-- KẾT THÚC DATA MIGRATION. BẮT ĐẦU XÓA CỘT CŨ (DROP COLUMN)
-- =========================================================================

-- DropIndex
DROP INDEX "Category_slug_key";

-- DropIndex
DROP INDEX "CompanyHistoryEvent_period_orderIndex_idx";

-- DropIndex
DROP INDEX "JobPost_slug_key";

-- DropIndex
DROP INDEX "Product_name_idx";

-- DropIndex
DROP INDEX "Product_slug_key";

-- DropIndex
DROP INDEX "Project_slug_key";

-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "description",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "Category" DROP COLUMN "name",
DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "CompanyHistoryEvent" DROP COLUMN "period",
DROP COLUMN "text";

-- AlterTable
ALTER TABLE "CompanyInfo" DROP COLUMN "label",
DROP COLUMN "value";

-- AlterTable
ALTER TABLE "CompanyLocation" DROP COLUMN "address",
DROP COLUMN "addressLabel",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "CompanyProfile" DROP COLUMN "introHtml";

-- AlterTable
ALTER TABLE "CompanySlogan" DROP COLUMN "description",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "ContactSetting" DROP COLUMN "address",
DROP COLUMN "description",
DROP COLUMN "title",
DROP COLUMN "workingHours";

-- AlterTable
ALTER TABLE "Facility" DROP COLUMN "address",
DROP COLUMN "country",
DROP COLUMN "name";

-- AlterTable
ALTER TABLE "FooterSetting" DROP COLUMN "address",
DROP COLUMN "customerSupportLinks",
DROP COLUMN "customerSupportTitle",
DROP COLUMN "introText";

-- AlterTable
ALTER TABLE "JobPost" DROP COLUMN "salary",
DROP COLUMN "slug",
DROP COLUMN "title";

-- AlterTable
ALTER TABLE "JobPostDetail" DROP COLUMN "sections";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "name",
DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "ProductDetail" DROP COLUMN "contentDetail",
DROP COLUMN "features",
DROP COLUMN "seoMeta",
DROP COLUMN "specifications";

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "description",
DROP COLUMN "name",
DROP COLUMN "slug";

-- AlterTable
ALTER TABLE "ProjectDetail" DROP COLUMN "contentDetail";

-- CreateIndex
CREATE INDEX "CompanyHistoryEvent_year_orderIndex_idx" ON "CompanyHistoryEvent"("year", "orderIndex");
