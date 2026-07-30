import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import 'dotenv/config';

// 1. CẤU HÌNH TÀI KHOẢN CLOUDINARY MỚI (CỦA KHÁCH HÀNG)
cloudinary.config({
  cloud_name: process.env.NEW_CLOUDINARY_CLOUD_NAME || 'NHAP_CLOUD_NAME_MOI',
  api_key: process.env.NEW_CLOUDINARY_API_KEY || 'NHAP_API_KEY_MOI',
  api_secret: process.env.NEW_CLOUDINARY_API_SECRET || 'NHAP_API_SECRET_MOI',
});

// Sử dụng PrismaNeon Adapter cho bản Prisma 7 (Giống như trong prisma.service.ts của bạn)
neonConfig.webSocketConstructor = ws;
const connectionString = process.env.DATABASE_URL as string;
// @ts-ignore
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function cloneImageToNewCloud(oldUrl: string): Promise<string | null> {
  if (!oldUrl || !oldUrl.includes('res.cloudinary.com')) return oldUrl;
  try {
    console.log(`⏳ Đang chuyển: ${oldUrl}`);
    const result = await cloudinary.uploader.upload(oldUrl, {
      folder: 'kien_dinh_prod',
    });
    console.log(`✅ Xong -> URL mới: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`❌ Lỗi khi chuyển ảnh ${oldUrl}:`, error);
    return null;
  }
}

async function main() {
  console.log('🚀 BẮT ĐẦU CHUYỂN NHÀ TOÀN BỘ ẢNH TRÊN TẤT CẢ CÁC BẢNG...\n');

  // 1. BẢNG CATEGORY (imageUrl)
  console.log('\n--- 1. Quét bảng Category ---');
  const categories = await prisma.category.findMany({ where: { imageUrl: { not: null } } });
  for (const item of categories) {
    if (item.imageUrl) {
      const newUrl = await cloneImageToNewCloud(item.imageUrl);
      if (newUrl && newUrl !== item.imageUrl) await prisma.category.update({ where: { id: item.id }, data: { imageUrl: newUrl } });
    }
  }

  // 2. BẢNG PRODUCT (thumbnailUrl)
  console.log('\n--- 2. Quét bảng Product ---');
  const products = await prisma.product.findMany({ where: { thumbnailUrl: { not: '' } } });
  for (const item of products) {
    if (item.thumbnailUrl) {
      const newUrl = await cloneImageToNewCloud(item.thumbnailUrl);
      if (newUrl && newUrl !== item.thumbnailUrl) await prisma.product.update({ where: { id: item.id }, data: { thumbnailUrl: newUrl } });
    }
  }

  // 3. BẢNG PRODUCT IMAGE (imageUrl)
  console.log('\n--- 3. Quét bảng ProductImage ---');
  const productImages = await prisma.productImage.findMany({ where: { imageUrl: { not: '' } } });
  for (const item of productImages) {
    if (item.imageUrl) {
      const newUrl = await cloneImageToNewCloud(item.imageUrl);
      if (newUrl && newUrl !== item.imageUrl) await prisma.productImage.update({ where: { id: item.id }, data: { imageUrl: newUrl } });
    }
  }

  // 4. BẢNG PROJECT (coverImage)
  console.log('\n--- 4. Quét bảng Project ---');
  const projects = await prisma.project.findMany({ where: { coverImage: { not: '' } } });
  for (const item of projects) {
    if (item.coverImage) {
      const newUrl = await cloneImageToNewCloud(item.coverImage);
      if (newUrl && newUrl !== item.coverImage) await prisma.project.update({ where: { id: item.id }, data: { coverImage: newUrl } });
    }
  }

  // 5. BẢNG PROJECT DETAIL (images - Kiểu Mảng/Array)
  console.log('\n--- 5. Quét bảng ProjectDetail ---');
  const projectDetails = await prisma.projectDetail.findMany(); // Postgres Array support in Prisma might vary, we scan all
  for (const item of projectDetails) {
    if (item.images && item.images.length > 0) {
      const newImages: string[] = [];
      let updated = false;
      for (const imgUrl of item.images) {
        const newUrl = await cloneImageToNewCloud(imgUrl);
        if (newUrl && newUrl !== imgUrl) {
          newImages.push(newUrl);
          updated = true;
        } else {
          newImages.push(imgUrl);
        }
      }
      if (updated) await prisma.projectDetail.update({ where: { projectId: item.projectId }, data: { images: newImages } });
    }
  }

  // 6. BẢNG COMPANY INFO (imageUrl)
  console.log('\n--- 6. Quét bảng CompanyInfo ---');
  const companyInfos = await prisma.companyInfo.findMany({ where: { imageUrl: { not: null } } });
  for (const item of companyInfos) {
    if (item.imageUrl) {
      const newUrl = await cloneImageToNewCloud(item.imageUrl);
      if (newUrl && newUrl !== item.imageUrl) await prisma.companyInfo.update({ where: { id: item.id }, data: { imageUrl: newUrl } });
    }
  }

  // 7. BẢNG FACILITY (imageUrl)
  console.log('\n--- 7. Quét bảng Facility ---');
  const facilities = await prisma.facility.findMany({ where: { imageUrl: { not: null } } });
  for (const item of facilities) {
    if (item.imageUrl) {
      const newUrl = await cloneImageToNewCloud(item.imageUrl);
      if (newUrl && newUrl !== item.imageUrl) await prisma.facility.update({ where: { id: item.id }, data: { imageUrl: newUrl } });
    }
  }

  // 8. BẢNG BANNER (imageUrl)
  console.log('\n--- 8. Quét bảng Banner ---');
  const banners = await prisma.banner.findMany({ where: { imageUrl: { not: '' } } });
  for (const item of banners) {
    if (item.imageUrl) {
      const newUrl = await cloneImageToNewCloud(item.imageUrl);
      if (newUrl && newUrl !== item.imageUrl) await prisma.banner.update({ where: { id: item.id }, data: { imageUrl: newUrl } });
    }
  }

  // 9. BẢNG COMPANY PROFILE (thumbnailUrl)
  console.log('\n--- 9. Quét bảng CompanyProfile ---');
  const companyProfiles = await prisma.companyProfile.findMany({ where: { thumbnailUrl: { not: null } } });
  for (const item of companyProfiles) {
    if (item.thumbnailUrl) {
      const newUrl = await cloneImageToNewCloud(item.thumbnailUrl);
      if (newUrl && newUrl !== item.thumbnailUrl) await prisma.companyProfile.update({ where: { id: item.id }, data: { thumbnailUrl: newUrl } });
    }
  }

  // 10. BẢNG COMPANY HISTORY EVENT (imageUrl)
  console.log('\n--- 10. Quét bảng CompanyHistoryEvent ---');
  const historyEvents = await prisma.companyHistoryEvent.findMany({ where: { imageUrl: { not: null } } });
  for (const item of historyEvents) {
    if (item.imageUrl) {
      const newUrl = await cloneImageToNewCloud(item.imageUrl);
      if (newUrl && newUrl !== item.imageUrl) await prisma.companyHistoryEvent.update({ where: { id: item.id }, data: { imageUrl: newUrl } });
    }
  }

  console.log('\n🎉 ĐÃ CHUYỂN TOÀN BỘ ẢNH TRÊN TẤT CẢ CÁC BẢNG HOÀN TẤT!');
}

main()
  .catch((e) => {
    console.error('Lỗi nghiêm trọng:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
