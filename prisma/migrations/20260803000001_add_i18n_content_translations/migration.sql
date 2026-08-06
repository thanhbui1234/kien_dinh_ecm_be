-- CompanyInfoTranslation
CREATE TABLE "CompanyInfoTranslation" (
    "id"            TEXT NOT NULL,
    "companyInfoId" TEXT NOT NULL,
    "lang"          "Language" NOT NULL DEFAULT 'VI',
    "label"         TEXT NOT NULL,
    "value"         TEXT NOT NULL,
    CONSTRAINT "CompanyInfoTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CompanyInfoTranslation_companyInfoId_lang_key" ON "CompanyInfoTranslation"("companyInfoId", "lang");
CREATE INDEX "CompanyInfoTranslation_lang_idx" ON "CompanyInfoTranslation"("lang");
ALTER TABLE "CompanyInfoTranslation" ADD CONSTRAINT "CompanyInfoTranslation_companyInfoId_fkey" FOREIGN KEY ("companyInfoId") REFERENCES "CompanyInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FacilityTranslation
CREATE TABLE "FacilityTranslation" (
    "id"         TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "lang"       "Language" NOT NULL DEFAULT 'VI',
    "name"       TEXT NOT NULL,
    "country"    TEXT NOT NULL,
    "address"    TEXT NOT NULL,
    CONSTRAINT "FacilityTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FacilityTranslation_facilityId_lang_key" ON "FacilityTranslation"("facilityId", "lang");
CREATE INDEX "FacilityTranslation_lang_idx" ON "FacilityTranslation"("lang");
ALTER TABLE "FacilityTranslation" ADD CONSTRAINT "FacilityTranslation_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CompanySloganTranslation
CREATE TABLE "CompanySloganTranslation" (
    "id"          TEXT NOT NULL,
    "sloganId"    TEXT NOT NULL,
    "lang"        "Language" NOT NULL DEFAULT 'VI',
    "title"       TEXT NOT NULL,
    "description" TEXT,
    CONSTRAINT "CompanySloganTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CompanySloganTranslation_sloganId_lang_key" ON "CompanySloganTranslation"("sloganId", "lang");
CREATE INDEX "CompanySloganTranslation_lang_idx" ON "CompanySloganTranslation"("lang");
ALTER TABLE "CompanySloganTranslation" ADD CONSTRAINT "CompanySloganTranslation_sloganId_fkey" FOREIGN KEY ("sloganId") REFERENCES "CompanySlogan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- BannerTranslation
CREATE TABLE "BannerTranslation" (
    "id"          TEXT NOT NULL,
    "bannerId"    TEXT NOT NULL,
    "lang"        "Language" NOT NULL DEFAULT 'VI',
    "title"       TEXT,
    "description" TEXT,
    CONSTRAINT "BannerTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BannerTranslation_bannerId_lang_key" ON "BannerTranslation"("bannerId", "lang");
CREATE INDEX "BannerTranslation_lang_idx" ON "BannerTranslation"("lang");
ALTER TABLE "BannerTranslation" ADD CONSTRAINT "BannerTranslation_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "Banner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CompanyProfileTranslation
CREATE TABLE "CompanyProfileTranslation" (
    "id"        TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "lang"      "Language" NOT NULL DEFAULT 'VI',
    "introHtml" TEXT NOT NULL,
    CONSTRAINT "CompanyProfileTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CompanyProfileTranslation_profileId_lang_key" ON "CompanyProfileTranslation"("profileId", "lang");
CREATE INDEX "CompanyProfileTranslation_lang_idx" ON "CompanyProfileTranslation"("lang");
ALTER TABLE "CompanyProfileTranslation" ADD CONSTRAINT "CompanyProfileTranslation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CompanyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CompanyHistoryEventTranslation
CREATE TABLE "CompanyHistoryEventTranslation" (
    "id"      TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "lang"    "Language" NOT NULL DEFAULT 'VI',
    "period"  TEXT NOT NULL,
    "text"    TEXT NOT NULL,
    CONSTRAINT "CompanyHistoryEventTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CompanyHistoryEventTranslation_eventId_lang_key" ON "CompanyHistoryEventTranslation"("eventId", "lang");
CREATE INDEX "CompanyHistoryEventTranslation_lang_idx" ON "CompanyHistoryEventTranslation"("lang");
ALTER TABLE "CompanyHistoryEventTranslation" ADD CONSTRAINT "CompanyHistoryEventTranslation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CompanyHistoryEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CompanyLocationTranslation
CREATE TABLE "CompanyLocationTranslation" (
    "id"           TEXT NOT NULL,
    "locationId"   TEXT NOT NULL,
    "lang"         "Language" NOT NULL DEFAULT 'VI',
    "title"        TEXT NOT NULL,
    "addressLabel" TEXT NOT NULL,
    "address"      TEXT NOT NULL,
    CONSTRAINT "CompanyLocationTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CompanyLocationTranslation_locationId_lang_key" ON "CompanyLocationTranslation"("locationId", "lang");
CREATE INDEX "CompanyLocationTranslation_lang_idx" ON "CompanyLocationTranslation"("lang");
ALTER TABLE "CompanyLocationTranslation" ADD CONSTRAINT "CompanyLocationTranslation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CompanyLocation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ContactSettingTranslation
CREATE TABLE "ContactSettingTranslation" (
    "id"           TEXT NOT NULL,
    "settingId"    TEXT NOT NULL,
    "lang"         "Language" NOT NULL DEFAULT 'VI',
    "title"        TEXT NOT NULL,
    "description"  TEXT NOT NULL,
    "address"      TEXT,
    "workingHours" TEXT,
    CONSTRAINT "ContactSettingTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContactSettingTranslation_settingId_lang_key" ON "ContactSettingTranslation"("settingId", "lang");
CREATE INDEX "ContactSettingTranslation_lang_idx" ON "ContactSettingTranslation"("lang");
ALTER TABLE "ContactSettingTranslation" ADD CONSTRAINT "ContactSettingTranslation_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "ContactSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- FooterSettingTranslation
CREATE TABLE "FooterSettingTranslation" (
    "id"                   TEXT NOT NULL,
    "settingId"            TEXT NOT NULL,
    "lang"                 "Language" NOT NULL DEFAULT 'VI',
    "introText"            TEXT NOT NULL,
    "address"              TEXT,
    "customerSupportTitle" TEXT,
    "customerSupportLinks" JSONB,
    CONSTRAINT "FooterSettingTranslation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FooterSettingTranslation_settingId_lang_key" ON "FooterSettingTranslation"("settingId", "lang");
CREATE INDEX "FooterSettingTranslation_lang_idx" ON "FooterSettingTranslation"("lang");
ALTER TABLE "FooterSettingTranslation" ADD CONSTRAINT "FooterSettingTranslation_settingId_fkey" FOREIGN KEY ("settingId") REFERENCES "FooterSetting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
