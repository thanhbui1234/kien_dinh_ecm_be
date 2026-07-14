import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import 'dotenv/config';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Đang kích hoạt tiến trình rải dữ liệu mồi...');

  // 1. Mã hóa mật khẩu bảo mật cho Admin bằng Bcrypt
  const hashedPassword = await bcrypt.hash('SuperSecurePassword2026', 10);

  // 2. Tạo tài khoản Admin mặc định (Dùng upsert để tránh bị trùng nếu chạy lại nhiều lần)
  const defaultAdmin = await prisma.user.upsert({
    where: { email: 'admin@mazak.com.vn' },
    update: {},
    create: {
      email: 'admin@mazak.com.vn',
      password: hashedPassword,
      fullName: 'Hệ Thống Admin Cốt Lõi',
      role: 'SUPER_ADMIN', // Quyền tối cao
    },
  });

  // 3. Tạo sẵn cấu hình hotline hệ thống mặc định
  await prisma.systemSetting.upsert({
    where: { key: 'ZALO_HOTLINE' },
    update: {},
    create: {
      key: 'ZALO_HOTLINE',
      value: '0901.234.567',
    },
  });

  // 3. Tạo Category mồi
  const cat1 = await prisma.category.upsert({
    where: { slug: 'may-phay-cnc' },
    update: {},
    create: {
      name: 'Máy Phay CNC',
      slug: 'may-phay-cnc',
      orderIndex: 1,
    },
  });

  const cat2 = await prisma.category.upsert({
    where: { slug: 'may-tien-cnc' },
    update: {},
    create: {
      name: 'Máy Tiện CNC',
      slug: 'may-tien-cnc',
      orderIndex: 2,
    },
  });

  // 4. Tạo Product mồi
  const prod1 = await prisma.product.upsert({
    where: { slug: 'mazak-integrex-i-200' },
    update: {},
    create: {
      name: 'Mazak INTEGREX i-200',
      slug: 'mazak-integrex-i-200',
      categoryId: cat1.id,
      thumbnailUrl: 'https://placehold.co/300',
      isFeatured: true,
      price: 1500000000,
      detail: {
        create: {
          contentDetail: '<p>Máy đa nhiệm cao cấp từ Mazak với khả năng gia công 5 trục đồng thời.</p>',
          specifications: { axes: 5, chuckSize: 8, maxSpeed: 5000 },
        },
      },
    },
  });

  // 5. Tạo Project mồi
  await prisma.project.upsert({
    where: { slug: 'du-an-nha-may-vinfast' },
    update: {},
    create: {
      name: 'Dự án Cung cấp CNC Nhà Máy Vinfast',
      slug: 'du-an-nha-may-vinfast',
      description: 'Cung cấp hệ thống 10 máy tiện CNC cao cấp cho dây chuyền sản xuất xe điện.',
      coverImage: 'https://placehold.co/800x400',
      detail: {
        create: {
          contentDetail: '<p>Chi tiết quá trình bàn giao và lắp đặt máy Mazak tại nhà máy Hải Phòng...</p>',
        },
      },
      products: {
        create: [
          { productId: prod1.id }
        ],
      },
      categories: {
        create: [
          { categoryId: cat1.id }
        ],
      },
    },
  });

  // 6. Tạo JobPost mồi (Dữ liệu JD bạn vừa cung cấp)
  await prisma.jobPost.upsert({
    where: { slug: 'sales-engineer' },
    update: {},
    create: {
      title: 'SALES ENGINEER',
      slug: 'sales-engineer',
      salary: 'Cạnh tranh',
      detail: {
        create: {
          sections: [
            {
              title: 'Job Description',
              contents: [
                'Develop sales plans; prospect, secure and expedite orders with existing and new accounts; conclude business contracts; maintain business growth.',
                'Conduct studies/analysis on market trend, competitors, products’ applications and technology, service needs.',
                'Participate at internal and external events such as fairs and exhibitions, customer events, workshops, etc.',
                'Assist the General Director to carries on activities of market survey, promotes and constructs cooperative and invested projects of Yamazaki Mazak in Vietnam.',
              ],
            },
            {
              title: 'Requirement',
              contents: [
                '01- 02 year experience in technical sales & service environment for CNC machines.',
                'Degree in Engineering or related discipline is required.',
                'Fluent in English.',
                'Strong communication skills with the ability to step beyond cultural and technical borders; good customer mindset; ability to work under pressure.',
                'Willing to travel for business.',
                'Product experience in CNC lathe or tooling added advantages.',
              ],
            },
          ],
        },
      },
    },
  });

  console.log('✅ Bơm tài khoản Admin và Dữ liệu mẫu lên DB thành công!');
  console.log(`➡️ Email: ${defaultAdmin.email}`);
  console.log('➡️ Password: SuperSecurePassword2026');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi tiến trình Seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    // Ngắt kết nối an toàn sau khi chạy xong
    await prisma.$disconnect();
  });