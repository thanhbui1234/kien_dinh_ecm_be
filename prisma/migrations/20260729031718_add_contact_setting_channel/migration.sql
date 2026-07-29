-- CreateTable
CREATE TABLE "ContactSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "title" TEXT NOT NULL DEFAULT 'Liên hệ với chúng tôi',
    "description" TEXT NOT NULL DEFAULT 'Chúng tôi luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn về sản phẩm và dịch vụ. Hãy để lại thông tin, đội ngũ tư vấn sẽ liên hệ với bạn trong thời gian sớm nhất.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactChannel" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'HOTLINE',
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "subValue" TEXT,
    "linkUrl" TEXT,
    "icon" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "status" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactChannel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContactChannel_status_orderIndex_idx" ON "ContactChannel"("status", "orderIndex");
