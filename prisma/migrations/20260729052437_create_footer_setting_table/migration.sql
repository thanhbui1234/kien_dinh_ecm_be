-- CreateTable
CREATE TABLE "FooterSetting" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "introText" TEXT NOT NULL DEFAULT 'Công ty Cổ Phần Thanh Bằng tự hào là một trong những công ty uy tín nhất hiện nay và sẵn sàng cam kết với khách hàng về các vấn đề chất lượng, nguồn gốc xuất xứ của sản phẩm cũng như các dịch vụ đi kèm khác.',
    "facebookUrl" TEXT DEFAULT 'https://www.facebook.com/ThanhBangNamDinh',
    "youtubeUrl" TEXT DEFAULT 'https://www.youtube.com/@congtythanhbang1735',
    "instagramUrl" TEXT,
    "phone" TEXT DEFAULT '0943676869',
    "email" TEXT DEFAULT 'maygachbetongtb@gmail.com',
    "address" TEXT DEFAULT 'Công Ty Cổ Phần Thanh Bằng, Xuân Trường, Ninh Bình 420000, Việt Nam',
    "salesPhone" TEXT DEFAULT '0943.67.68.69',
    "feedbackPhone" TEXT DEFAULT '0914 161 122',
    "warrantyPhone" TEXT DEFAULT '0912 01 77 55',
    "customerSupportTitle" TEXT DEFAULT 'HỖ TRỢ KHÁCH HÀNG',
    "customerSupportLinks" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FooterSetting_pkey" PRIMARY KEY ("id")
);
