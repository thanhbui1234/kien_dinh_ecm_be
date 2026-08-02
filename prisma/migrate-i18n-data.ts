import { PrismaClient, Language } from '@prisma/client';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔄 Bắt đầu tiến trình chuyển đổi dữ liệu tiếng Việt hiện có sang bản dịch i18n (VI)...');

  // 1. Chuyển đổi Category -> CategoryTranslation (VI)
  const categories = await prisma.category.findMany();
  console.log(`📌 Tìm thấy ${categories.length} Danh mục cần chuyển đổi...`);
  for (const cat of categories) {
    await prisma.categoryTranslation.upsert({
      where: {
        categoryId_lang: { categoryId: cat.id, lang: Language.VI },
      },
      update: {
        name: cat.name,
        slug: cat.slug,
      },
      create: {
        categoryId: cat.id,
        lang: Language.VI,
        name: cat.name,
        slug: cat.slug,
      },
    });
  }
  console.log('✅ Hoàn tất chuyển đổi dữ liệu Danh mục!');

  // 2. Chuyển đổi Product + ProductDetail -> ProductTranslation (VI)
  const products = await prisma.product.findMany({
    include: { detail: true },
  });
  console.log(`📌 Tìm thấy ${products.length} Sản phẩm cần chuyển đổi...`);
  for (const prod of products) {
    await prisma.productTranslation.upsert({
      where: {
        productId_lang: { productId: prod.id, lang: Language.VI },
      },
      update: {
        name: prod.name,
        slug: prod.slug,
        contentDetail: prod.detail?.contentDetail || '',
        specifications: prod.detail?.specifications || {},
        features: prod.detail?.features || {},
        seoTitle: prod.name,
        seoDescription: prod.name,
      },
      create: {
        productId: prod.id,
        lang: Language.VI,
        name: prod.name,
        slug: prod.slug,
        contentDetail: prod.detail?.contentDetail || '',
        specifications: prod.detail?.specifications || {},
        features: prod.detail?.features || {},
        seoTitle: prod.name,
        seoDescription: prod.name,
      },
    });
  }
  console.log('✅ Hoàn tất chuyển đổi dữ liệu Sản phẩm!');

  // 3. Chuyển đổi Project + ProjectDetail -> ProjectTranslation (VI)
  const projects = await prisma.project.findMany({
    include: { detail: true },
  });
  console.log(`📌 Tìm thấy ${projects.length} Dự án cần chuyển đổi...`);
  for (const proj of projects) {
    await prisma.projectTranslation.upsert({
      where: {
        projectId_lang: { projectId: proj.id, lang: Language.VI },
      },
      update: {
        name: proj.name,
        slug: proj.slug,
        description: proj.description,
        contentDetail: proj.detail?.contentDetail || '',
      },
      create: {
        projectId: proj.id,
        lang: Language.VI,
        name: proj.name,
        slug: proj.slug,
        description: proj.description,
        contentDetail: proj.detail?.contentDetail || '',
      },
    });
  }
  console.log('✅ Hoàn tất chuyển đổi dữ liệu Dự án!');

  // 4. Chuyển đổi JobPost + JobPostDetail -> JobPostTranslation (VI)
  const jobs = await prisma.jobPost.findMany({
    include: { detail: true },
  });
  console.log(`📌 Tìm thấy ${jobs.length} Bài viết tuyển dụng cần chuyển đổi...`);
  for (const job of jobs) {
    await prisma.jobPostTranslation.upsert({
      where: {
        jobId_lang: { jobId: job.id, lang: Language.VI },
      },
      update: {
        title: job.title,
        slug: job.slug,
        salary: job.salary,
        sections: job.detail?.sections || [],
      },
      create: {
        jobId: job.id,
        lang: Language.VI,
        title: job.title,
        slug: job.slug,
        salary: job.salary,
        sections: job.detail?.sections || [],
      },
    });
  }
  console.log('✅ Hoàn tất chuyển đổi dữ liệu Bài viết tuyển dụng!');
  console.log('🎉 TOÀN BỘ DỮ LIỆU HIỆN CÓ ĐÃ ĐƯỢC CHUYỂN ĐỔI SANG BẢN DỊCH TIẾNG VIỆT AN TOÀN 100%!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi chuyển đổi dữ liệu i18n:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
